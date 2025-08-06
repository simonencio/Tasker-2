import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faProjectDiagram, faUser } from "@fortawesome/free-solid-svg-icons";
import MiniProjectEditorModal from "../Modifica/MiniProjectEditorModal";

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

type TaskBreve = {
    id: string;
    nome: string;
    consegna: string | null;
    assegnatari: { id: string; nome: string; cognome: string | null }[];
};


export default function ListaProgetti() {
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [taskPerProgetto, setTaskPerProgetto] = useState<Record<string, TaskBreve[]>>({});
    const [progettiConTaskAssegnate, setProgettiConTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [progettoDaModificareId, setProgettoDaModificareId] = useState<string | null>(null);
    const [progettoEspansoId, setProgettoEspansoId] = useState<string | null>(null);

    const [utenti, setUtenti] = useState<{ id: string; nome: string }[]>([]);
    const [stati, setStati] = useState<{ id: number; nome: string }[]>([]);
    const [priorita, setPriorita] = useState<{ id: number; nome: string }[]>([]);
    const [utenteFilter, setUtenteFilter] = useState<string | null>(null);
    const [statoFilter, setStatoFilter] = useState<number | null>(null);
    const [prioritaFilter, setPrioritaFilter] = useState<number | null>(null);

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
                    setTaskPerProgetto({});
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

            const { data } = await query;
            if (data) {
                const progettiPuliti = data.map((item: any) => ({
                    ...item,
                    cliente: Array.isArray(item.cliente) ? item.cliente[0] : item.cliente ?? null,
                    stato: Array.isArray(item.stato) ? item.stato[0] : item.stato ?? null,
                    priorita: Array.isArray(item.priorita) ? item.priorita[0] : item.priorita ?? null,
                }));
                setProgetti(progettiPuliti);
                await caricaTaskPerProgetto(progettiPuliti.map(p => p.id));
            }

            setLoading(false);
        };

        const caricaTaskPerProgetto = async (progettiIds: string[]) => {
            // 1. Carico la mappatura progetto_id → task_id
            const { data: mappaPT } = await supabase
                .from("progetti_task")
                .select("progetti_id, task_id")
                .in("progetti_id", progettiIds);

            if (!mappaPT || mappaPT.length === 0) {
                setTaskPerProgetto({});
                return;
            }

            // 2. Ottengo tutti i task_id
            const taskIds = mappaPT.map(r => r.task_id);

            // 3. Query dettagliata dei task con assegnatari
            const { data: taskDettagli } = await supabase
                .from("tasks")
                .select(`
      id,
      nome,
      consegna,
      utenti_task (
        utenti (
          id,
          nome,
          cognome
        )
      )
    `)
                .in("id", taskIds);

            // 4. Creo la mappa finale: progetto_id → TaskBreve[]
            const mappa: Record<string, TaskBreve[]> = {};
            for (const { progetti_id, task_id } of mappaPT) {
                const task = taskDettagli?.find(t => t.id === task_id);
                if (!task) continue;

                const assegnatari = (task.utenti_task || []).map((r: any) => r.utenti);
                const voce: TaskBreve = {
                    id: task.id,
                    nome: task.nome,
                    consegna: task.consegna,
                    assegnatari,
                };

                if (!mappa[progetti_id]) mappa[progetti_id] = [];
                mappa[progetti_id].push(voce);
            }

            setTaskPerProgetto(mappa);
        };


        const caricaTaskAssegnate = async () => {
            if (!utenteId) return;
            const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", utenteId);
            const taskIds = data?.map(t => t.task_id) || [];
            const { data: progettiTask } = await supabase
                .from("progetti_task")
                .select("progetti_id, task_id")
                .in("task_id", taskIds);
            if (progettiTask) {
                const progettiIdConTask = progettiTask.map(pt => pt.progetti_id);
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
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme">
                    <FontAwesomeIcon icon={faProjectDiagram} className="text-blue-500 mr-2" />
                    Lista Progetti
                </h1>
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUser} className="w-5 h-5 icon-color" />
                    <span className="text-theme font-medium">Mie</span>
                    <div onClick={() => setSoloMie(v => !v)} className={`toggle-theme ${soloMie ? "active" : ""}`}>
                        <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                    </div>
                </div>
            </div>

            {/* Filtri */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                <select className="input-style w-full" value={statoFilter || ""} onChange={(e) => setStatoFilter(Number(e.target.value) || null)}>
                    <option value="">📊 Tutti gli stati</option>
                    {stati.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <select className="input-style w-full" value={prioritaFilter || ""} onChange={(e) => setPrioritaFilter(Number(e.target.value) || null)}>
                    <option value="">⏫ Tutte le priorità</option>
                    {priorita.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                {isAdmin && !soloMie && (
                    <select className="input-style w-full" value={utenteFilter || ""} onChange={(e) => setUtenteFilter(e.target.value || null)}>
                        <option value="">🧑‍💼 Tutti gli utenti</option>
                        {utenti.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                )}
            </div>

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme">
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        <div className="flex-1">Nome</div>
                        <div className="w-40">Consegna</div>
                        <div className="w-32">Stato</div>
                        <div className="w-32">Priorità</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>

                    {progetti.map(proj => {
                        const isAssegnato = progettiConTaskAssegnate.has(proj.id);
                        const isOpen = progettoEspansoId === proj.id;
                        return (
                            <div key={proj.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                                <div className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer" onClick={() => setProgettoEspansoId(isOpen ? null : proj.id)}>
                                    <div className="flex-1 font-medium flex items-center gap-2">
                                        {isAssegnato && (
                                            <span className="text-xs text-white bg-orange-500 px-2 py-1 rounded shadow">🧠</span>
                                        )}
                                        {proj.nome}
                                    </div>
                                    <div className="hidden lg:block w-40">{proj.consegna ?? "—"}</div>
                                    <div className="hidden lg:block w-32">{proj.stato?.nome ?? "—"}</div>
                                    <div className="hidden lg:block w-32">{proj.priorita?.nome ?? "—"}</div>
                                    <div className="w-20 flex justify-end items-center gap-3">
                                        <button onClick={(e) => { e.stopPropagation(); setProgettoDaModificareId(proj.id); }} className="icon-color hover:text-blue-600" title="Modifica">
                                            <FontAwesomeIcon icon={faPen} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setProgettoEspansoId(isOpen ? null : proj.id); }} className="text-theme text-xl font-bold">
                                            {isOpen ? "−" : "+"}
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-1">
                                        {/* Campi visibili solo su viewport < lg */}
                                        <div className="block lg:hidden space-y-1">
                                            <p>📅 Consegna: {proj.consegna ?? "—"}</p>
                                            <p>📊 Stato: {proj.stato?.nome ?? "—"}</p>
                                            <p>⏫ Priorità: {proj.priorita?.nome ?? "—"}</p>
                                        </div>

                                        {/* Dettagli sempre visibili */}
                                        {proj.cliente?.nome && <p>👤 Cliente: {proj.cliente.nome}</p>}
                                        {proj.tempo_stimato && <p>⏱️ Tempo stimato: {proj.tempo_stimato}</p>}
                                        {proj.note && <p className="whitespace-pre-line">🗒️ {proj.note}</p>}

                                        <div className="pt-2">
                                            <p className="font-semibold mb-1">📌 Task assegnate:</p>
                                            <ul className="list-disc ml-5 space-y-1">
                                                {(taskPerProgetto[proj.id] ?? []).map(t => {
                                                    const utenti = t.assegnatari.map(u => `${u.nome} ${u.cognome ?? ""}`).join(", ");
                                                    return (
                                                        <li key={t.id}>
                                                            📝 {t.nome} | {utenti || "—"} | {t.consegna ? new Date(t.consegna).toLocaleDateString() : "—"}
                                                        </li>
                                                    );
                                                })}
                                                {(taskPerProgetto[proj.id] ?? []).length === 0 && (
                                                    <li className="italic text-gray-500">Nessuna task assegnata</li>
                                                )}
                                            </ul>


                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            )}

            {progettoDaModificareId && (
                <MiniProjectEditorModal
                    progettoId={progettoDaModificareId}
                    onClose={() => setProgettoDaModificareId(null)}
                />
            )}
        </div>
    );
}
