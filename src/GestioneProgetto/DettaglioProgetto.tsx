import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supporto/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserCheck,
    faPen,
    faUsers,
    faCheckCircle,
    faStop,
    faPlay
} from '@fortawesome/free-solid-svg-icons';
import MiniProjectEditorModal from '../Modifica/MiniProjectEditorModal';
import IntestazioneProgetto from './IntestazioneProgetto';
import { isUtenteAdmin } from '../supporto/ruolo';
import ToggleMie from './ToggleMie';
import MiniTaskEditorModal from '../Modifica/MiniTaskEditorModal';
import { Toast } from 'toaster-js';
import RenderSottoTask from '../supporto/SottoTask';
import RenderCommento from '../supporto/RenderCommento';
import type {
    Task,
    Utente,
    Progetto,
    Commento
} from "../supporto/tipi";


function formatIntervalToHM(interval: string | null | undefined): string {
    if (!interval) return "—";
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (!match) return interval;
    const ore = parseInt(match[1], 10);
    const minuti = parseInt(match[2], 10);
    return `${ore > 0 ? `${ore}h ` : ''}${minuti}m`;
}

export default function DettaglioProgetto() {
    const { id } = useParams<{ id: string }>();
    const [progetto, setProgetto] = useState<Progetto | null>(null);

    const [taskList, setTaskList] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [modaleAperta, setModaleAperta] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [taskAperta, setTaskAperta] = useState<Record<string, boolean>>({});
    const [taskDaModificare, setTaskDaModificare] = useState<string | null>(null);
    const [membri, setMembri] = useState<Utente[]>([]);
    const [durateUtenteProgetto, setDurateUtenteProgetto] = useState<{ utente: Utente; durata: number }[]>([]);
    const [commenti, setCommenti] = useState<Commento[]>([]);
    const [commentiEspansi, setCommentiEspansi] = useState<Set<string>>(new Set());
    const toggleCommentiEspansi = (taskId: string) => {
        setCommentiEspansi(prev => {
            const nuovo = new Set(prev);
            nuovo.has(taskId) ? nuovo.delete(taskId) : nuovo.add(taskId);
            return nuovo;
        });
    };

    const [durateTaskUtente, setDurateTaskUtente] = useState<Record<string, Record<string, number>>>({});
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
    const [, setElapsed] = useState<number>(0);
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
                .select(`id, nome, note, consegna, tempo_stimato, clienti(id, nome), stati(id, nome, colore), priorita(id, nome)`)
                .eq('id', id)
                .single<Progetto>();

            if (!error && data) setProgetto(data);
            if (data) {
                setProgetto({ ...data, membri: membri }); // se vuoi già includere i membri
            }

            setLoading(false);
        };
        fetchProgetto();
    }, [id]);

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession();
            setUtenteLoggatoId(session?.session?.user.id || null);
        };
        fetchUtente();
    }, []);

    useEffect(() => {
        const fetchMembri = async () => {
            if (!id) return;
            const { data } = await supabase
                .from("utenti_progetti")
                .select("utenti:utente_id ( id, nome, cognome )")
                .eq("progetto_id", id);
            const utenti: Utente[] = (data || []).map((r: any) => r.utenti);
            setMembri(utenti);
        };
        fetchMembri();
    }, [id]);

    useEffect(() => {
        const fetchDurate = async () => {
            if (!id) return;
            const { data } = await supabase
                .from("time_entries")
                .select("utente_id, durata, utenti:utente_id ( id, nome, cognome )")
                .eq("progetto_id", id);
            const mappa: Record<string, { utente: Utente; durata: number }> = {};
            for (const row of data || []) {
                const utente = Array.isArray(row.utenti) ? row.utenti[0] : row.utenti;
                if (!utente) continue;
                if (!mappa[utente.id]) mappa[utente.id] = { utente, durata: 0 };
                mappa[utente.id].durata += row.durata || 0;
            }
            setDurateUtenteProgetto(Object.values(mappa));
        };
        fetchDurate();
    }, [id]);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!id) return;

            const { data, error } = await supabase
                .from("progetti_task")
                .select(`
                task:task_id (
                    id, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
                    stato:stato_id (id, nome, colore),
                    priorita:priorita_id (id, nome),
                    utenti_task ( utenti ( id, nome, cognome ) )
                )
            `)
                .eq("progetti_id", id);

            if (error) {
                console.error("Errore nel fetch delle task:", error);
                return;
            }

            if (data) {
                const tasksPulite: Task[] = data.map((r: any) => ({
                    id: r.task.id,
                    nome: r.task.nome,
                    note: r.task.note,
                    consegna: r.task.consegna,
                    tempo_stimato: r.task.tempo_stimato,
                    created_at: r.task.created_at,
                    modified_at: r.task.modified_at,
                    fine_task: r.task.fine_task,
                    parent_id: r.task.parent_id,
                    stato: r.task.stato,
                    priorita: r.task.priorita,
                    progetto: { id: id!, nome: progetto?.nome || "" },
                    assegnatari: r.task.utenti_task?.map((u: any) => u.utenti) ?? []
                }));

                setTaskList(tasksPulite);
            }
        };
        fetchTasks();
    }, [id, progetto?.nome]);

    // Effetti aggiuntivi
    useEffect(() => {
        const caricaCommenti = async () => {
            const { data, error } = await supabase
                .from("commenti")
                .select(`id, utente_id, task_id, parent_id, descrizione, created_at, modified_at, deleted_at, utente:utente_id (id, nome, cognome)`)
                .is("deleted_at", null);
            if (error) return console.error("Errore commenti:", error);
            const commentiPuliti: Commento[] = (data || []).map((c: any) => ({
                ...c,
                utente: Array.isArray(c.utente) ? c.utente[0] : c.utente,
            }));
            setCommenti(commentiPuliti);
        };
        caricaCommenti();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeTimer) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [activeTimer]);

    const handleStartTimer = (taskId: string) => {
        setActiveTimer({ taskId, startTime: new Date() });
    };

    const handleStopTimer = async (task: Task) => {
        if (!activeTimer || !utenteLoggatoId) return setActiveTimer(null);
        const endTime = new Date();
        const durata = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000);
        const { error } = await supabase.from("time_entries").insert({
            utente_id: utenteLoggatoId,
            progetto_id: id,
            task_id: task.id,
            nome: task.nome,
            data_inizio: activeTimer.startTime.toISOString(),
            data_fine: endTime.toISOString(),
            durata,
        });
        if (error) new Toast("Errore nel salvataggio del tempo", Toast.TYPE_ERROR, Toast.TIME_SHORT);
        else new Toast("Tempo salvato con successo", Toast.TYPE_DONE, Toast.TIME_SHORT);
        setActiveTimer(null);
    };

    const caricaDurateTaskUtente = async (task: Task) => {
        if (!task.id || !task.assegnatari.length) return;
        const tutteTaskId = [task.id, ...trovaTutteLeFiglie(task.id)];
        const { data } = await supabase.from("time_entries").select("utente_id, durata").in("task_id", tutteTaskId);
        const mappa: Record<string, number> = {};
        for (const r of data || []) {
            if (!r.utente_id || !r.durata) continue;
            mappa[r.utente_id] = (mappa[r.utente_id] || 0) + r.durata;
        }
        setDurateTaskUtente(prev => ({ ...prev, [task.id]: mappa }));
    };

    const sottoTask = (taskId: string) => taskList.filter(t => t.parent_id === taskId);
    const trovaTutteLeFiglie = (taskId: string): string[] => {
        const figliDiretti = taskList.filter(t => t.parent_id === taskId);
        const ids = figliDiretti.map(f => f.id);
        return ids.flatMap(id => [id, ...trovaTutteLeFiglie(id)]);
    };

    const [sottoTaskEspansa, setSottoTaskEspansa] = useState<Set<string>>(new Set());
    const toggleSottoTaskEspansa = (taskId: string) => {
        setSottoTaskEspansa(prev => {
            const nuovo = new Set(prev);
            nuovo.has(taskId) ? nuovo.delete(taskId) : nuovo.add(taskId);
            return nuovo;
        });
    };

    if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
    if (!progetto) return <div className="p-6 text-theme">Progetto non trovato</div>;

    return (
        <div className="min-h-screen bg-theme text-theme">
            <IntestazioneProgetto
                id={id!}
                soloMieTask={soloMieTask}
                setSoloMieTask={isAdmin ? setSoloMieTask : () => { }}
            />

            <div className="p-6 max-w-6xl mx-auto w-full">

                <h1 className="text-2xl font-bold mb-4 text-theme flex flex-row items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-row items-center gap-2">
                        📁 {progetto.nome}
                        <button
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
                    {progetto.cliente?.nome && <p><span className="font-semibold">Cliente:</span> {progetto.cliente.nome}</p>}
                    {progetto.consegna && <p><span className="font-semibold">Consegna:</span> {new Date(progetto.consegna).toLocaleDateString()}</p>}
                    {progetto.stato?.nome && <p><span className="font-semibold">Stato:</span> {progetto.stato.nome}</p>}
                    {progetto.priorita?.nome && <p><span className="font-semibold">Priorità:</span> {progetto.priorita.nome}</p>}
                    {progetto.note && <p className=''><span className="font-semibold">Note:</span> {progetto.note}</p>}
                    {progetto.tempo_stimato && (
                        <p>
                            <span className="font-semibold">Tempo stimato:</span> {formatIntervalToHM(progetto.tempo_stimato)}
                        </p>
                    )}
                    {membri.length > 0 && (
                        <div className="mt-2">
                            <p className="flex items-center gap-2 font-semibold">
                                <FontAwesomeIcon icon={faUsers} className="icon-color w-4 h-4" />
                                Membri:
                            </p>
                            <ul className="ml-6 mt-1 list-disc text-[15px] space-y-1">
                                {membri.map(m => (
                                    <li key={m.id}>{m.nome} {m.cognome || ''}</li>
                                ))}
                            </ul>
                        </div>
                    )}


                    {durateUtenteProgetto.length > 0 && (
                        <div className="mt-4 text-[15px] text-theme">
                            <p className="font-semibold mb-1">🕒 Tempo registrato:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                {durateUtenteProgetto.map(({ utente, durata }) => {
                                    const ore = Math.floor(durata / 3600);
                                    const minuti = Math.floor((durata % 3600) / 60);
                                    return (
                                        <li key={utente.id}>
                                            {utente.nome} {utente.cognome || ''}: {ore > 0 ? `${ore}h ` : ''}{minuti}m
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                </div>





                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-6xl mx-auto mt-20">

                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        <div className="w-10 shrink-0" />
                        <div className="flex-1">Nome</div>
                        <div className="w-40">Consegna</div>
                        <div className="w-32">Stato</div>
                        <div className="w-32">Priorità</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>

                    {taskList
                        .filter(t => !t.parent_id && (!soloMieTask || t.assegnatari.some(u => u.id === utenteLoggatoId)))

                        .map(task => {
                            const isAssegnata = task.assegnatari
                                .some(u => u.id === utenteLoggatoId);
                            const isCompletata = !!task.fine_task;
                            const isOpen = taskAperta[task.id];
                            const children = sottoTask(task.id);
                            return (
                                <div key={task.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                                    <div className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer"
                                        onClick={() => {
                                            setTaskAperta(p => ({ ...p, [task.id]: !p[task.id] }));
                                            if (!isOpen) caricaDurateTaskUtente(task);
                                        }}
                                    >
                                        <div className="w-8 shrink-0 flex justify-start items-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {isAssegnata && (
                                                    <FontAwesomeIcon icon={faUserCheck} className="w-4 h-4 text-blue-600" title="Assegnata a te" />
                                                )}
                                                {isCompletata && (
                                                    <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completata" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 font-medium truncate">{task.nome}</div>
                                        <div className="hidden lg:block w-40">{task.consegna ? new Date(task.consegna).toLocaleDateString() : "—"}</div>
                                        <div className="hidden lg:block w-32">{task.stato?.nome ?? "—"}</div>
                                        <div className="hidden lg:block w-32">{task.priorita?.nome ?? "—"}</div>

                                        <div className="w-20 flex justify-end items-center gap-3">
                                            {task.assegnatari.length > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (activeTimer?.taskId === task.id) handleStopTimer(task);
                                                        else handleStartTimer(task.id);
                                                    }}
                                                    className={`icon-color ${activeTimer?.taskId === task.id ? 'hover:text-red-600' : 'hover:text-green-600'}`}
                                                    title={activeTimer?.taskId === task.id ? 'Ferma timer' : 'Avvia timer'}
                                                >
                                                    <FontAwesomeIcon icon={activeTimer?.taskId === task.id ? faStop : faPlay} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTaskDaModificare(task.id);
                                                }}
                                                className="icon-color hover:text-blue-600"
                                                title="Modifica"
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTaskAperta(p => ({ ...p, [task.id]: !p[task.id] }));
                                                    if (!isOpen) caricaDurateTaskUtente(task);
                                                }}
                                                className="text-theme text-xl font-bold"
                                                title={isOpen ? "Chiudi dettagli" : "Espandi dettagli"}
                                            >
                                                {isOpen ? "−" : "+"}
                                            </button>
                                        </div>

                                    </div>

                                    {isOpen && (
                                        <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-2">
                                            <div className="block lg:hidden space-y-1">
                                                <p>📅 Consegna: {task.consegna ? new Date(task.consegna).toLocaleDateString() : "—"}</p>
                                                <p>📊 Stato: {task.stato?.nome ?? "—"}</p>
                                                <p>⏫ Priorità: {task.priorita?.nome ?? "—"}</p>
                                            </div>
                                            {task.tempo_stimato && <p>⏱️ Tempo stimato: {task.tempo_stimato}</p>}
                                            {task.assegnatari
                                                .length > 0 && (
                                                    <p>👥 Assegnata a: {task.assegnatari
                                                        .map(u => u.nome).filter(Boolean).join(", ")}</p>
                                                )}
                                            {task.note && <p>🗒️ {task.note}</p>}
                                            {durateTaskUtente[task.id] && (
                                                <div className="pt-2">
                                                    <p className="font-semibold">🕒 Tempo registrato:</p>
                                                    <ul className="list-disc list-inside text-sm space-y-1">
                                                        {task.assegnatari.map(u => {
                                                            const durata = durateTaskUtente[task.id]?.[u.id] || 0;
                                                            const ore = Math.floor(durata / 3600);
                                                            const minuti = Math.floor((durata % 3600) / 60);
                                                            return <li key={u.id}>{u.nome} {u.cognome || ""}: {ore > 0 ? `${ore}h ` : ""}{minuti}m</li>;
                                                        })}

                                                    </ul>
                                                </div>
                                            )}
                                            {children.length > 0 && (
                                                <div className="mt-4">
                                                    <div
                                                        onClick={() => toggleSottoTaskEspansa(task.id)}
                                                        className="cursor-pointer rounded-md px-0 py-2 text-sm text-theme hover-bg-theme"
                                                    >
                                                        📎 Sotto-task
                                                    </div>
                                                    {sottoTaskEspansa.has(task.id) && (
                                                        <div className="mt-2 space-y-2">
                                                            {children.map(sotto => (
                                                                <RenderSottoTask key={sotto.id} task={sotto} allTasks={taskList} livello={1} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {commenti.some(c => c.task_id === task.id && !c.parent_id) && (
                                                <div className="mt-4">
                                                    <div
                                                        onClick={() => toggleCommentiEspansi(task.id)}
                                                        className="cursor-pointer rounded-md px-0 py-2 text-sm text-theme hover-bg-theme font-semibold"
                                                    >
                                                        💬 Commenti
                                                    </div>
                                                    {commentiEspansi.has(task.id) && (
                                                        <div className="space-y-3 mt-2">
                                                            {commenti
                                                                .filter(c => c.task_id === task.id && !c.parent_id)
                                                                .map(c => (
                                                                    <RenderCommento key={c.id} commento={c} allCommenti={commenti} livello={1} />
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
