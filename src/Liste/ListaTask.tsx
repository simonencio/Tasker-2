import { useEffect, useState } from "react";
import { Toast } from "toaster-js";
import "../App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlay,
    faStop,
    faTasks,
    faCheckCircle,
    faLink,
} from "@fortawesome/free-solid-svg-icons";

import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
import FiltriGenericiAvanzati, {
    type FiltroAvanzatoGenerico,
    ordinaClientSide,
} from "../supporto/FiltriGenericiAvanzati";
import type { Commento, Task } from "../supporto/tipi";
import { useNavigate } from "react-router-dom";
import RenderSottoTask from "../supporto/SottoTask";
import RenderCommento from "../supporto/RenderCommento";
import { useToast } from "../supporto/useToast";
import ListaGenerica from "./ListaGenerica";
import { supabase } from "../supporto/supabaseClient";
import { fetchTasks } from "../supporto/fetchData";

export default function ListaTask() {
    const toast = useToast();
    const navigate = useNavigate();

    // ===============================
    // 🔹 Stati interni
    // ===============================
    const [durataTotaleTask] = useState<Record<string, number>>({});
    const [slugById, setSlugById] = useState<Record<string, string>>({});
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskAssegnate, setTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Toggle filtri visivi
    const [soloMie, setSoloMie] = useState(false);
    const [soloCompletate, setSoloCompletate] = useState(false);

    // Utente loggato
    const [utenteId, setUtenteId] = useState<string | null>(null);

    // Commenti e sotto-task espansi
    const [commenti, setCommenti] = useState<Commento[]>([]);
    const [commentiEspansi, setCommentiEspansi] = useState<Set<string>>(new Set());
    const [sottoTaskEspansa, setSottoTaskEspansa] = useState<Set<string>>(new Set());

    // Filtri avanzati (ordinamento, campi, ecc.)
    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzatoGenerico>({});

    // Applicazione del filtro "solo completate"
    const tasksFiltrate = tasks.filter((t) => !soloCompletate || t.fine_task !== null);

    // ===============================
    // 🔹 Helpers UI (toggle e formattazioni)
    // ===============================
    const toggleCommentiEspansi = (taskId: string) =>
        setCommentiEspansi((prev) => {
            const nuovo = new Set(prev);
            nuovo.has(taskId) ? nuovo.delete(taskId) : nuovo.add(taskId);
            return nuovo;
        });

    const toggleSottoTaskEspansa = (taskId: string) =>
        setSottoTaskEspansa((prev) => {
            const nuovo = new Set(prev);
            nuovo.has(taskId) ? nuovo.delete(taskId) : nuovo.add(taskId);
            return nuovo;
        });

    // 🔸 Formattazione durata in ore/minuti/secondi
    const formatDurata = (value: number | string | null): string => {
        if (!value) return "0m";
        if (typeof value === "number") {
            const ore = Math.floor(value / 3600);
            const minuti = Math.floor((value % 3600) / 60);
            const secondi = value % 60;
            if (ore > 0 && secondi > 0) return `${ore}h ${minuti}m ${secondi}s`;
            if (ore > 0) return `${ore}h ${minuti}m`;
            if (minuti > 0 && secondi > 0) return `${minuti}m ${secondi}s`;
            if (minuti > 0) return `${minuti}m`;
            return `${secondi}s`;
        }
        return "0m";
    };

    // ===============================
    // 🔹 Timer gestione avvio/stop
    // ===============================
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
    const [, setElapsed] = useState<number>(0);

    const handleStartTimer = (taskId: string) =>
        setActiveTimer({ taskId, startTime: new Date() });

    const handleStopTimer = async (_task: Task) => {
        if (!activeTimer || !utenteId) {
            setActiveTimer(null);
            return;
        }

        const taskPlayed = tasks.find((t) => t.id === activeTimer.taskId);
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
            toast("Errore nel salvataggio del tempo", "error");
        } else {
            toast("Tempo salvato con successo", "success");
        }
        setActiveTimer(null);
    };

    // Aggiornamento timer ogni secondo
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (activeTimer) {
            interval = setInterval(
                () => setElapsed(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000)),
                1000
            );
        } else setElapsed(0);

        return () => interval && clearInterval(interval);
    }, [activeTimer]);

    // ===============================
    // 🔹 Fetch dati da Supabase
    // ===============================
    // Recupero utente
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUtenteId(user.id);
        });
    }, []);

    // Recupero commenti
    useEffect(() => {
        supabase
            .from("commenti")
            .select(`id, utente_id, task_id, parent_id, descrizione, created_at, modified_at, deleted_at,
                     utente:utente_id ( id, nome, cognome )`)
            .is("deleted_at", null)
            .then(({ data }) => {
                if (data) {
                    setCommenti(data.map((c: any) => ({
                        ...c,
                        utente: Array.isArray(c.utente) ? c.utente[0] : c.utente,
                    })));
                }
            });
    }, []);

    // Recupero tasks e assegnazioni
    useEffect(() => {
        const caricaTasks = async () => {
            setLoading(true);
            try {
                const data = await fetchTasks(
                    { ...filtroAvanzato, soloMie },
                    utenteId ?? undefined
                );

                // Mappa id→slug
                const nextSlugMap: Record<string, string> = {};
                data.forEach((row: any) => { if (row.slug) nextSlugMap[row.id] = row.slug; });
                setSlugById(nextSlugMap);

                // Ordinamento lato client
                setTasks(
                    ordinaClientSide(data, filtroAvanzato.ordine ?? null, (task, criterio) => {
                        switch (criterio) {
                            case "consegna_asc":
                            case "consegna_desc":
                                return task.consegna;
                            case "stato_az":
                            case "stato_za":
                                return task.stato?.nome;
                            case "nome_az":
                            case "nome_za":
                                return task.nome;
                            case "priorita_urgente":
                            case "priorita_meno_urgente":
                                return task.priorita?.id;
                            default:
                                return task.nome;
                        }
                    })
                );

                // Task assegnate a me
                if (utenteId) {
                    supabase
                        .from("utenti_task")
                        .select("task_id")
                        .eq("utente_id", utenteId)
                        .then(({ data }) => data && setTaskAssegnate(new Set(data.map((t) => t.task_id))));
                }
            } finally {
                setLoading(false);
            }
        };

        if (utenteId) caricaTasks();
    }, [soloMie, filtroAvanzato, utenteId]);

    // ===============================
    // 🔹 Funzione utility
    // ===============================
    const sottoTask = (taskId: string) => tasks.filter((t) => t.parent_id === taskId);

    // ===============================
    // 🔹 Render principale
    // ===============================
    return (
        <ListaGenerica<Task>
            titolo="Lista Task"
            icona={faTasks}
            coloreIcona="text-green-500"
            tipo="tasks"

            // 🔸 Dati mostrati nella lista (solo task radice, non sotto-task)
            dati={tasksFiltrate.filter((t) => !t.parent_id)}
            loading={loading}

            // ===============================
            // 🔹 Colonne principali della lista
            // (decidono cosa mostrare in ogni riga compatta)
            // ===============================
            colonne={[
                {
                    chiave: "nome",
                    label: "Nome",
                    render: (task) => (
                        <div className="flex items-center gap-2">
                            {taskAssegnate.has(task.id) && (
                                <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Assegnata a te" />
                            )}
                            {task.fine_task && (
                                <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completata" />
                            )}
                            <span>{task.nome}</span>
                        </div>
                    ),
                },
                {
                    chiave: "consegna",
                    label: "Consegna",
                    className: "w-40 hidden lg:block",
                    render: (t) => (t.consegna ? new Date(t.consegna).toLocaleDateString() : "—"),
                },
                {
                    chiave: "stato",
                    label: "Stato",
                    className: "w-32 hidden lg:block",
                    render: (t) => t.stato?.nome ?? "—",
                },
                {
                    chiave: "priorita",
                    label: "Priorità",
                    className: "w-32 hidden lg:block",
                    render: (t) => t.priorita?.nome ?? "—",
                },
            ]}

            // ===============================
            // 🔹 Azioni sulle righe (timer, dettaglio)
            // ===============================
            azioni={(task) => (
                <>
                    {task.progetto?.id && task.assegnatari?.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeTimer?.taskId === task.id) handleStopTimer(task);
                                else handleStartTimer(task.id);
                            }}
                            className={`icon-color ${activeTimer?.taskId === task.id
                                ? "hover:text-red-600"
                                : "hover:text-green-600"
                                }`}
                            title={activeTimer?.taskId === task.id ? "Ferma timer" : "Avvia timer"}
                        >
                            <FontAwesomeIcon icon={activeTimer?.taskId === task.id ? faStop : faPlay} />
                        </button>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const slug = slugById[task.id];
                            navigate(`/tasks/${slug || task.id}`);
                        }}
                        className="icon-color hover:text-green-600"
                        title="Vai al dettaglio"
                    >
                        <FontAwesomeIcon icon={faTasks} />
                    </button>
                </>
            )}

            // ===============================
            // 🔹 Contenuto espanso (dettaglio riga)
            // Qui decidiamo quali info aggiuntive mostrare
            // ===============================
            renderDettaglio={(task) => (
                <div className="space-y-2">
                    {task.progetto?.nome && <p>📁 Progetto: {task.progetto.nome}</p>}
                    {task.tempo_stimato && <p>⏱️ Tempo stimato: {formatDurata(task.tempo_stimato)}</p>}
                    {durataTotaleTask[task.id] !== undefined && (
                        <p>🕒 Tempo registrato totale: {formatDurata(durataTotaleTask[task.id])}</p>
                    )}
                    {task.assegnatari?.length > 0 && (
                        <p>👥 Assegnata a: {task.assegnatari.map((u) => `${u.nome} ${u.cognome || ""}`).join(", ")}</p>
                    )}
                    {task.note && <p>🗒️ {task.note}</p>}

                    {/* 🔸 Sotto-task */}
                    {sottoTask(task.id).length > 0 && (
                        <div className="mt-4">
                            <div
                                onClick={() => toggleSottoTaskEspansa(task.id)}
                                className="cursor-pointer rounded-md px-0 py-2 text-sm text-theme hover-bg-theme"
                            >
                                📎 Sotto-task
                            </div>
                            {sottoTaskEspansa.has(task.id) && (
                                <div className="mt-2 space-y-2">
                                    {sottoTask(task.id).map((sotto) => (
                                        <RenderSottoTask key={sotto.id} task={sotto} allTasks={tasks} livello={1} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🔸 Commenti */}
                    {commenti.some((c) => c.task_id === task.id && !c.parent_id) && (
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
                                        .filter((c) => c.task_id === task.id && !c.parent_id)
                                        .map((c) => (
                                            <RenderCommento key={c.id} commento={c} allCommenti={commenti} livello={1} />
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            // ===============================
            // 🔹 Azioni extra (filtri toggle sopra la lista)
            // ===============================
            azioniExtra={
                <>
                    {/* Toggle "Mie" */}
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faLink} className="w-5 h-5 text-blue-600" />
                        <span className="text-theme font-medium">Mie</span>
                        <div
                            onClick={() => setSoloMie(v => !v)}
                            className={`toggle-theme ${soloMie ? "active" : ""}`}
                        >
                            <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                        </div>
                    </div>

                    {/* Toggle "Completate" */}
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                        <span className="text-theme font-medium">Completate</span>
                        <div
                            onClick={() => setSoloCompletate(v => !v)}
                            className={`toggle-theme ${soloCompletate ? "active" : ""}`}
                        >
                            <div className={`toggle-thumb ${soloCompletate ? "translate" : ""}`} />
                        </div>
                    </div>
                </>
            }

            // ===============================
            // 🔹 Filtri avanzati (dropdown sopra lista)
            // ===============================
            filtri={
                <FiltriGenericiAvanzati<Task>
                    dati={tasks}
                    campi={["progetto", "utente", "stato", "priorita", "date", "ordine"]}
                    estrattori={{
                        progetto: (t: Task) =>
                            t.progetto ? { id: t.progetto.id, nome: t.progetto.nome } : null,
                        utente: (t: Task) => t.assegnatari,
                        stato: (t: Task) =>
                            t.stato ? { id: t.stato.id, nome: t.stato.nome } : null,
                        priorita: (t: Task) =>
                            t.priorita ? { id: t.priorita.id, nome: t.priorita.nome } : null,
                        consegna: (t: Task) => (t.consegna ? t.consegna : null),
                    }}
                    onChange={setFiltroAvanzato}
                />
            }

            // ===============================
            // 🔹 Modale modifica task
            // ===============================
            renderModaleModifica={(id, onClose) => (
                <MiniTaskEditorModal taskId={id} onClose={onClose} />
            )}
        />
    );
}
