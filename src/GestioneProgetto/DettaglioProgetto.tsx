import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supporto/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faTasks,
    faCalendarDay,
    faFlag,
    faUserCheck,
    faClock,
    faStickyNote,
    faPen,
} from '@fortawesome/free-solid-svg-icons';
import MiniProjectEditorModal from '../Modifica/MiniProjectEditorModal';

type ProgettoDettaglio = {
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    clienti?: { nome: string } | null;
    stati?: { nome: string } | null;
    priorita?: { nome: string } | null;
};

type UtenteTask = { utente?: { id: string; nome: string } | null };

export type Task = {
    stato_id: number;
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    stati?: { nome: string } | null;
    priorita?: { nome: string } | null;
    utenti_task: UtenteTask[];
};

export default function DettaglioProgetto() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [progetto, setProgetto] = useState<ProgettoDettaglio | null>(null);
    const [taskList, setTaskList] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [modaleAperta, setModaleAperta] = useState(false);

    useEffect(() => {
        const fetchProgetto = async () => {
            if (!id) return;
            const { data, error } = await supabase
                .from('progetti')
                .select(`nome, note, consegna, tempo_stimato, clienti(nome), stati(nome), priorita(nome)`)
                .eq('id', id)
                .single<ProgettoDettaglio>();

            if (!error && data) setProgetto(data);
            setLoading(false);
        };
        fetchProgetto();
    }, [id]);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!id) return;

            const { data: taskRows } = await supabase
                .from('progetti_task')
                .select(`tasks (id, stato_id, nome, note, consegna, tempo_stimato, stati (nome), priorita (nome))`)
                .eq('progetti_id', id);

            const tasks: Task[] = (taskRows || []).map((r: any) => r.tasks);
            const taskIds = tasks.map(t => t.id);

            const { data: assegnazioniRaw } = await supabase
                .from('utenti_task')
                .select('task_id, utente_id')
                .in('task_id', taskIds);

            const userIds = [...new Set(assegnazioniRaw?.map(r => r.utente_id) || [])];
            const { data: utentiData } = await supabase
                .from('utenti')
                .select('id, nome')
                .in('id', userIds);

            const utentiMap = Object.fromEntries((utentiData || []).map(u => [u.id, u]));

            const taskListFinale: Task[] = tasks.map(task => {
                const assegnazioni = (assegnazioniRaw || []).filter(ut => ut.task_id === task.id);
                return {
                    ...task,
                    utenti_task: assegnazioni.map(ut => ({
                        utente: utentiMap[ut.utente_id] || null
                    }))
                };
            });

            setTaskList(taskListFinale);
        };

        fetchTasks();
    }, [id]);

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession();
            setUtenteLoggatoId(session?.session?.user.id || null);
        };
        fetchUtente();
    }, []);

    if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
    if (!progetto) return <div className="p-6 text-theme">Progetto non trovato</div>;

    return (
        <div className="min-h-screen bg-theme text-theme">
            <div className="bg-theme px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/progetti')}
                    className="text-sm flex items-center gap-2 text-theme hover:text-blue-500"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="icon-color" />
                    <span>Torna indietro</span>
                </button>

                <div className="flex gap-6 text-sm items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">👤 Mie</span>
                        <div onClick={() => setSoloMieTask(v => !v)} className={`toggle-theme ${soloMieTask ? 'active' : ''}`}>
                            <div className={`toggle-thumb ${soloMieTask ? 'translate' : ''} ${document.documentElement.classList.contains('dark') ? 'dark' : ''}`} />
                        </div>
                    </div>
                    <NavLink to={`/progetti/${id}`} end className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>
                        Dashboard
                    </NavLink>
                    <NavLink to={`/progetti/${id}/calendario`} className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>
                        Calendario
                    </NavLink>
                </div>
            </div>

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4 text-theme flex items-center gap-2">
                    📁 {progetto.nome}
                    <button
                        type="button"
                        onClick={() => setModaleAperta(true)}
                        className="text-yellow-500 hover:text-yellow-600 transition"
                        aria-label="Modifica progetto"
                    >
                        <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                    </button>
                </h1>

                <div className="space-y-1 mb-4 text-sm text-theme">
                    {progetto.clienti?.nome && <p><span className="font-semibold">Cliente:</span> {progetto.clienti.nome}</p>}
                    {progetto.consegna && <p><span className="font-semibold">Consegna:</span> {new Date(progetto.consegna).toLocaleDateString()}</p>}
                    {progetto.stati?.nome && <p><span className="font-semibold">Stato:</span> {progetto.stati.nome}</p>}
                    {progetto.priorita?.nome && <p><span className="font-semibold">Priorità:</span> {progetto.priorita.nome}</p>}
                    {progetto.tempo_stimato && <p><span className="font-semibold">Tempo stimato:</span> {progetto.tempo_stimato}</p>}
                </div>

                {progetto.note && (
                    <p className="italic text-[15px] text-theme leading-snug">
                        {progetto.note}
                    </p>
                )}

                <div className="mt-10 max-w-3xl mx-auto">
                    <h2 className="text-xl font-semibold mb-4 text-center text-theme">
                        {taskList.length > 0 ? 'Task del progetto' : 'Nessuna Task Assegnata'}
                    </h2>

                    <div className="card-theme overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 text-xs text-theme uppercase font-semibold">
                            <div className="flex-1">Nome</div>
                            <div className="w-32 text-right">Consegna</div>
                            <div className="w-24 text-right">Stato</div>
                            <div className="w-6" />
                        </div>
                        {taskList
                            .filter(task => !soloMieTask || task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId))
                            .map(task => <TaskRow key={task.id} task={task} />)}
                    </div>
                </div>
            </div>

            {modaleAperta && id && (
                <MiniProjectEditorModal
                    progettoId={id}
                    onClose={() => setModaleAperta(false)}
                />
            )}
        </div>
    );
}

