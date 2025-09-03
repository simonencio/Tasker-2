// 📅 src/GestioneProgetto/CalendarioProgetto.tsx
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "../supporto/supabaseClient";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTasks,
    faCheckCircle,
    faCircle,
} from "@fortawesome/free-solid-svg-icons";

import { isUtenteAdmin } from "../supporto/ruolo";
import {
    filtraTask,
    getColorClass,
    getMessaggio,
    calcolaSettimana,
    generaTaskScadute,
} from "../supporto/calendarioUtils";
import type { Task } from "../supporto/tipi";
import ToggleMie from "../GestioneProgetto/ToggleMie";
import ToggleCompletate from "../GestioneProgetto/ToggleCompletate";
type TaskCal = Task & { progetto_nome?: string | null };

export default function CalendarioProgetto() {
    const { id: routeId, slug } = useParams<{ id?: string; slug?: string }>();

    const [projectId, setProjectId] = useState<string | null>(routeId ?? null);
    const [taskList, setTaskList] = useState<TaskCal[]>([]);

    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);

    const [soloMieTask, setSoloMieTask] = useState(
        () => localStorage.getItem("calSoloMie") === "1"
    );
    const [mostraCompletate, setMostraCompletate] = useState(
        () => localStorage.getItem("calMostraCompletate") !== "0"
    );

    const [isAdmin, setIsAdmin] = useState(false);
    const [updating, setUpdating] = useState<Set<string>>(new Set());

    const REFETCH_DEBOUNCE_MS = 250;
    const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastLoadSourceRef = useRef<"initial" | "manual" | "background">(
        "initial"
    );

    const [settimanaBase, setSettimanaBase] = useState(new Date());
    const oggi = new Date();
    const giorniSettimana = useMemo(
        () => calcolaSettimana(settimanaBase),
        [settimanaBase]
    );

    // admin?
    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then((res) => {
            if (mounted) setIsAdmin(res);
        });
        return () => {
            mounted = false;
        };
    }, []);

    const scheduleRefetch = useCallback(() => {
        if (refetchTimer.current) clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => {
            loadTasks(projectId, "background");
        }, REFETCH_DEBOUNCE_MS);
    }, [projectId]);

    useEffect(() => {
        return () => {
            if (refetchTimer.current) {
                clearTimeout(refetchTimer.current);
                refetchTimer.current = null;
            }
        };
    }, [projectId]);

    useEffect(() => {
        const saved = localStorage.getItem("calMostraCompletate");
        if (saved != null) setMostraCompletate(saved === "1");
    }, []);

    useEffect(() => {
        localStorage.setItem("calMostraCompletate", mostraCompletate ? "1" : "0");
    }, [mostraCompletate]);

    // projectId da slug
    useEffect(() => {
        let alive = true;
        (async () => {
            if (projectId || !slug) return;
            const { data, error } = await supabase
                .from("progetti")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
            if (!alive) return;
            if (!error && data?.id) setProjectId(data.id);
        })();
        return () => {
            alive = false;
        };
    }, [slug, projectId]);

    // sessione utente
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUtenteLoggatoId(data?.session?.user.id ?? null);
        });
    }, []);

    async function loadTasks(
        currentProjectId: string | null,
        source: "initial" | "manual" | "background" = "background"
    ) {
        lastLoadSourceRef.current = source;
        let query = supabase.from("tasks").select(`
        id, stato_id, parent_id, fine_task, nome, note, consegna, tempo_stimato,
        stati (nome),
        priorita (nome),
        utenti_task:utenti_task (
          utente:utenti ( id, nome, cognome )
        ),
        link:progetti_task!left (
          progetti_id,
          progetti ( id, nome )
        )
      `);

        if (currentProjectId) {
            query = query.eq("link.progetti_id", currentProjectId);
        }

        const { data, error } = await query;
        if (!error && data) {
            setTaskList(
                (data as any[]).map((t: any) => ({
                    ...t,
                    progetto_nome: t.link?.[0]?.progetti?.nome ?? null,
                }))
            );
        } else {
            console.error("Errore caricamento tasks:", error);
            setTaskList([]);
        }
    }

    useEffect(() => {
        (async () => {
            await loadTasks(projectId, "initial");
        })();
    }, [projectId]);

    useEffect(() => {
        const chTasks = supabase
            .channel("realtime:tasks")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tasks" },
                () => scheduleRefetch()
            )
            .subscribe();

        const chLinks = projectId
            ? supabase
                .channel("realtime:progetti_task")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "progetti_task" },
                    () => scheduleRefetch()
                )
                .subscribe()
            : null;

        return () => {
            supabase.removeChannel(chTasks);
            if (chLinks) supabase.removeChannel(chLinks);
        };
    }, [projectId, scheduleRefetch]);

    useEffect(() => {
        const onFocus = () => scheduleRefetch();
        const onVis = () => {
            if (document.visibilityState === "visible") scheduleRefetch();
        };

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVis);

        const pollId = setInterval(() => scheduleRefetch(), 30000);

        return () => {
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVis);
            clearInterval(pollId);
        };
    }, [scheduleRefetch]);

    const [showPopupScadute, setShowPopupScadute] = useState(false);
    const [taskScadute, setTaskScadute] = useState<
        { giorno: string; utenti: string[] }[]
    >([]);

    useEffect(() => {
        if (
            !taskList.length ||
            document.cookie.includes("hideExpiredPopup=true") ||
            lastLoadSourceRef.current === "background"
        )
            return;

        const lista = generaTaskScadute(taskList);
        if (lista.length) {
            setTaskScadute(lista);
            setShowPopupScadute(true);
        }
    }, [taskList]);

    async function toggleCompletata(t: Task) {
        if (!t || updating.has(t.id)) return;
        const next = new Set(updating);
        next.add(t.id);
        setUpdating(next);

        const markComplete = !t.fine_task;
        const nowIso = new Date().toISOString();

        const { error } = await supabase
            .from("tasks")
            .update({ fine_task: markComplete ? nowIso : null })
            .eq("id", t.id);

        if (!error) {
            setTaskList((prev) =>
                prev.map((x) =>
                    x.id === t.id ? { ...x, fine_task: markComplete ? nowIso : null } : x
                )
            );
        }
        setUpdating((prev) => {
            const n = new Set(prev);
            n.delete(t.id);
            return n;
        });
    }

    const renderColumn = (giorno: Date) => {
        const tasks = filtraTask<TaskCal>(
            taskList,
            giorno,
            soloMieTask,
            utenteLoggatoId,
            isAdmin,
            mostraCompletate
        );


        return (
            <div
                key={giorno.toISOString()}
                className="flex flex-col flex-1 border-l border-theme/20 overflow-y-auto"
            >
                <div
                    className={`px-3 py-2 sticky top-0 z-10 bg-theme/95 backdrop-blur-sm ${tasks.length > 0 ? getColorClass(giorno, oggi, tasks) : ""
                        }`}
                >
                    <div className="text-sm font-semibold">
                        {format(giorno, "EEEE dd/MM", { locale: it }).replace(
                            /^./,
                            (c) => c.toUpperCase()
                        )}
                    </div>
                    <div className="text-xs opacity-70">{tasks.length} task</div>
                    {tasks.length > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                            <FontAwesomeIcon icon={faTasks} className="w-3 h-3" />
                            <span>{getMessaggio(giorno, oggi)}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 p-2">
                    {tasks.length === 0 && (
                        <div className="text-xs italic opacity-60">Nessuna task</div>
                    )}
                    {tasks.map((t) => (
                        <div
                            key={t.id}
                            className="bg-task rounded-md px-3 py-2 shadow-sm text-sm flex items-center gap-2"
                        >
                            <span
                                onClick={() => toggleCompletata(t)}
                                className={`inline-flex items-center justify-center ${updating.has(t.id)
                                    ? "opacity-50 pointer-events-none"
                                    : "cursor-pointer hover:text-green-600"
                                    }`}
                            >
                                {t.fine_task ? (
                                    <FontAwesomeIcon
                                        icon={faCheckCircle}
                                        className="w-4 h-4 text-green-600"
                                    />
                                ) : (
                                    <FontAwesomeIcon
                                        icon={faCircle}
                                        className="w-4 h-4 text-theme/60"
                                    />
                                )}
                            </span>
                            <div className="truncate">
                                <span className="font-medium">{t.nome}</span>
                                {t.progetto_nome && (
                                    <span className="ml-1 opacity-70">({t.progetto_nome})</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // toggle "solo mie"
    useEffect(() => {
        const saved = localStorage.getItem("calSoloMie");
        if (saved != null) setSoloMieTask(saved === "1");
    }, []);
    useEffect(() => {
        localStorage.setItem("calSoloMie", soloMieTask ? "1" : "0");
    }, [soloMieTask]);

    return (
        <div className="min-h-screen bg-theme text-theme flex flex-col">
            <div className="p-4 flex items-center gap-4 border-b border-theme/20">
                <h1 className="text-xl font-bold">📅 Calendario</h1>
                <div className="ml-auto flex items-center gap-4">
                    <ToggleMie
                        soloMieTask={soloMieTask}
                        setSoloMieTask={setSoloMieTask}
                    />
                    <ToggleCompletate
                        mostraCompletate={mostraCompletate}
                        setMostraCompletate={setMostraCompletate}
                    />
                </div>
            </div>

            <div className="flex justify-center gap-3 py-3 border-b border-theme/20">
                <button
                    onClick={() => setSettimanaBase((p) => addDays(p, -7))}
                    className="text-sm px-3 py-1 rounded-md shadow-sm hover-bg-theme"
                >
                    ← Settimana precedente
                </button>
                <button
                    onClick={() => setSettimanaBase(new Date())}
                    className="text-sm font-semibold px-3 py-1 rounded-md shadow bg-button-oggi"
                >
                    Oggi
                </button>
                <button
                    onClick={() => setSettimanaBase((p) => addDays(p, 7))}
                    className="text-sm px-3 py-1 rounded-md shadow-sm hover-bg-theme"
                >
                    Settimana successiva →
                </button>
            </div>

            {/* colonne giorni */}
            <div className="flex flex-1 overflow-hidden">
                {giorniSettimana.map(renderColumn)}
            </div>

            {showPopupScadute && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="modal-container p-6 rounded-xl max-w-lg w-[calc(100%-40px)] shadow-2xl relative">
                        <h2 className="text-lg font-semibold mb-4">
                            🔔 Hai delle task scadute
                        </h2>
                        <ul className="mb-4 max-h-60 overflow-auto text-sm scrollbar-thin">
                            {taskScadute.map(({ giorno, utenti }) => (
                                <li key={giorno} className="mb-2">
                                    📅 <strong>{giorno}</strong> – {utenti.join(", ")}
                                </li>
                            ))}
                        </ul>
                        <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        const expires = new Date();
                                        expires.setHours(23, 59, 59, 999);
                                        document.cookie = `hideExpiredPopup=true; expires=${expires.toUTCString()}; path=/`;
                                    }
                                }}
                            />
                            Non ricordarmelo più oggi
                        </label>
                        <button
                            onClick={() => setShowPopupScadute(false)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
