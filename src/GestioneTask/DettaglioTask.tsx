import { useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlay,
    faStop,
    faCheckCircle,
    faPen,
    faTrash
} from "@fortawesome/free-solid-svg-icons";
import { Toast } from "toaster-js";
import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";
import ChatCommentiModal, { type Commento } from "./ChatCommentiModal";
// Tipi locali
type Assegnatario = {
    id: string;
    nome: string;
    cognome?: string | null;
};

type Stato = {
    id: number;
    nome: string;
    colore?: string | null;
};

type Priorita = {
    id: number;
    nome: string;
};

type Progetto = {
    id: string;
    nome: string;
};

type Task = {
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    fine_task?: string | null;
    created_at: string;
    modified_at: string;
    parent_id?: string | null;
    stato?: Stato | null;
    priorita?: Priorita | null;
    progetto?: Progetto | null;
    assegnatari: Assegnatario[];
};


export default function DettaglioTask() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [sottoTasks, setSottoTasks] = useState<Task[]>([]);
    const [durateTask, setDurateTask] = useState<Record<string, number>>({});
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
    const [] = useState<number>(0);
    const [espansi, setEspansi] = useState<Set<string>>(new Set());
    const [taskDaModificare, setTaskDaModificare] = useState<string | null>(null);
    const [commenti, setCommenti] = useState<Commento[]>([]);
    const [espansiCommenti, setEspansiCommenti] = useState<Set<string>>(new Set());

    const [taskChatCommenti, setTaskChatCommenti] = useState<Task | null>(null);
    const [commentiChat, setCommentiChat] = useState<Commento[]>([]);


    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getSession();
            setUtenteId(data.session?.user.id || null);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (!id) return;
        const caricaTask = async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select(`
                    id, nome, note, consegna, tempo_stimato, fine_task,
                    created_at, modified_at, parent_id,
                    stato:stato_id ( id, nome, colore ),
                    priorita:priorita_id ( id, nome ),
                    progetti_task ( progetti ( id, nome ) ),
                    utenti_task ( utenti ( id, nome, cognome ) )
                `)
                .eq("id", id)
                .single();

            if (error || !data) return;

            const assegnatari = data.utenti_task.map((u: any) => u.utenti);
            const statoPulito = Array.isArray(data.stato) ? data.stato[0] : data.stato;
            const prioritaPulita = Array.isArray(data.priorita) ? data.priorita[0] : data.priorita;
            const progettoPulito = Array.isArray(data.progetti_task?.[0]?.progetti)
                ? data.progetti_task?.[0]?.progetti[0]
                : data.progetti_task?.[0]?.progetti ?? null;

            setTask({
                id: data.id,
                nome: data.nome,
                note: data.note,
                consegna: data.consegna,
                tempo_stimato: data.tempo_stimato,
                fine_task: data.fine_task,
                created_at: data.created_at,
                modified_at: data.modified_at,
                parent_id: data.parent_id,
                stato: statoPulito,
                priorita: prioritaPulita,
                progetto: progettoPulito,
                assegnatari,
            });
        };
        caricaTask();
    }, [id]);
    const caricaSottoTask = async () => {
        const { data, error } = await supabase
            .from("tasks")
            .select(`
            id, nome, note, consegna, tempo_stimato, fine_task,
            created_at, modified_at, parent_id,
            stato:stato_id ( id, nome, colore ),
            priorita:priorita_id ( id, nome ),
            utenti_task ( utenti ( id, nome, cognome ) )
        `)
            .is("deleted_at", null);

        if (error || !data) {
            console.error("Errore nel caricamento delle sotto-task", error);
            setSottoTasks([]);
            return;
        }

        const taskPulite: Task[] = data.map((t: any) => ({
            id: t.id,
            nome: t.nome ?? "—",
            note: t.note,
            consegna: t.consegna,
            tempo_stimato: t.tempo_stimato,
            fine_task: t.fine_task,
            created_at: t.created_at,
            modified_at: t.modified_at,
            parent_id: t.parent_id,
            stato: Array.isArray(t.stato) ? t.stato[0] : t.stato,
            priorita: Array.isArray(t.priorita) ? t.priorita[0] : t.priorita,
            progetto: null,
            assegnatari: t.utenti_task?.map((u: any) => u.utenti) ?? [],
        }));

        setSottoTasks(taskPulite);
    };
    useEffect(() => {
        if (!id) return;
        const caricaCommenti = async () => {
            const { data, error } = await supabase
                .from("commenti")
                .select(`
        id, parent_id, descrizione, created_at,
        utenti ( nome, cognome )
      `)
                .eq("task_id", id)
                .is("deleted_at", null)
                .order("created_at", { ascending: true });

            if (!error && data) {
                const commentiPuliti: Commento[] = data.map((c: any) => ({
                    id: c.id,
                    parent_id: c.parent_id,
                    descrizione: c.descrizione,
                    created_at: c.created_at,
                    utente: c.utenti || null,
                }));
                setCommenti(commentiPuliti);
            }
        };
        caricaCommenti();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        caricaSottoTask();
    }, [id]);
    const toggleEspansioneCommento = (id: string) => {
        setEspansiCommenti(prev => {
            const nuovo = new Set(prev);

            if (nuovo.has(id)) {
                const chiudiRicorsivo = (cid: string) => {
                    nuovo.delete(cid);
                    const figli = commenti.filter(c => c.parent_id === cid);
                    for (const f of figli) chiudiRicorsivo(f.id);
                };
                chiudiRicorsivo(id);
            } else {
                nuovo.add(id);
            }

            return nuovo;
        });
    };


    useEffect(() => {
        if (!task) return;
        const caricaDurate = async () => {
            const ids = [task.id, ...sottoTasks.map(t => t.id)];
            const { data, error } = await supabase
                .from("time_entries")
                .select("task_id, durata")
                .in("task_id", ids);

            if (error || !data) return;

            const mappa: Record<string, number> = {};
            for (const r of data) {
                if (!r.task_id || !r.durata) continue;
                mappa[r.task_id] = (mappa[r.task_id] || 0) + r.durata;
            }
            setDurateTask(mappa);
        };
        caricaDurate();
    }, [task, sottoTasks]);
    const toggleEspansione = (taskId: string) => {
        setEspansi(prev => {
            const nuovo = new Set(prev);

            if (nuovo.has(taskId)) {
                // Se è aperta, chiudi taskId e tutti i suoi figli ricorsivamente
                const chiudiRicorsivo = (id: string) => {
                    nuovo.delete(id);
                    const figli = sottoTasks.filter(t => t.parent_id === id);
                    for (const figlio of figli) {
                        chiudiRicorsivo(figlio.id);
                    }
                };
                chiudiRicorsivo(taskId);
            } else {
                // Altrimenti, apri solo questa
                nuovo.add(taskId);
            }

            return nuovo;
        });
    };

    const apriChatCommentiPerTask = async (t: Task) => {
        const { data, error } = await supabase
            .from("commenti")
            .select(`
    id, parent_id, descrizione, created_at,
    utente:utente_id ( id, nome, cognome )
`)

            .eq("task_id", t.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: true });

        if (!error && data) {
            const commentiPuliti: Commento[] = data.map((c: any) => ({
                id: c.id,
                parent_id: c.parent_id,
                descrizione: c.descrizione,
                created_at: c.created_at,
                utente: c.utente || null, // ✅ campo corretto
            }));

            setCommentiChat(commentiPuliti);
            setTaskChatCommenti(t);
        } else {
            new Toast("Errore nel caricamento commenti", Toast.TYPE_ERROR);
        }
    };

    const formatDurata = (secondi: number | undefined) => {
        if (!secondi || secondi <= 0) return "—";
        const ore = Math.floor(secondi / 3600);
        const min = Math.floor((secondi % 3600) / 60);
        return `${ore > 0 ? `${ore}h ` : ""}${min}m`;
    };
    const getDurataTotaleTask = (taskId: string): number => {
        const figli = sottoTasks.filter(t => t.parent_id === taskId);
        const durataSelf = durateTask[taskId] || 0;
        const durataFigli = figli.reduce((tot, figlio) => {
            return tot + getDurataTotaleTask(figlio.id);
        }, 0);
        return durataSelf + durataFigli;
    };
    const renderCommentiTabella = (parentId: string | null, livello = 0): JSX.Element[] => {
        const figli = commenti.filter(c => c.parent_id === parentId);
        if (figli.length === 0) return [];

        return figli.flatMap(c => {
            const isEspanso = espansiCommenti.has(c.id);
            const paddingLeft = livello * 16;

            const righe: JSX.Element[] = [];

            // Riga principale commento
            righe.push(
                <div
                    key={c.id}
                    className="px-4 py-3 text-sm text-theme border-t border-theme hover-bg-theme cursor-pointer"
                    style={{ paddingLeft }}
                    onClick={() => toggleEspansioneCommento(c.id)}
                >
                    <div className="font-medium">
                        👤 {c.utente?.nome} {c.utente?.cognome || ""}
                    </div>
                    <div className="mt-1 line-clamp-2">{c.descrizione}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {new Date(c.created_at).toLocaleString()}
                    </div>
                </div>
            );

            // Dettagli reply
            if (isEspanso) {
                righe.push(...renderCommentiTabella(c.id, livello + 1));
            }

            return righe;
        });
    };

    const renderSottoTaskTabella = (parentId: string | null, livello = 0): JSX.Element[] => {
        const figli = sottoTasks.filter(t => t.parent_id === parentId);
        if (figli.length === 0) return [];

        return figli.flatMap(t => {
            const isEspansa = espansi.has(t.id);
            const completata = !!t.fine_task;
            const durata = getDurataTotaleTask(t.id);
            const paddingLeft = livello * 16;

            const righe: JSX.Element[] = [];

            // Riga principale
            righe.push(
                <div
                    key={t.id}
                    className="flex items-center px-4 py-3 text-sm text-theme border-t border-theme hover-bg-theme"
                    style={{ paddingLeft }}
                    onClick={() => toggleEspansione(t.id)}
                >
                    <div className="w-10 shrink-0 flex justify-center items-center">
                        {completata && (
                            <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 icon-color" title="Completata" />
                        )}
                    </div>

                    <div className="flex-1 font-medium truncate">{t.nome}</div>

                    <div className="w-20 flex justify-end items-center gap-2" onClick={e => e.stopPropagation()}>
                        {/* Modifica */}

                        <FontAwesomeIcon
                            icon={faPen}
                            className="cursor-pointer hover:text-blue-600 icon-color"
                            title="Modifica"
                            onClick={() => setTaskDaModificare(t.id)}
                        />

                        {/* Play / Stop */}
                        <FontAwesomeIcon
                            icon={activeTimer?.taskId === t.id ? faStop : faPlay}
                            className={`cursor-pointer ${activeTimer?.taskId === t.id ? "text-red-600" : "text-green-600"} icon-color`}
                            title={activeTimer?.taskId === t.id ? "Ferma timer" : "Avvia timer"}
                            onClick={() => {
                                if (activeTimer?.taskId === t.id) {
                                    handleStopTimer({ ...t, progetto: task?.progetto });
                                } else {
                                    handleStartTimer({ ...t, progetto: task?.progetto });
                                }
                            }}
                        />
                        <FontAwesomeIcon
                            icon={faCommentDots}
                            className="text-blue-600 cursor-pointer icon-color"
                            title="Apri commenti"
                            onClick={() => apriChatCommentiPerTask(t)}
                        />




                        {/* Cestino */}
                        <FontAwesomeIcon
                            icon={faTrash}
                            className="cursor-not-allowed text-gray-400 icon-color"
                            title="Elimina (non implementato)"
                        />
                    </div>
                </div>
            );

            // Riga dettagli (se espansa)
            if (isEspansa) {
                righe.push(
                    <div
                        key={`${t.id}-dettagli`}
                        className="bg-theme border-b border-theme px-4 py-3 text-sm text-theme"
                        style={{ paddingLeft: paddingLeft + 32 }}
                    >
                        <div className="mb-1"><strong>Note:</strong> {t.note || "—"}</div>
                        <div className="mb-1"><strong>Priorità:</strong> {t.priorita?.nome || "—"}</div>
                        <div><strong>Tempo totale:</strong> {formatDurata(durata)}</div>
                    </div>
                );

                // Ricorsione
                righe.push(...renderSottoTaskTabella(t.id, livello + 1));
            }

            return righe;
        });
    };


    if (!task) return <div className="p-6 text-theme">Caricamento task...</div>;

    const completata = !!task.fine_task;
    const handleStartTimer = (t: Task) => {
        if (!t) return;
        setActiveTimer({ taskId: t.id, startTime: new Date() });
    };


    const handleStopTimer = async (t: Task) => {
        if (!t || !utenteId || !activeTimer) return;

        const fine = new Date();
        const durata = Math.floor((fine.getTime() - activeTimer.startTime.getTime()) / 1000);

        const { error } = await supabase.from("time_entries").insert({
            utente_id: utenteId,
            progetto_id: t.progetto?.id,
            task_id: t.id,
            nome: t.nome,
            data_inizio: activeTimer.startTime.toISOString(),
            data_fine: fine.toISOString(),
            durata,
        });

        if (error) new Toast("Errore nel salvataggio", Toast.TYPE_ERROR);
        else new Toast("Tempo salvato", Toast.TYPE_DONE);

        setActiveTimer(null);
    };


    return (
        <div className="p-6 max-w-6xl mx-auto text-theme space-y-6">
            {/* Intestazione */}
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {completata && (
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" title="Completata" />
                )}
                {task.nome}
            </h1>

            {/* Dettagli task */}
            {task.note && <p>🗒️ <strong>Note:</strong> {task.note}</p>}
            {task.tempo_stimato && <p>⏱️ <strong>Tempo stimato:</strong> {task.tempo_stimato}</p>}
            {task.consegna && <p>📅 <strong>Consegna:</strong> {new Date(task.consegna).toLocaleDateString()}</p>}
            {task.stato?.nome && <p>📊 <strong>Stato:</strong> {task.stato.nome}</p>}
            {task.priorita?.nome && <p>⬆️ <strong>Priorità:</strong> {task.priorita.nome}</p>}

            {/* Timer */}
            {task.assegnatari.length > 0 && (
                <>
                    <p className="font-semibold mt-4">👥 Assegnata a:</p>
                    <ul className="ml-6 list-disc">
                        {task.assegnatari.map(u => (
                            <li key={u.id}>
                                {u.nome} {u.cognome || ""}
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={() => {
                            if (activeTimer?.taskId === task.id) {
                                handleStopTimer(task);
                            } else {
                                handleStartTimer(task);
                            }
                        }}
                        className={`mt-4 px-4 py-2 rounded text-white ${activeTimer?.taskId === task.id ? "bg-red-600" : "bg-green-600"}`}
                    >
                        <FontAwesomeIcon icon={activeTimer?.taskId === task.id ? faStop : faPlay} className="mr-2" />
                        {activeTimer?.taskId === task.id ? "Ferma timer" : "Avvia timer"}
                    </button>
                    <FontAwesomeIcon
                        icon={faCommentDots}
                        className="ml-4 text-blue-600 cursor-pointer"
                        title="Apri commenti"
                        onClick={() => task && apriChatCommentiPerTask(task)}
                    />


                </>
            )}

            {/* Tabella Sotto-task */}
            <div className="mt-10">
                <h2 className="text-lg font-semibold mb-2">📎 Sotto-task</h2>
                <div className="rounded-xl overflow-hidden shadow-md card-theme">
                    {/* Header */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300">
                        <div className="w-10 shrink-0" />
                        <div className="flex-1">Nome</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>


                    {/* Righe */}
                    {renderSottoTaskTabella(task.id)}
                    {sottoTasks.filter(t => t.parent_id === task.id).length === 0 && (
                        <div className="p-4 text-sm text-gray-500">Nessuna sotto-task</div>
                    )}
                </div>
            </div>
            {taskDaModificare && (
                <MiniTaskEditorModal
                    taskId={taskDaModificare}
                    onClose={() => setTaskDaModificare(null)}
                />
            )}
            {taskChatCommenti && utenteId && (
                <ChatCommentiModal
                    commenti={commentiChat}
                    utenteId={utenteId}
                    taskId={task.id}
                    assegnatari={task.assegnatari}
                    onClose={() => {
                        setTaskChatCommenti(null);
                        setCommentiChat([]);
                    }}
                    onNuovoCommento={() => apriChatCommentiPerTask(task)}
                />
            )}







        </div>
    );
}
