// 📁 DettaglioProgetto.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supporto/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTasks, faCalendarDay, faFlag,
    faUserCheck, faClock, faStickyNote,
    faPen, faTrash
} from '@fortawesome/free-solid-svg-icons';
import MiniProjectEditorModal from '../Modifica/MiniProjectEditorModal';
import IntestazioneProgetto from './IntestazioneProgetto';
import { isUtenteAdmin } from '../supporto/ruolo';
import ToggleMie from './ToggleMie';
import MiniTaskEditorModal from '../Modifica/MiniTaskEditorModal';

type ProgettoDettaglio = {
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    clienti?: { nome: string } | null;
    stati?: { nome: string } | null;
    priorita?: { nome: string } | null;
};

type UtenteTask = {
    utente?: { [x: string]: string; id: string; nome: string } | null;
};

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
    const [progetto, setProgetto] = useState<ProgettoDettaglio | null>(null);
    const [taskList, setTaskList] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [modaleAperta, setModaleAperta] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [taskAperta, setTaskAperta] = useState<Record<string, boolean>>({});
    const [taskDaModificare, setTaskDaModificare] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then(res => {
            if (mounted) {
                setIsAdmin(res);
                if (!res) setSoloMieTask(true);
            }
        });
        return () => { mounted = false };
    }, []);

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
            const { data, error } = await supabase
                .from('progetti_task')
                .select(`task:tasks (
          id, stato_id, nome, note, consegna, tempo_stimato,
          stati (nome),
          priorita (nome),
          utenti_task:utenti_task (
            utente:utenti (id, nome)
          )
        )`)
                .eq('progetti_id', id);
            if (!error && data) {
                const taskListFinale: Task[] = data.map((r: any) => r.task);
                setTaskList(taskListFinale);
            }
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
            <IntestazioneProgetto
                id={id!}
                soloMieTask={soloMieTask}
                setSoloMieTask={isAdmin ? setSoloMieTask : () => { }}
            />

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4 text-theme flex flex-row items-center justify-between flex-wrap gap-2">

                    <div className="flex flex-row items-center gap-2">
                        📁 {progetto.nome}
                        <button
                            type="button"
                            onClick={() => setModaleAperta(true)}
                            className="text-yellow-500 hover:text-yellow-600 transition"
                            aria-label="Modifica progetto"
                        >
                            <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                        </button>
                    </div>
                    {isAdmin && (
                        <ToggleMie soloMieTask={soloMieTask} setSoloMieTask={setSoloMieTask} />
                    )}
                </h1>



                <div className="space-y-1 mb-4 text-[15px] text-theme">
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

                    <div className="card-theme shadow-md">
                        {/* INTESTAZIONE */}
                        <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between px-4 py-3 cursor-default gap-2 border-b border-gray-200 dark:border-gray-700">
                            {/* Nome */}
                            <div className="flex-1 text-[15px] text-theme font-medium">Nome</div>

                            {/* Consegna + Stato (solo desktop) */}
                            <div className="hidden sm:flex gap-4 sm:gap-0 sm:flex-row justify-center">
                                <div className="w-40 text-[15px] text-theme flex items-center justify-center">Consegna</div>
                                <div className="w-32 text-[15px] text-theme flex items-center justify-center">Stato</div>
                            </div>

                            {/* Azioni */}
                            <div className="w-auto flex items-center justify-center gap-2 text-theme text-sm">
                                Azioni
                            </div>



                            {/* Spazio per "+" */}
                            <div className="w-6" />
                        </div>

                        {/* RIGHE TASK */}
                        {taskList
                            .filter(task => {
                                if (isAdmin) return !soloMieTask || task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId);
                                return task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId);
                            })
                            .map(task => (
                                <div key={task.id} className="border-t border-gray-100 dark:border-gray-700 hover-bg-theme transition">
                                    <div
                                        className="flex flex-nowrap sm:flex-nowrap items-center justify-between px-4 py-3 cursor-pointer gap-2 sm:gap-4"
                                        onClick={() => setTaskAperta(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                    >


                                        {/* Nome */}
                                        <div className="flex-1 text-[15px] text-theme flex items-center gap-2 font-medium">
                                            <FontAwesomeIcon icon={faTasks} className="icon-color w-4 h-4" />
                                            {task.nome}
                                        </div>

                                        {/* Consegna + Stato (solo desktop) */}
                                        <div className="hidden sm:flex gap-4 sm:gap-0 sm:flex-row justify-center">
                                            <div className="w-40 text-[15px] text-theme flex items-center gap-1 justify-center">
                                                <FontAwesomeIcon icon={faCalendarDay} className="icon-color w-4 h-4" />
                                                {task.consegna ? new Date(task.consegna).toLocaleDateString() : '—'}
                                            </div>
                                            <div className="w-32 text-[15px] text-theme flex items-center gap-1 justify-center">
                                                <FontAwesomeIcon icon={faFlag} className="icon-color w-4 h-4" />
                                                {task.stati?.nome || '—'}
                                            </div>
                                        </div>

                                        {/* Azioni */}
                                        {(isAdmin || task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId)) && (
                                            <div className="w-auto flex-shrink-0 flex items-center justify-center gap-2 text-theme text-sm" onClick={(e) => e.stopPropagation()}>

                                                <FontAwesomeIcon
                                                    icon={faPen}
                                                    className="cursor-pointer text-yellow-500 hover:text-yellow-600 w-4 h-4"
                                                    onClick={() => setTaskDaModificare(task.id)}
                                                />

                                                <FontAwesomeIcon icon={faTrash} className="cursor-pointer text-red-500 hover:text-red-600 w-4 h-4" />
                                            </div>
                                        )}



                                        {/* Toggle "+" */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTaskAperta(p => ({ ...p, [task.id]: !p[task.id] }));
                                            }}
                                            className="w-6 h-6 flex-shrink-0 text-blue-600 text-sm flex items-center justify-center rounded hover-bg-theme"
                                            aria-label={taskAperta[task.id] ? 'Chiudi dettagli' : 'Apri dettagli'}
                                        >
                                            {taskAperta[task.id] ? '−' : '+'}
                                        </button>

                                    </div>

                                    {/* DETTAGLI (solo se aperta) */}
                                    {taskAperta[task.id] && (
                                        <div className="px-4 py-3 text-sm space-y-2 bg-theme border-t border-gray-100 dark:border-gray-700 animate-scale-fade text-theme">
                                            {/* Consegna + Stato (mobile) */}
                                            <div className="flex sm:hidden flex-col gap-2">
                                                <p className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faCalendarDay} className="icon-color w-4 h-4" />
                                                    <span><strong>Consegna:</strong> {task.consegna ? new Date(task.consegna).toLocaleDateString() : '—'}</span>
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faFlag} className="icon-color w-4 h-4" />
                                                    <span><strong>Stato:</strong> {task.stati?.nome || '—'}</span>
                                                </p>
                                            </div>

                                            {/* Assegnato a */}
                                            {task.utenti_task.length > 0 && (
                                                <p className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faUserCheck} className="icon-color w-4 h-4" />
                                                    <span><strong>Assegnato a:</strong> {task.utenti_task.map(ut => ut.utente?.nome).filter(Boolean).join(', ')}</span>
                                                </p>
                                            )}

                                            {/* Tempo stimato */}
                                            {task.tempo_stimato && (
                                                <p className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faClock} className="icon-color w-4 h-4" />
                                                    <span><strong>Tempo stimato:</strong> {task.tempo_stimato}</span>
                                                </p>
                                            )}

                                            {/* Note */}
                                            {task.note && (
                                                <p className="flex items-start gap-2">
                                                    <FontAwesomeIcon icon={faStickyNote} className="icon-color w-4 h-4 mt-1" />
                                                    <span><strong>Note:</strong> {task.note}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>

                </div>
            </div>

            {modaleAperta && id && (
                <MiniProjectEditorModal
                    progettoId={id}
                    onClose={() => setModaleAperta(false)}
                />
            )}
            {taskDaModificare && (
                <MiniTaskEditorModal
                    taskId={taskDaModificare}
                    onClose={() => setTaskDaModificare(null)}
                />
            )}

        </div>
    );
}