function TaskRow({ task }: { task: Task }) {
    const [aperta, setAperta] = useState(false);

    return (
        <div className="border-t border-gray-200 dark:border-gray-700">
            <div
                className="flex items-center justify-between px-4 py-3 hover-bg-theme transition-colors cursor-pointer"
                onClick={() => setAperta(prev => !prev)}
            >
                <div className="flex-1 text-sm font-medium text-theme flex items-center gap-2">
                    <FontAwesomeIcon icon={faTasks} className="icon-color w-4 h-4" />
                    {task.nome}
                </div>
                <div className="w-32 text-sm text-theme flex items-center gap-1 justify-end">
                    <FontAwesomeIcon icon={faCalendarDay} className="icon-color w-4 h-4" />
                    {task.consegna ? new Date(task.consegna).toLocaleDateString() : '—'}
                </div>
                <div className="w-24 text-sm text-theme flex items-center gap-1 justify-end">
                    <FontAwesomeIcon icon={faFlag} className="icon-color w-4 h-4" />
                    {task.stati?.nome || '—'}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); setAperta(p => !p); }}
                    className="text-blue-600 text-sm w-6 h-6 flex items-center justify-center rounded hover-bg-theme"
                    aria-label={aperta ? 'Chiudi dettagli' : 'Apri dettagli'}
                >
                    {aperta ? '−' : '+'}
                </button>
            </div>

            {aperta && (
                <div className="px-4 py-3 text-sm space-y-2 bg-theme border-t border-gray-200 dark:border-gray-700 animate-scale-fade text-theme">
                    {task.utenti_task.length > 0 && (
                        <p className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faUserCheck} className="icon-color w-4 h-4" />
                            <span><strong>Assegnato a:</strong> {task.utenti_task.map(ut => ut.utente?.nome).filter(Boolean).join(', ')}</span>
                        </p>
                    )}
                    {task.tempo_stimato && (
                        <p className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faClock} className="icon-color w-4 h-4" />
                            <span><strong>Tempo stimato:</strong> {task.tempo_stimato}</span>
                        </p>
                    )}
                    {task.note && (
                        <p className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faStickyNote} className="icon-color w-4 h-4 mt-1" />
                            <span><strong>Note:</strong> {task.note}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
