// src/Progetti/BachecaProgetto.tsx
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import IntestazioneProgetto from "./IntestazioneProgetto";
import { isUtenteAdmin } from "../supporto/ruolo";
import ToggleMie from "./ToggleMie";
import { format, isToday, isTomorrow, isBefore, startOfDay, addDays } from "date-fns";
import { it } from "date-fns/locale";

type StatoTask = { id: number; nome: string };
type Utente = { id: string; nome: string };
type UtenteTask = { utente?: Utente | null };
type PrioritaTask = { id: number; nome: string };

export type Task = {
    stato_id: number;
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    stati?: StatoTask | null;
    priorita?: PrioritaTask | null;
    utenti_task?: UtenteTask[];
};

type ProgettoTaskRow = { task: Task };

type Colonna = { chiave: string; label: string };
type Raggruppamento = "stato" | "assegnatario" | "priorita" | "scadenza";

export default function BachecaProgetto() {
    // 🔁 leggiamo lo SLUG dalla route (/progetti/:slug/bacheca)
    const { slug } = useParams<{ slug: string }>();

    // id reale del progetto risolto da slug (serve solo per le query)
    const [progettoId, setProgettoId] = useState<string | null>(null);

    const [taskList, setTaskList] = useState<Task[]>([]);
    const [stati, setStati] = useState<StatoTask[]>([]);
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<Raggruppamento>("stato");
    const [, setOffsetSettimana] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);

    // drag orizzontale
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeftStart = useRef(0);
    const [dragEnabled, setDragEnabled] = useState(false);

    // colonne (dipendono dal raggruppamento)
    let colonne: Colonna[] = [];

    // ───────────────────────── Auth/ruolo ─────────────────────────
    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession();
            setUtenteLoggatoId(session?.session?.user.id || null);
        };
        fetchUtente();
    }, []);

    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then((res) => {
            if (!mounted) return;
            setIsAdmin(res);
            if (!res) setSoloMieTask(true);
        });
        return () => {
            mounted = false;
        };
    }, []);

    // ───────────────────────── Risolvi id progetto da slug ─────────────────────────
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!slug) return;
            const { data, error } = await supabase
                .from("progetti")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();

            if (!alive) return;
            if (error || !data?.id) {
                setProgettoId(null);
                return;
            }
            setProgettoId(data.id);
        })();
        return () => {
            alive = false;
        };
    }, [slug]);

    // ───────────────────────── Dati (stati + task) ─────────────────────────
    useEffect(() => {
        const fetchStati = async () => {
            const { data, error } = await supabase.from("stati").select("id, nome").is("deleted_at", null);
            if (!error && data) setStati(data);
        };

        const fetchTasks = async () => {
            if (!progettoId) return;
            const { data, error } = (await supabase
                .from("progetti_task")
                .select(
                    `
            task:tasks (
              id,
              stato_id,
              nome,
              note,
              consegna,
              tempo_stimato,
              stati ( id, nome ),
              priorita ( id, nome ),
              utenti_task (
                utente:utenti ( id, nome )
              )
            )
          `
                )
                .eq("progetti_id", progettoId)) as { data: ProgettoTaskRow[] | null; error: any };

            if (!error && data) {
                const tasksPulite: Task[] = data.map((row) => ({
                    ...row.task,
                    stati: row.task.stati ?? null,
                    priorita: row.task.priorita ?? null,
                    utenti_task: row.task.utenti_task ?? [],
                }));
                setTaskList(tasksPulite);
            }
        };

        fetchStati();
        fetchTasks();
    }, [progettoId]);

    // reset offset settimana quando cambia il raggruppamento
    useEffect(() => {
        if (groupBy !== "scadenza") {
            setOffsetSettimana(0);
        }
    }, [groupBy]);

    // abilita drag orizzontale solo se serve
    useEffect(() => {
        if (scrollRef.current) {
            const enabled = scrollRef.current.scrollWidth > scrollRef.current.clientWidth;
            setDragEnabled(enabled);
        }
    }, [colonne]);

    // ───────────────────────── Costruzione colonne ─────────────────────────
    if (groupBy === "stato") {
        colonne = stati.map((s) => ({ chiave: String(s.id), label: s.nome }));
    } else if (groupBy === "assegnatario") {
        const assegnatariUnici = Array.from(
            new Set(taskList.flatMap((t) => t.utenti_task?.map((ut) => ut.utente?.nome || "Non assegnata") ?? []))
        ).filter((nome): nome is string => !!nome);
        colonne = assegnatariUnici.map((nome) => ({ chiave: nome, label: nome }));
    } else if (groupBy === "priorita") {
        const prioritaUniche = Array.from(new Set(taskList.map((t) => t.priorita?.nome || "Nessuna")));
        colonne = prioritaUniche.map((p) => ({ chiave: p, label: p }));
    } else if (groupBy === "scadenza") {
        const oggi = startOfDay(new Date());
        const colonneOrdinate: Colonna[] = [
            { chiave: "scaduti", label: "Scaduti" },
            { chiave: "oggi", label: "Oggi" },
            { chiave: "domani", label: "Domani" },
        ];

        // Aggiungi fino a 5 giorni lavorativi successivi
        let aggiunti = 0;
        let giorno = addDays(oggi, 2);
        while (aggiunti < 5) {
            const giornoSettimana = giorno.getDay(); // 0=Dom, 6=Sab
            if (giornoSettimana !== 0 && giornoSettimana !== 6) {
                colonneOrdinate.push({
                    chiave: giorno.toISOString().split("T")[0],
                    label: format(giorno, "EEEE", { locale: it }),
                });
                aggiunti++;
            }
            giorno = addDays(giorno, 1);
        }

        colonneOrdinate.push({ chiave: "futuri", label: "Futuri" });
        colonneOrdinate.push({ chiave: "senza", label: "Senza data" });
        colonneOrdinate.push({ chiave: "completati", label: "Completati" });

        colonne = colonneOrdinate;
    }

    return (
        <div className="min-h-screen bg-theme text-theme">
            {/* ✅ passiamo SLUG all'intestazione per generare link /progetti/:slug/... */}
            <IntestazioneProgetto
                slug={slug!}
                soloMieTask={soloMieTask}
                setSoloMieTask={isAdmin ? setSoloMieTask : () => { }}
            />

            <div className="p-4 flex justify-end">
                {isAdmin && <ToggleMie soloMieTask={soloMieTask} setSoloMieTask={setSoloMieTask} />}
            </div>

            <div className="p-6">
                <div className="flex justify-end mb-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-medium mr-2">Visualizza per:</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as Raggruppamento)}
                            className="input-style"
                        >
                            <option value="stato">Stato</option>
                            <option value="assegnatario">Assegnatario</option>
                            <option value="priorita">Priorità</option>
                            <option value="scadenza">Data di scadenza</option>
                        </select>
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-6">📋 Bacheca</h1>

                <div
                    ref={scrollRef}
                    className={`flex gap-4 overflow-x-auto hide-scrollbar ${dragEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                        }`}
                    onMouseDown={(e) => {
                        if (!dragEnabled) return;
                        isDragging.current = true;
                        startX.current = e.pageX - scrollRef.current!.offsetLeft;
                        scrollLeftStart.current = scrollRef.current!.scrollLeft;
                    }}
                    onMouseLeave={() => (isDragging.current = false)}
                    onMouseUp={() => (isDragging.current = false)}
                    onMouseMove={(e) => {
                        if (!isDragging.current || !dragEnabled) return;
                        e.preventDefault();
                        const x = e.pageX - scrollRef.current!.offsetLeft;
                        const walk = (x - startX.current) * 1;
                        scrollRef.current!.scrollLeft = scrollLeftStart.current - walk;
                    }}
                >
                    {colonne.map((col) => (
                        <div key={col.chiave} className="w-64 card-theme flex-shrink-0">
                            <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 font-semibold text-sm text-gray-700 dark:text-gray-200">
                                {col.label}
                            </div>
                            <div className="p-2 space-y-2">
                                {taskList
                                    .filter((task) => {
                                        const assegnataAme =
                                            task.utenti_task?.some((ut): boolean => ut.utente?.id === utenteLoggatoId) ?? false;
                                        const passaMieTask = !soloMieTask || assegnataAme;
                                        if (!passaMieTask) return false;

                                        if (groupBy === "stato") return String(task.stato_id) === col.chiave;

                                        if (groupBy === "assegnatario") {
                                            const nomi = task.utenti_task?.map((ut) => ut.utente?.nome) ?? ["Non assegnata"];
                                            return nomi.includes(col.chiave);
                                        }

                                        if (groupBy === "priorita") return (task.priorita?.nome || "Nessuna") === col.chiave;

                                        if (groupBy === "scadenza") {
                                            // Completati
                                            if (task.stati?.nome?.toLowerCase() === "completato") {
                                                return col.chiave === "completati";
                                            }

                                            // Senza data
                                            if (!task.consegna) return col.chiave === "senza";

                                            const dataTask = startOfDay(new Date(task.consegna));
                                            const oggi = startOfDay(new Date());

                                            if (isBefore(dataTask, oggi)) return col.chiave === "scaduti";
                                            if (isToday(dataTask)) return col.chiave === "oggi";
                                            if (isTomorrow(dataTask)) return col.chiave === "domani";

                                            // Giorni lavorativi successivi
                                            let aggiunti = 0;
                                            let giorno = addDays(oggi, 2);
                                            while (aggiunti < 5) {
                                                const giornoSettimana = giorno.getDay();
                                                if (giornoSettimana !== 0 && giornoSettimana !== 6) {
                                                    if (dataTask.getTime() === giorno.getTime()) {
                                                        return col.chiave === giorno.toISOString().split("T")[0];
                                                    }
                                                    aggiunti++;
                                                }
                                                giorno = addDays(giorno, 1);
                                            }

                                            // Futuri
                                            return col.chiave === "futuri";
                                        }

                                        return false;
                                    })
                                    .map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-theme border border-gray-200 dark:border-gray-600 p-3 rounded shadow text-sm space-y-1"
                                        >
                                            <div className="font-semibold text-theme">{task.nome}</div>
                                            {Array.isArray(task.utenti_task) && task.utenti_task.length > 0 && (
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    👤 <span className="font-medium">Assegnata a:</span>{" "}
                                                    {task.utenti_task.map((ut) => ut.utente?.nome).filter(Boolean).join(", ")}
                                                </div>
                                            )}
                                            {task.consegna && (
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    📅 <span className="font-medium">Scadenza:</span>{" "}
                                                    {new Date(task.consegna).toLocaleDateString()}
                                                </div>
                                            )}
                                            {task.stati?.nome && (
                                                <div className="text-xs text-gray-500 italic dark:text-gray-300">
                                                    📌 Stato: {task.stati.nome}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
