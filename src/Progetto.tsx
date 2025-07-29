import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";

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
    cliente: {
        id: string;
        nome: string;
        email: string | null;
        telefono: string | null;
        avatar_url: string | null;
        note: string | null;
    } | null;
    stato: {
        id: number;
        nome: string;
        colore: string | null;
    } | null;
    priorita: {
        id: number;
        nome: string;
    } | null;
};

export default function ListaProgetti() {
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [progettiConTaskAssegnate, setProgettiConTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [soloMiei, setSoloMiei] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUtenteId(user.id);
        });
    }, []);

    useEffect(() => {
        const caricaProgetti = async () => {
            setLoading(true);
            let progettiIds: string[] = [];

            if (soloMiei && utenteId) {
                const { data: relazioni, error: errRel } = await supabase
                    .from("utenti_progetti")
                    .select("progetto_id")
                    .eq("utente_id", utenteId);

                if (errRel) {
                    console.error("Errore filtro progetti:", errRel);
                    setLoading(false);
                    return;
                }

                progettiIds = relazioni?.map((r) => r.progetto_id) ?? [];
                if (progettiIds.length === 0) {
                    setProgetti([]);
                    setLoading(false);
                    return;
                }
            }

            const query = supabase
                .from("progetti")
                .select(`
          id, cliente_id, nome, note, stato_id, priorita_id, consegna, tempo_stimato,
          created_at, modified_at, deleted_at,
          cliente:cliente_id ( id, nome, email, telefono, avatar_url, note ),
          stato:stato_id ( id, nome, colore ),
          priorita:priorita_id ( id, nome )
        `)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (soloMiei && progettiIds.length > 0) {
                query.in("id", progettiIds);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Errore caricamento progetti:", error);
            } else {
                const progettiPuliti: Progetto[] = data.map((item: any) => ({
                    ...item,
                    cliente: Array.isArray(item.cliente) ? item.cliente[0] ?? null : item.cliente ?? null,
                    stato: Array.isArray(item.stato) ? item.stato[0] ?? null : item.stato ?? null,
                    priorita: Array.isArray(item.priorita) ? item.priorita[0] ?? null : item.priorita ?? null,
                }));
                setProgetti(progettiPuliti);
            }

            setLoading(false);
        };

        const caricaTaskAssegnate = async () => {
            if (!utenteId) return;

            const { data, error } = await supabase
                .from("utenti_task")
                .select("task_id")
                .eq("utente_id", utenteId);

            if (error || !data) return;

            const taskIds = data.map((t) => t.task_id);

            if (taskIds.length === 0) {
                setProgettiConTaskAssegnate(new Set());
                return;
            }

            const { data: progettiTask, error: errProgetti } = await supabase
                .from("progetti_task")
                .select("progetti_id, task_id")
                .in("task_id", taskIds);

            if (errProgetti || !progettiTask) return;

            const progettiIdConTask = progettiTask.map((pt) => pt.progetti_id);
            setProgettiConTaskAssegnate(new Set(progettiIdConTask));
        };

        if (utenteId) {
            caricaProgetti();
            caricaTaskAssegnate();
        }
    }, [soloMiei, utenteId]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6 relative">
                <h1 className="text-3xl font-bold text-center w-full tracking-wide mt-4 mb-4 text-theme">
                    📁 Progetti
                </h1>
                <div className="absolute right-0 flex items-center gap-3">
                    <span className="text-lg font-semibold text-theme">👤 Miei</span>
                    <div
                        onClick={() => setSoloMiei((v) => !v)}
                        className={`toggle-theme ${soloMiei ? "active" : ""}`}
                        title={soloMiei ? "Mostra tutti i progetti" : "Mostra solo assegnati a me"}
                    >
                        <div
                            className={`toggle-thumb ${soloMiei ? "translate" : ""} ${document.documentElement.classList.contains("dark") ? "dark" : ""
                                }`}
                        ></div>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {progetti.map((proj) => (
                        <div
                            key={proj.id}
                            onClick={() => navigate(`/progetti/${proj.id}`)}
                            className="relative cursor-pointer card-theme transition-all p-5 hover-bg-theme"
                        >
                            {progettiConTaskAssegnate.has(proj.id) && (
                                <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                                    Task per te
                                </div>
                            )}

                            <h2 className="text-xl font-semibold text-theme mb-1">{proj.nome}</h2>

                            {proj.cliente?.nome && (
                                <p className="text-sm text-theme mb-1">
                                    👤 Cliente: <span className="font-medium">{proj.cliente.nome}</span>
                                </p>
                            )}

                            {proj.consegna && (
                                <p className="text-sm text-theme mb-1">
                                    📅 Consegna: <span className="font-medium">{proj.consegna}</span>
                                </p>
                            )}

                            {proj.tempo_stimato && (
                                <p className="text-sm text-theme mb-1">
                                    ⏱️ Tempo stimato:{" "}
                                    <span className="font-medium">{proj.tempo_stimato}</span>
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

                            {proj.note && (
                                <p className="text-xs text-theme mt-3 italic line-clamp-3">{proj.note}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
