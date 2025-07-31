import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export type Progetto = {
    id: string;
    cliente_id: string | null;
    nome: string;
    note: string | null;
    stato_id: number | null;
    priorita_id: number | null;
    consegna: string | null;
    tempo_stimato: string | null;
    created_at: string;
    modified_at: string;
    deleted_at: string | null;
    cliente: { id: string; nome: string } | null;
    stato: { id: number; nome: string; colore: string | null } | null;
    priorita: { id: number; nome: string } | null;
};

export default function ListaProgetti() {
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [progettiConTaskAssegnate, setProgettiConTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [utenti, setUtenti] = useState<{ id: string; nome: string }[]>([]);
    const [stati, setStati] = useState<{ id: number; nome: string }[]>([]);
    const [priorita, setPriorita] = useState<{ id: number; nome: string }[]>([]);

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
            const [utentiRes, statiRes, prioritaRes] = await Promise.all([
                supabase.from("utenti").select("id, nome"),
                supabase.from("stati").select("id, nome").is("deleted_at", null),
                supabase.from("priorita").select("id, nome").is("deleted_at", null),
            ]);
            setUtenti(utentiRes.data || []);
            setStati(statiRes.data || []);
            setPriorita(prioritaRes.data || []);
        };

        fetchUtente();
        fetchFiltri();
    }, []);

    useEffect(() => {
        const caricaProgetti = async () => {
            setLoading(true);
            let progettiIds: string[] = [];
            const filtroUtente = soloMie ? utenteId : utenteFilter;

            if (filtroUtente) {
                const { data } = await supabase.from("utenti_progetti").select("progetto_id").eq("utente_id", filtroUtente);
                progettiIds = data?.map((r) => r.progetto_id) || [];
                if (progettiIds.length === 0) {
                    setProgetti([]);
                    setLoading(false);
                    return;
                }
            }

            const query = supabase
                .from("progetti")
                .select(`
                    id, cliente_id, nome, note, stato_id, priorita_id, consegna, tempo_stimato, created_at, modified_at, deleted_at,
                    cliente:cliente_id ( id, nome ), stato:stato_id ( id, nome, colore ), priorita:priorita_id ( id, nome )
                `)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (filtroUtente && progettiIds.length > 0) query.in("id", progettiIds);
            if (statoFilter) query.eq("stato_id", statoFilter);
            if (prioritaFilter) query.eq("priorita_id", prioritaFilter);

            const { data, error } = await query;
            if (!error && data) {
                const progettiPuliti = data.map((item: any) => ({
                    ...item,
                    cliente: Array.isArray(item.cliente) ? item.cliente[0] : item.cliente ?? null,
                    stato: Array.isArray(item.stato) ? item.stato[0] : item.stato ?? null,
                    priorita: Array.isArray(item.priorita) ? item.priorita[0] : item.priorita ?? null,
                }));
                setProgetti(progettiPuliti);
            }

            setLoading(false);
        };

        const caricaTaskAssegnate = async () => {
            if (!utenteId) return;
            const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", utenteId);
            if (!data) return;
            const taskIds = data.map((t) => t.task_id);
            const { data: progettiTask } = await supabase
                .from("progetti_task")
                .select("progetti_id, task_id")
                .in("task_id", taskIds);
            if (progettiTask) {
                const progettiIdConTask = progettiTask.map((pt) => pt.progetti_id);
                setProgettiConTaskAssegnate(new Set(progettiIdConTask));
            }
        };

        if (utenteId) {
            caricaProgetti();
            caricaTaskAssegnate();
        }
    }, [soloMie, utenteFilter, statoFilter, prioritaFilter, utenteId]);

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 mb-6">
                {/* 👤 Toggle mobile */}
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

                {/* Filtri + toggle desktop */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap lg:justify-between lg:items-center gap-4">
                    <div className="w-full flex flex-col gap-4 md:flex-row md:gap-4 md:w-full lg:w-auto">
                        <select
                            className="input-style w-full md:flex-1 lg:w-auto"
                            value={statoFilter || ""}
                            onChange={(e) => setStatoFilter(Number(e.target.value) || null)}
                        >
                            <option value="">📊 Tutti gli stati</option>
                            {stati.map((s) => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>

                        <select
                            className="input-style w-full md:flex-1 lg:w-auto"
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
                                className="input-style w-full md:flex-1 lg:w-auto"
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

            {/* Lista progetti */}
            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                    {progetti.map((proj) => (
                        <div
                            key={proj.id}
                            onClick={() => navigate(`/progetti/${proj.id}`)}
                            className="cursor-pointer card-theme hover:bg-gray-50 dark:hover:bg-gray-700 transition-all p-5"
                        >
                            {progettiConTaskAssegnate.has(proj.id) && (
                                <div className="mb-3 flex justify-between items-center">
                                    <div />
                                    <div className="bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                                        Task per te
                                    </div>
                                </div>
                            )}

                            <h2 className="text-xl font-semibold mb-1">{proj.nome}</h2>
                            {proj.cliente?.nome && (
                                <p className="text-sm mb-1 flex items-center gap-1">
                                    <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-purple-900" />
                                    Cliente: <span className="font-medium">{proj.cliente.nome}</span>
                                </p>
                            )}
                            {proj.consegna && (
                                <p className="text-sm mb-1">
                                    📅 Consegna: <span className="font-medium">{proj.consegna}</span>
                                </p>
                            )}
                            {proj.tempo_stimato && (
                                <p className="text-sm mb-1">
                                    ⏱️ Tempo stimato: <span className="font-medium">{proj.tempo_stimato}</span>
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                {proj.stato && (
                                    <span
                                        className="px-3 py-1 rounded-full text-white text-xs font-medium"
                                        style={{ backgroundColor: proj.stato.colore || "#3b82f6" }}
                                    >
                                        {proj.stato.nome}
                                    </span>
                                )}
                                {proj.priorita && (
                                    <span className="px-3 py-1 rounded-full text-white bg-green-500 text-xs font-medium">
                                        {proj.priorita.nome}
                                    </span>
                                )}
                            </div>
                            {proj.note && <p className="text-xs mt-3 italic line-clamp-3">{proj.note}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
