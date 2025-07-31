import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faUser } from "@fortawesome/free-solid-svg-icons";

export type Task = {
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    created_at: string;
    modified_at: string;
    stato?: { nome: string; colore?: string | null } | null;
    priorita?: { nome: string } | null;
    progetto?: { id: string; nome: string } | null;
};

export default function ListaTask() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskAssegnate, setTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [progetti, setProgetti] = useState<{ id: string; nome: string }[]>([]);
    const [utenti, setUtenti] = useState<{ id: string; nome: string }[]>([]);
    const [stati, setStati] = useState<{ id: number; nome: string }[]>([]);
    const [priorita, setPriorita] = useState<{ id: number; nome: string }[]>([]);

    const [progettoFilter, setProgettoFilter] = useState<string | null>(null);
    const [utenteFilter, setUtenteFilter] = useState<string | null>(null);
    const [statoFilter, setStatoFilter] = useState<number | null>(null);
    const [prioritaFilter, setPrioritaFilter] = useState<number | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUtenteId(user.id);
            const { data: ruoloData } = await supabase.from("utenti").select("ruolo").eq("id", user.id).single();
            if (ruoloData?.ruolo === 1) setIsAdmin(true);
        };

        const fetchFiltri = async () => {
            const [progettiRes, utentiRes, statiRes, prioritaRes] = await Promise.all([
                supabase.from("progetti").select("id, nome").is("deleted_at", null),
                supabase.from("utenti").select("id, nome"),
                supabase.from("stati").select("id, nome").is("deleted_at", null),
                supabase.from("priorita").select("id, nome").is("deleted_at", null),
            ]);
            setProgetti(progettiRes.data || []);
            setUtenti(utentiRes.data || []);
            setStati(statiRes.data || []);
            setPriorita(prioritaRes.data || []);
        };

        fetchUtente();
        fetchFiltri();
    }, []);

    useEffect(() => {
        const caricaTasks = async () => {
            setLoading(true);
            let taskIds: string[] = [];

            if ((soloMie || utenteFilter) && utenteId) {
                const idFiltro = utenteFilter || utenteId;
                const { data } = await supabase
                    .from("utenti_task")
                    .select("task_id")
                    .eq("utente_id", idFiltro);
                if (!data || data.length === 0) {
                    setTasks([]);
                    setLoading(false);
                    return;
                }
                taskIds = data.map((t) => t.task_id);
            }

            const query = supabase
                .from("tasks")
                .select(`
                    id, nome, note, consegna, tempo_stimato, created_at, modified_at,
                    stato:stato_id (nome, colore),
                    priorita:priorita_id (nome),
                    progetti_task:progetti_task ( progetti ( id, nome ) )
                `)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if ((soloMie || utenteFilter) && taskIds.length > 0) query.in("id", taskIds);
            if (statoFilter) query.eq("stato_id", statoFilter);
            if (prioritaFilter) query.eq("priorita_id", prioritaFilter);

            const { data } = await query;

            if (data) {
                const tasksPulite: Task[] = data.map((item: any) => ({
                    ...item,
                    stato: item.stato,
                    priorita: item.priorita,
                    progetto: item.progetti_task?.[0]?.progetti ?? null,
                }));
                const filtrate = progettoFilter
                    ? tasksPulite.filter((t) => t.progetto?.id === progettoFilter)
                    : tasksPulite;
                setTasks(filtrate);
            }
            setLoading(false);
        };

        const caricaTaskAssegnate = async () => {
            if (!utenteId) return;
            const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", utenteId);
            if (data) setTaskAssegnate(new Set(data.map((t) => t.task_id)));
        };

        if (utenteId) {
            caricaTasks();
            caricaTaskAssegnate();
        }
    }, [soloMie, utenteFilter, statoFilter, prioritaFilter, progettoFilter, utenteId]);

    return (
        <div className="p-4 sm:p-6">
            {/* Filtri + toggle */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3 lg:hidden">
                    <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-purple-900" />
                    <span className="text-theme font-medium text-base">Miei</span>
                    <div
                        onClick={() => setSoloMie((v) => !v)}
                        className={`toggle-theme ${soloMie ? "active" : ""}`}
                    >
                        <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className={`w-full ${isAdmin && !soloMie
                        ? "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-4 lg:flex lg:flex-nowrap lg:gap-4 lg:[&>*]:w-auto"
                        : "flex flex-col md:flex-row md:gap-4 md:[&>*]:flex-1 lg:[&>*]:w-auto"}`}>

                        <select
                            className="input-style w-full"
                            value={progettoFilter || ""}
                            onChange={(e) => setProgettoFilter(e.target.value || null)}
                        >
                            <option value="">📁 Tutti i progetti</option>
                            {progetti.map((p) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>

                        <select
                            className="input-style w-full"
                            value={statoFilter || ""}
                            onChange={(e) => setStatoFilter(Number(e.target.value) || null)}
                        >
                            <option value="">📊 Tutti gli stati</option>
                            {stati.map((s) => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>

                        <select
                            className="input-style w-full"
                            value={prioritaFilter || ""}
                            onChange={(e) => setPrioritaFilter(Number(e.target.value) || null)}
                        >
                            <option value="">⏫ Tutte le priorità</option>
                            {priorita.map((p) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>

                        {isAdmin && !soloMie && (
                            <select
                                className="input-style w-full"
                                value={utenteFilter || ""}
                                onChange={(e) => setUtenteFilter(e.target.value || null)}
                            >
                                <option value="">🧑‍💼 Tutti gli utenti</option>
                                {utenti.map((u) => (
                                    <option key={u.id} value={u.id}>{u.nome}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center gap-3">
                        <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-purple-900" />
                        <span className="text-theme font-medium text-base">Miei</span>
                        <div
                            onClick={() => setSoloMie((v) => !v)}
                            className={`toggle-theme ${soloMie ? "active" : ""}`}
                        >
                            <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista task */}
            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => navigate(`/task/${task.id}`)}
                            className="relative cursor-pointer card-theme hover:bg-gray-50 dark:hover:bg-gray-700 transition-all p-5"
                        >
                            {taskAssegnate.has(task.id) && (
                                <div className="mb-3 flex justify-between items-center">
                                    <div />
                                    <div className="bg-violet-600 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                                        🧠 Assegnata a te
                                    </div>
                                </div>
                            )}


                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Modifica task:", task.id);
                                }}
                                className="absolute bottom-2 right-2 text-sm text-theme hover:text-blue-500"
                                aria-label={`Modifica task ${task.nome}`}
                            >
                                <FontAwesomeIcon icon={faPen} />
                            </button>

                            <h2 className="text-xl font-semibold mb-1">{task.nome}</h2>

                            {task.progetto?.nome && (
                                <p className="text-sm mb-1">
                                    📁 Progetto: <span className="font-medium">{task.progetto.nome}</span>
                                </p>
                            )}

                            {task.consegna && (
                                <p className="text-sm mb-1">
                                    📅 Consegna: <span className="font-medium">{task.consegna}</span>
                                </p>
                            )}

                            {task.tempo_stimato && (
                                <p className="text-sm mb-1">
                                    ⏱️ Tempo stimato: <span className="font-medium">{task.tempo_stimato}</span>
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                {task.stato && (
                                    <span
                                        className="px-3 py-1 rounded-full text-white text-xs font-medium"
                                        style={{ backgroundColor: task.stato.colore || "#6366f1" }}
                                    >
                                        {task.stato.nome}
                                    </span>
                                )}
                                {task.priorita && (
                                    <span className="px-3 py-1 rounded-full text-white bg-green-500 text-xs font-medium">
                                        {task.priorita.nome}
                                    </span>
                                )}
                            </div>

                            {task.note && (
                                <p className="text-xs mt-3 italic line-clamp-3">{task.note}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
