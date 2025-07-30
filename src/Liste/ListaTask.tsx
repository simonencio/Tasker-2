// ✅ VERSIONE COMPLETA CON FIX ADMIN: controlla ruolo numerico === 1 per mostrare filtro utente
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";

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

type Props = {
    sidebarSinistraAperta: boolean;
    notificheSidebarAperta: boolean;
};

export default function ListaTask({ sidebarSinistraAperta, notificheSidebarAperta }: Props) {
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
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) return;
            setUtenteId(user.id);

            const { data: ruoloData, error: ruoloError } = await supabase
                .from("utenti")
                .select("ruolo")
                .eq("id", user.id)
                .single();

            if (!ruoloError && ruoloData?.ruolo !== null) {
                const ruoloId = Number(ruoloData.ruolo);
                if (ruoloId === 1) setIsAdmin(true);
            }
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
                const { data, error } = await supabase
                    .from("utenti_task")
                    .select("task_id")
                    .eq("utente_id", idFiltro);

                if (error || !data || data.length === 0) {
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

            const { data, error } = await query;
            if (!error && data) {
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
            const { data, error } = await supabase
                .from("utenti_task")
                .select("task_id")
                .eq("utente_id", utenteId);
            if (!error && data) setTaskAssegnate(new Set(data.map((t) => t.task_id)));
        };

        if (utenteId) {
            caricaTasks();
            caricaTaskAssegnate();
        }
    }, [soloMie, utenteFilter, statoFilter, prioritaFilter, progettoFilter, utenteId]);

    const getGridCols = () => {
        const count = Number(sidebarSinistraAperta) + Number(notificheSidebarAperta);
        if (count === 2) return "xl:grid-cols-2";
        if (count === 1) return "xl:grid-cols-3";
        return "xl:grid-cols-4";
    };

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between mb-6 gap-4 flex-wrap items-start">
                <div className="flex flex-wrap gap-3 items-center">
                    <select
                        className="input-style min-w-[180px]"
                        value={progettoFilter || ""}
                        onChange={(e) => setProgettoFilter(e.target.value || null)}
                    >
                        <option value="">📁 Tutti i progetti</option>
                        {progetti.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                    </select>

                    {isAdmin && !soloMie && (
                        <select
                            className="input-style min-w-[180px]"
                            value={utenteFilter || ""}
                            onChange={(e) => setUtenteFilter(e.target.value || null)}
                        >
                            <option value="">🧑‍💼 Tutti gli utenti</option>
                            {utenti.map((u) => (
                                <option key={u.id} value={u.id}>{u.nome}</option>
                            ))}
                        </select>
                    )}

                    <select
                        className="input-style min-w-[180px]"
                        value={statoFilter || ""}
                        onChange={(e) => setStatoFilter(Number(e.target.value) || null)}
                    >
                        <option value="">📊 Tutti gli stati</option>
                        {stati.map((s) => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>

                    <select
                        className="input-style min-w-[180px]"
                        value={prioritaFilter || ""}
                        onChange={(e) => setPrioritaFilter(Number(e.target.value) || null)}
                    >
                        <option value="">⏫ Tutte le priorità</option>
                        {priorita.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3 pl-1">
                    <span className="text-theme font-medium text-base">👤 Mie</span>
                    <div
                        onClick={() => setSoloMie((v) => !v)}
                        className={`toggle-theme ${soloMie ? "active" : ""}`}
                    >
                        <div
                            className={`toggle-thumb ${soloMie ? "translate" : ""} ${document.documentElement.classList.contains("dark") ? "dark" : ""}`}
                        ></div>
                    </div>
                </div>
            </div>


            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 ${getGridCols()}`}>
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => navigate(`/task/${task.id}`)}
                            className="relative cursor-pointer card-theme transition-all p-5 hover-bg-theme"
                        >
                            {taskAssegnate.has(task.id) && (
                                <div className="absolute top-2 right-2 bg-violet-600 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                                    🧠 Assegnata a te
                                </div>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Modifica task:", task.id);
                                }}
                                className="absolute bottom-2 right-2 text-sm text-theme hover:text-blue-500"
                            >
                                <FontAwesomeIcon icon={faPen} />
                            </button>

                            <h2 className="text-xl font-semibold text-theme mb-1">{task.nome}</h2>

                            {task.progetto?.nome && (
                                <p className="text-sm text-theme mb-1">
                                    📁 Progetto: <span className="font-medium">{task.progetto.nome}</span>
                                </p>
                            )}

                            {task.consegna && (
                                <p className="text-sm text-theme mb-1">
                                    📅 Consegna: <span className="font-medium">{task.consegna}</span>
                                </p>
                            )}

                            {task.tempo_stimato && (
                                <p className="text-sm text-theme mb-1">
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
                                <p className="text-xs text-theme mt-3 italic line-clamp-3">{task.note}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
