import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faPlay, faStop, faTasks, faUser, faCheckCircle, faLink} from "@fortawesome/free-solid-svg-icons";
import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
import FiltriTaskAvanzati, { ordinaTaskClientSide } from "../supporto/FiltriTaskAvanzati";
import type { Commento, FiltroAvanzato, Task } from "../supporto/tipi";
import { useNavigate } from "react-router-dom";

import { Toast } from "toaster-js";
import RenderSottoTask from "../supporto/SottoTask";
import RenderCommento from "../supporto/RenderCommento";

export default function ListaTask() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskAssegnate, setTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [soloCompletate, setSoloCompletate] = useState(false);
    const tasksFiltrate = tasks.filter(t => !soloCompletate || t.fine_task !== null);
    const [commenti, setCommenti] = useState<Commento[]>([]);

    const [taskDaModificareId, setTaskDaModificareId] = useState<string | null>(null);
    const [taskEspansaId, setTaskEspansaId] = useState<string | null>(null);
    const [sottoTaskEspansa, setSottoTaskEspansa] = useState<Set<string>>(new Set());

    const toggleSottoTaskEspansa = (taskId: string) => {
        setSottoTaskEspansa(prev => {
            const nuovo = new Set(prev);
            nuovo.has(taskId) ? nuovo.delete(taskId) : nuovo.add(taskId);
            return nuovo;
        });
    };


    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzato>({
        progetto: null,
        utente: null,
        stato: null,
        priorita: null,
        dataInizio: null,
        dataFine: null,
        ordine: null,
    });
    const navigate = useNavigate();

  //Timer
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);

    const [elapsed, setElapsed] = useState<number>(0);



    const handleStartTimer = (taskId: string) => {
        setActiveTimer({ taskId, startTime: new Date() });
    };

    const handleStopTimer = async (task: Task) => {
        if (!activeTimer || !utenteId) {
            setActiveTimer(null);
            return;
        }

        const taskPlayed = tasks.find(t => t.id === activeTimer.taskId);
        if (!taskPlayed || !taskPlayed.progetto?.id) {
            new Toast("Questa task non è collegata a nessun progetto", Toast.TYPE_ERROR, Toast.TIME_SHORT);
            setActiveTimer(null);
            return;
        }

        const endTime = new Date();
        const durata = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000);

        const { error } = await supabase.from("time_entries").insert({
            utente_id: utenteId,
            progetto_id: taskPlayed.progetto.id,
            task_id: taskPlayed.id,
            nome: taskPlayed.nome,
            data_inizio: activeTimer.startTime.toISOString(),
            data_fine: endTime.toISOString(),
            durata,
        });

        if (error) {
            new Toast("Errore nel salvataggio del tempo", Toast.TYPE_ERROR, Toast.TIME_SHORT);
            console.error(error);
        } else {
            new Toast("Tempo salvato con successo", Toast.TYPE_DONE, Toast.TIME_SHORT);
        }

        setActiveTimer(null);
    };




    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (activeTimer) {
            // Aggiorna ogni secondo
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTimer]);
    useEffect(() => {
        const fetchUtente = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUtenteId(user.id);
            const { data: ruoloData } = await supabase.from("utenti").select("ruolo").eq("id", user.id).single();
            if (ruoloData?.ruolo === 1) setIsAdmin(true);
        };
        fetchUtente();
    }, []);
    useEffect(() => {
        const caricaCommenti = async () => {
            const { data, error } = await supabase
                .from("commenti")
                .select(`
                id,
                utente_id,
                task_id,
                parent_id,
                descrizione,
                created_at,
                modified_at,
                deleted_at,
                utente:utente_id (
                    id,
                    nome,
                    cognome
                )
            `)
                .is("deleted_at", null);

            if (error) {
                console.error("Errore nel caricamento commenti:", error);
                return;
            }

            if (data) {
                // Fix utente[] vs utente
                const commentiPuliti: Commento[] = data.map((c: any) => ({
                    ...c,
                    utente: Array.isArray(c.utente) ? c.utente[0] : c.utente,
                }));
                setCommenti(commentiPuliti);
            }
        };

        caricaCommenti();
    }, []);

    useEffect(() => {
        const caricaTasks = async () => {
            setLoading(true);
            let taskIds: string[] = [];

            if ((soloMie || filtroAvanzato.utente) && utenteId) {
                const idFiltro = filtroAvanzato.utente || utenteId;
                const { data: dataUtente } = await supabase
                    .from("utenti_task")
                    .select("task_id")
                    .eq("utente_id", idFiltro);

                if (!dataUtente || dataUtente.length === 0) {
                    setTasks([]);
                    setLoading(false);
                    return;
                }

                taskIds = dataUtente.map(t => t.task_id);
            }

            if (filtroAvanzato.progetto) {
                const { data: dataProgetto } = await supabase
                    .from("progetti_task")
                    .select("task_id")
                    .eq("progetti_id", filtroAvanzato.progetto);

                if (!dataProgetto || dataProgetto.length === 0) {
                    setTasks([]);
                    setLoading(false);
                    return;
                }

                const taskIdsProgetto = dataProgetto.map(r => r.task_id);
                taskIds = taskIds.length > 0
                    ? taskIds.filter(id => taskIdsProgetto.includes(id))
                    : taskIdsProgetto;
            }

            const query = supabase
                .from("tasks")
                .select(`
                    id, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
                    stato:stato_id (id, nome, colore),
                    priorita:priorita_id (id, nome),
                    progetti_task:progetti_task ( progetti ( id, nome ) ),
                    utenti_task ( utenti ( id, nome, cognome ) )
                `)
                .is("deleted_at", null);

            if (taskIds.length > 0) query.in("id", taskIds);
            if (filtroAvanzato.stato) query.eq("stato_id", filtroAvanzato.stato);
            if (filtroAvanzato.priorita) query.eq("priorita_id", filtroAvanzato.priorita);
            if (filtroAvanzato.dataInizio) query.gte("consegna", filtroAvanzato.dataInizio);
            if (filtroAvanzato.dataFine) query.lte("consegna", filtroAvanzato.dataFine);

            const { data } = await query;
            if (data) {
                const tasksPulite: Task[] = data.map((item: any) => ({
                    id: item.id,
                    nome: item.nome,
                    note: item.note,
                    consegna: item.consegna,
                    tempo_stimato: item.tempo_stimato,
                    created_at: item.created_at,
                    modified_at: item.modified_at,
                    fine_task: item.fine_task,
                    parent_id: item.parent_id,
                    stato: item.stato,
                    priorita: item.priorita,
                    progetto: item.progetti_task?.[0]?.progetti ?? null,
                    assegnatari: item.utenti_task?.map((u: any) => u.utenti) ?? [],
                }));
                setTasks(ordinaTaskClientSide(tasksPulite, filtroAvanzato.ordine ?? null));
            }
            setLoading(false);
        };


        const caricaTaskAssegnate = async () => {
            if (!utenteId) return;
            const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", utenteId);
            if (data) setTaskAssegnate(new Set(data.map(t => t.task_id)));
        };

        if (utenteId) {
            caricaTasks();
            caricaTaskAssegnate();
        }
    }, [soloMie, filtroAvanzato, utenteId]);


    const sottoTask = (taskId: string) => tasks.filter(t => t.parent_id === taskId);

    return (
        <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme">
                    <FontAwesomeIcon icon={faTasks} className="text-green-500 mr-2" />
                    Lista Task
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faLink} className="w-5 h-5 text-blue-600" />
                        <span className="text-theme font-medium">Mie</span>
                        <div onClick={() => setSoloMie(v => !v)} className={`toggle-theme ${soloMie ? "active" : ""}`}>
                            <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                        <span className="text-theme font-medium">Completate</span>
                        <div onClick={() => setSoloCompletate(v => !v)} className={`toggle-theme ${soloCompletate ? "active" : ""}`}>
                            <div className={`toggle-thumb ${soloCompletate ? "translate" : ""}`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <FiltriTaskAvanzati tasks={tasks} isAdmin={isAdmin} soloMie={soloMie} onChange={setFiltroAvanzato} />
            </div>

            {loading ? (
                <p className="text-theme text-center text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme">
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        <div className="w-10 shrink-0" />
                        <div className="flex-1">Nome</div>
                        <div className="w-40">Consegna</div>
                        <div className="w-32">Stato</div>
                        <div className="w-32">Priorità</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>

                    {tasksFiltrate.filter(t => !t.parent_id).map(task => {
                        const isAssegnata = taskAssegnate.has(task.id);
                        const isCompletata = task.fine_task !== null;
                        const isOpen = taskEspansaId === task.id;
                        const children = sottoTask(task.id);

                        return (
                            <div key={task.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                                <div className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer" onClick={() => setTaskEspansaId(isOpen ? null : task.id)}>
                                    <div className="w-8 shrink-0 flex justify-start items-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {isAssegnata && (
                                                <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Assegnata a te" />
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

        {task.progetto?.id && task.assegnatari?.length > 0 && ( 
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (activeTimer?.taskId === task.id) {
                                                        handleStopTimer(task);
                                                    } else {
                                                        handleStartTimer(task.id);
                                                    }
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
                                                setTaskDaModificareId(task.id);
                                            }}
                                            className="icon-color hover:text-blue-600"
                                            title="Modifica"
                                        >
                                        
                                        <button onClick={e => { e.stopPropagation(); navigate(`/tasks/${task.id}`); }} className="icon-color hover:text-green-600" title="Vai al dettaglio">
                                            <FontAwesomeIcon icon={faTasks} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setTaskEspansaId(isOpen ? null : task.id); }} className="text-theme text-xl font-bold">
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
                                        {task.progetto?.nome && <p>📁 Progetto: {task.progetto.nome}</p>}
                                        {task.tempo_stimato && <p>⏱️ Tempo stimato: {task.tempo_stimato}</p>}
                                        {task.assegnatari?.length > 0 && (
                                            <p>👥 Assegnata a: {task.assegnatari.map(u => `${u.nome} ${u.cognome || ""}`).join(", ")}</p>
                                        )}
                                        {task.note && <p>🗒️ {task.note}</p>}

                                        {children.length > 0 && (
                                            <div className="mt-4">
                                                <div
                                                    onClick={() => toggleSottoTaskEspansa(task.id)}
                                                    className="cursor-pointer rounded-md px-0 py-2 text-sm text-theme hover-bg-theme "
                                                >
                                                    📎 Sotto-task
                                                </div>

                                                {sottoTaskEspansa.has(task.id) && (
                                                    <div className="mt-2 space-y-2">
                                                        {children.map(sotto => (
                                                            <RenderSottoTask key={sotto.id} task={sotto} allTasks={tasks} livello={1} />
                                                        ))}
                                                    </div>
                                                )}
                                                {commenti.some(c => c.task_id === task.id && !c.parent_id) && (
                                                    <div className="mt-4">
                                                        <h4 className="text-theme font-semibold mb-2">💬 Commenti</h4>
                                                        <div className="space-y-3">
                                                            {commenti.filter(c => c.task_id === task.id && !c.parent_id).map(c => (
                                                                <RenderCommento key={c.id} commento={c} allCommenti={commenti} livello={1} />
                                                            ))}
                                                        </div>
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
            )}

            {taskDaModificareId && (
                <MiniTaskEditorModal taskId={taskDaModificareId} onClose={() => setTaskDaModificareId(null)} />
            )}
        </div>
    );
}


