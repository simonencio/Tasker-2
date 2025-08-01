import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supporto/supabaseClient';
import {
    format, startOfWeek, addDays, isSameDay,
    startOfMonth, endOfMonth, eachDayOfInterval, addMonths
} from 'date-fns';
import { it } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faCalendarDay, faTasks,
    faUserCheck, faClock, faFlag
} from '@fortawesome/free-solid-svg-icons';
import type { Task } from './DettaglioProgetto';

type VistaCalendario = 'settimana' | 'mese';

export default function CalendarioProgetto() {
    const { id } = useParams<{ id: string }>();
    const [taskList, setTaskList] = useState<Task[]>([]);
    const [settimanaBase, setSettimanaBase] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [vista, setVista] = useState<VistaCalendario>('settimana');
    const [meseCorrente, setMeseCorrente] = useState<Date>(new Date());
    const [expandedGiorno, setExpandedGiorno] = useState<Date | null>(null);
    const [giornoSelezionato, setGiornoSelezionato] = useState<Date | null>(null);

    const giorniSettimana = Array.from({ length: 7 }, (_, i) => addDays(settimanaBase, i));
    const giorniMese = vista === 'mese'
        ? eachDayOfInterval({
            start: startOfWeek(startOfMonth(meseCorrente), { weekStartsOn: 1 }),
            end: addDays(endOfMonth(meseCorrente), 6)
        })
        : [];

    const navigate = useNavigate();

    useEffect(() => {
        const fetchTask = async () => {
            const { data, error } = await supabase
                .from('progetti_task')
                .select(`
          task:tasks (
            id, stato_id, nome, consegna, tempo_stimato, note,
            stati(nome), priorita(nome),
            utenti_task:utenti_task (
              utente:utenti (id, nome)
            )
          )
        `)
                .eq('progetti_id', id);

            if (!error && data) {
                const tasksPulite = (data as unknown as { task: Task }[])
                    .filter(row => row.task)
                    .map(row => row.task);
                setTaskList(tasksPulite);
            }
        };

        if (id) fetchTask();
    }, [id]);

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession();
            setUtenteLoggatoId(session?.session?.user.id || null);
        };
        fetchUtente();
    }, []);

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
                    <NavLink to={`/progetti/${id}`} end className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>Dashboard</NavLink>
                    <NavLink to={`/progetti/${id}/calendario`} className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>Calendario</NavLink>
                </div>
            </div>

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4 text-theme">📅 Calendario</h1>

                <div className="flex justify-end mb-6">
                    <select
                        value={vista}
                        onChange={(e) => setVista(e.target.value as VistaCalendario)}
                        className="text-sm px-3 py-1 rounded input-style border"
                    >
                        <option value="settimana">Vista Settimana</option>
                        <option value="mese">Vista Mese</option>
                    </select>
                </div>

                {vista === 'settimana' && (
                    <>
                        <div className="flex justify-center gap-4 mb-6">
                            <button onClick={() => setSettimanaBase(prev => addDays(prev, -7))} className="text-sm hover-bg-theme px-3 py-1 rounded">← Settimana precedente</button>
                            <button onClick={() => setSettimanaBase(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-sm font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 px-3 py-1 rounded">Oggi</button>
                            <button onClick={() => setSettimanaBase(prev => addDays(prev, 7))} className="text-sm hover-bg-theme px-3 py-1 rounded">Settimana successiva →</button>
                        </div>

                        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
                            {giorniSettimana.map(giorno => {
                                const tasksDelGiorno = taskList.filter(task => {
                                    const assegnataAme = task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId);
                                    return task.consegna && isSameDay(new Date(task.consegna), giorno) && (!soloMieTask || assegnataAme);
                                });

                                const isExpanded = expandedGiorno && isSameDay(expandedGiorno, giorno);
                                const mostraPlaceholder = tasksDelGiorno.length > 2;

                                return (
                                    <div key={giorno.toISOString()} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md bg-white dark:bg-[#2c3542]">
                                        <div onClick={() => setExpandedGiorno(prev => (prev && isSameDay(prev, giorno) ? null : giorno))} className={`w-full flex items-center justify-between gap-2 cursor-pointer px-4 py-4 ${mostraPlaceholder && !isExpanded ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 'bg-gray-100 dark:bg-[#1f2937] text-gray-800 dark:text-gray-100'}`}>
                                            <div className="text-base font-semibold whitespace-nowrap text-gray-800 dark:text-gray-100">
                                                {format(giorno, 'EEEE dd/MM', { locale: it }).replace(/^./, c => c.toUpperCase())}
                                            </div>
                                            {mostraPlaceholder && !isExpanded ? (
                                                <div className="flex-1 text-center text-sm px-3 py-[6px] rounded flex items-center justify-center gap-2">
                                                    <FontAwesomeIcon icon={faTasks} className="icon-color min-w-[14px]" />
                                                    <span className="truncate">Ci sono task in scadenza oggi</span>
                                                </div>
                                            ) : (
                                                <div className="flex-1" />
                                            )}
                                            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {tasksDelGiorno.length} task
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="px-6 py-5">
                                                {tasksDelGiorno.length === 0 && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 italic">Nessuna task assegnata</div>
                                                )}
                                                <div className="flex flex-col gap-3">
                                                    {tasksDelGiorno.map(task => (
                                                        <div key={task.id} className="text-base bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-md shadow-sm flex items-center gap-3">
                                                            <FontAwesomeIcon icon={faTasks} className="icon-color min-w-[16px]" />
                                                            <span className="truncate">{task.nome}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {vista === 'mese' && (
                    <>
                        <div className="flex justify-center gap-4 mb-6">
                            <button onClick={() => setMeseCorrente(prev => addMonths(prev, -1))} className="text-sm hover-bg-theme px-3 py-1 rounded">← Mese precedente</button>
                            <div className="px-3 py-1 text-sm font-semibold text-theme">
                                {format(meseCorrente, 'MMMM yyyy', { locale: it }).replace(/^./, c => c.toUpperCase())}
                            </div>
                            <button onClick={() => setMeseCorrente(new Date())} className="text-sm font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 px-3 py-1 rounded">Oggi</button>
                            <button onClick={() => setMeseCorrente(prev => addMonths(prev, 1))} className="text-sm hover-bg-theme px-3 py-1 rounded">Mese successivo →</button>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {giorniMese.map(giorno => {
                                const tasksDelGiorno = taskList.filter(task => {
                                    const assegnataAme = task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId);
                                    return task.consegna && isSameDay(new Date(task.consegna), giorno) && (!soloMieTask || assegnataAme);
                                });
                                const haTask = tasksDelGiorno.length > 0;

                                return (
                                    <div
                                        key={giorno.toISOString()}
                                        className={`h-36 p-2 cursor-pointer rounded transition-colors flex flex-col justify-start ${haTask
                                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 shadow-md'
                                            : 'card-theme'
                                            }`}
                                        onClick={() => haTask && setGiornoSelezionato(giorno)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="text-xs font-semibold text-right">
                                                {format(giorno, 'd', { locale: it })}
                                            </div>
                                        </div>

                                        {haTask && (
                                            <div className="mt-4 flex-grow flex items-center justify-center">
                                                <div className="text-sm font-medium text-center leading-tight">
                                                    📌 Ci sono task<br />in scadenza oggi
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {giornoSelezionato && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="modal-container w-[calc(100%-32px)] max-w-md bg-white dark:bg-[#2c3542] text-theme rounded-2xl shadow-2xl p-6 relative">
                            <button
                                onClick={() => setGiornoSelezionato(null)}
                                className="absolute top-3 right-4 text-xl text-gray-500 dark:text-gray-300 hover:text-red-500"
                                aria-label="Chiudi"
                            >
                                ×
                            </button>
                            <h2 className="text-lg font-semibold mb-4 text-center">
                                Task in scadenza il {format(giornoSelezionato, 'EEEE dd MMMM yyyy', { locale: it }).replace(/^./, c => c.toUpperCase())}
                            </h2>
                            <div className="flex flex-col gap-3 max-h-[60vh] overflow-auto">
                                {taskList
                                    .filter(task =>
                                        task.consegna &&
                                        isSameDay(new Date(task.consegna), giornoSelezionato) &&
                                        (!soloMieTask || task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId))
                                    )
                                    .map(task => (
                                        <div
                                            key={task.id}
                                            className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2 rounded shadow flex items-center gap-3 text-sm"
                                        >
                                            <FontAwesomeIcon icon={faTasks} className="icon-color" />
                                            <span className="truncate">{task.nome}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="hidden">
                    <FontAwesomeIcon icon={faCalendarDay} />
                    <FontAwesomeIcon icon={faUserCheck} />
                    <FontAwesomeIcon icon={faClock} />
                    <FontAwesomeIcon icon={faFlag} />
                </div>
            </div>
        </div>
    );
}
