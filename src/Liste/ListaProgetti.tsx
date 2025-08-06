
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faPen, faProjectDiagram } from "@fortawesome/free-solid-svg-icons";
import MiniProjectEditorModal from "../Modifica/MiniProjectEditorModal";
import FiltriProgettoAvanzati, { ordinaProgettiClientSide, type FiltroAvanzatoProgetto } from "../supporto/FiltriProgettoAvanzati";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";

type Utente = { id: string; nome: string; cognome: string | null };
type Cliente = { id: string; nome: string };
type Stato = { id: number; nome: string; colore: string | null };
type Priorita = { id: number; nome: string };

export type Progetto = {
    id: string;
    nome: string;
    consegna: string | null;
    stato: Stato | null;
    priorita: Priorita | null;
    cliente: Cliente | null;
    membri: Utente[];
    note?: string | null; // ✅ aggiungi questa riga
};


type TaskBreve = {
    id: string;
    nome: string;
    consegna: string | null;
    assegnatari: Utente[];
};

export default function ListaProgetti() {
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [, setProgettiConTaskAssegnate] = useState<Set<string>>(new Set());
    const [taskPerProgetto, setTaskPerProgetto] = useState<Record<string, TaskBreve[]>>({});
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [, setIsAdmin] = useState(false);
    const [progettiCompletati, setProgettiCompletati] = useState<Set<string>>(new Set());
    const [soloCompletati, setSoloCompletati] = useState(false);

    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzatoProgetto>({
        membri: [],
        cliente: null,
        stato: null,
        priorita: null,
        dataInizio: null,
        dataFine: null,
        ordine: null,
    });
    const [progettoEspansoId, setProgettoEspansoId] = useState<string | null>(null);
    const [progettoDaModificareId, setProgettoDaModificareId] = useState<string | null>(null);

    const navigate = useNavigate();


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
        const caricaDati = async () => {
            setLoading(true);
            let idsProgetti: string[] = [];

            if (soloMie && utenteId) {
                const { data } = await supabase.from("utenti_progetti").select("progetto_id").eq("utente_id", utenteId);
                idsProgetti = data?.map(r => r.progetto_id) || [];
                if (idsProgetti.length === 0) {
                    setProgetti([]);
                    setTaskPerProgetto({});
                    setLoading(false);
                    return;
                }
            }

            const query = supabase
                .from("progetti")
                .select(`
      id, nome, consegna, note,
      stato:stato_id ( id, nome, colore ),
      priorita:priorita_id ( id, nome ),
      cliente:cliente_id ( id, nome )
  `)

                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (soloMie && idsProgetti.length > 0) query.in("id", idsProgetti);

            const { data: progettiRaw } = await query;
            if (!progettiRaw) return;

            const { data: utentiProgetti } = await supabase
                .from("utenti_progetti")
                .select("progetto_id, utenti:utente_id ( id, nome, cognome )");

            const membriPerProgetto: Record<string, Utente[]> = {};
            utentiProgetti?.forEach(({ progetto_id, utenti }) => {
                if (!membriPerProgetto[progetto_id]) membriPerProgetto[progetto_id] = [];
                membriPerProgetto[progetto_id].push(utenti as unknown as Utente);

            });


            const progettiConMembri: Progetto[] = progettiRaw.map((p: any) => ({
                id: p.id,
                nome: p.nome,
                consegna: p.consegna,
                note: p.note, // ✅ qui
                stato: Array.isArray(p.stato) ? p.stato[0] : p.stato,
                priorita: Array.isArray(p.priorita) ? p.priorita[0] : p.priorita,
                cliente: Array.isArray(p.cliente) ? p.cliente[0] : p.cliente,
                membri: membriPerProgetto[p.id] || [],
            }));


            setProgetti(progettiConMembri);
            await caricaTaskPerProgetto(progettiConMembri.map(p => p.id));
            setLoading(false);
        };

        const caricaTaskPerProgetto = async (ids: string[]) => {
            const { data: mappa } = await supabase.from("progetti_task").select("progetti_id, task_id").in("progetti_id", ids);
            if (!mappa) return;

            const taskIds = mappa.map(r => r.task_id);
            const { data: taskDettagli } = await supabase
                .from("tasks")

                .select("id, nome, consegna, fine_task, utenti_task ( utenti ( id, nome, cognome ) )")
                .in("id", taskIds)
                .is("deleted_at", null);

            const taskMap: Record<string, TaskBreve[]> = {};
            const completati: Set<string> = new Set();

            for (const id of ids) {
                const taskIdsPerProgetto = mappa.filter(m => m.progetti_id === id).map(m => m.task_id);
                const tasksPerProgetto = taskDettagli?.filter(t => taskIdsPerProgetto.includes(t.id)) || [];

                const tutteCompletate = tasksPerProgetto.length > 0 && tasksPerProgetto.every(t => t.fine_task !== null);
                if (tutteCompletate) completati.add(id);

                for (const task of tasksPerProgetto) {
                    const assegnatari = (task.utenti_task || []).map((ut: any) => ut.utenti);
                    const voce: TaskBreve = { id: task.id, nome: task.nome, consegna: task.consegna, assegnatari };
                    if (!taskMap[id]) taskMap[id] = [];
                    taskMap[id].push(voce);
                }

            }

            setTaskPerProgetto(taskMap);
            setProgettiCompletati(completati);
        };


        const caricaProgettiConTaskAssegnate = async () => {
            if (!utenteId) return;
            const { data: taskUtente } = await supabase.from("utenti_task").select("task_id").eq("utente_id", utenteId);
            const taskIds = taskUtente?.map(t => t.task_id) || [];
            const { data: mapping } = await supabase.from("progetti_task").select("progetti_id, task_id").in("task_id", taskIds);
            if (!mapping) return;
            const progettiConTask = new Set(mapping.map(m => m.progetti_id));
            setProgettiConTaskAssegnate(progettiConTask);
        };

        if (utenteId) {
            caricaDati();
            caricaProgettiConTaskAssegnate();
        }
    }, [utenteId, soloMie]);

    const progettiFiltrati = useMemo(() => {
        const filtrati = progetti.filter(p => {
            if (filtroAvanzato.membri.length > 0) {
                const membriIds = p.membri.map(m => m.id);
                if (!filtroAvanzato.membri.every(id => membriIds.includes(id))) return false;
            }
            if (filtroAvanzato.cliente && p.cliente?.id !== filtroAvanzato.cliente) return false;
            if (filtroAvanzato.stato && p.stato?.id !== filtroAvanzato.stato) return false;
            if (filtroAvanzato.priorita && p.priorita?.id !== filtroAvanzato.priorita) return false;
            if (filtroAvanzato.dataInizio || filtroAvanzato.dataFine) {
                const data = p.consegna ? new Date(p.consegna) : null;
                if (!data) return false;
                if (filtroAvanzato.dataInizio && data < new Date(filtroAvanzato.dataInizio)) return false;
                if (filtroAvanzato.dataFine && data > new Date(filtroAvanzato.dataFine)) return false;
            }
            if (soloCompletati && !progettiCompletati.has(p.id)) return false;
            return true;
        });

        return ordinaProgettiClientSide(filtrati, filtroAvanzato.ordine);
    }, [progetti, filtroAvanzato, soloCompletati, progettiCompletati]);

    return (
        <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme">
                    <FontAwesomeIcon icon={faProjectDiagram} className="text-blue-500 mr-2" />
                    Lista Progetti
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Toggle Mie */}
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faLink} className="w-5 h-5 text-blue-600" />
                        <span className="text-theme font-medium">Mie</span>
                        <div onClick={() => setSoloMie(v => !v)} className={`toggle-theme ${soloMie ? "active" : ""}`}>
                            <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                        </div>
                    </div>
                    {/* Toggle Completati */}
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                        <span className="text-theme font-medium">Completati</span>
                        <div onClick={() => setSoloCompletati(v => !v)} className={`toggle-theme ${soloCompletati ? "active" : ""}`}>
                            <div className={`toggle-thumb ${soloCompletati ? "translate" : ""}`} />
                        </div>
                    </div>
                </div>

            </div>

            <FiltriProgettoAvanzati progetti={progetti} onChange={setFiltroAvanzato} />

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme">
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        <div className="w-10 shrink-0" /> {/* spazio per le icone */}
                        <div className="flex-1">Nome</div>

                        <div className="w-40">Consegna</div>
                        <div className="w-32">Stato</div>
                        <div className="w-32">Priorità</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>

                    {progettiFiltrati.map(proj => {
                        const isMembro = proj.membri.some(m => m.id === utenteId);
                        const isOpen = progettoEspansoId === proj.id;
                        return (
                            <div key={proj.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                                <div className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer" onClick={() => setProgettoEspansoId(isOpen ? null : proj.id)}>
                                    <div className="w-8 shrink-0 flex justify-start items-center">
                                        <div className="flex flex-col items-center gap-1">

                                            {isMembro && (
                                                <FontAwesomeIcon
                                                    icon={faLink}
                                                    className="w-4 h-4 text-blue-600"
                                                    title="Sei membro di questo progetto"
                                                />
                                            )}
                                            {progettiCompletati.has(proj.id) && (
                                                <FontAwesomeIcon
                                                    icon={faCheckCircle}
                                                    className="w-4 h-4 text-green-600"
                                                    title="Progetto completato"
                                                />
                                            )}

                                        </div>
                                    </div>
                                    <div className="flex-1 font-medium truncate">{proj.nome}</div>


                                    <div className="hidden lg:block w-40">{proj.consegna ?? "—"}</div>
                                    <div className="hidden lg:block w-32">{proj.stato?.nome ?? "—"}</div>
                                    <div className="hidden lg:block w-32">{proj.priorita?.nome ?? "—"}</div>
                                    <div className="w-20 flex justify-end items-center gap-3">
                                        <button onClick={(e) => { e.stopPropagation(); setProgettoDaModificareId(proj.id); }} className="icon-color hover:text-blue-600" title="Modifica">
                                            <FontAwesomeIcon icon={faPen} />
                                        </button>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/progetti/${proj.id}`); }}
                                            className="icon-color hover:text-green-600"
                                            title="Vai al dettaglio"
                                        >
                                            <FontAwesomeIcon icon={faProjectDiagram} />
                                        </button>

                                        <button onClick={(e) => { e.stopPropagation(); setProgettoEspansoId(isOpen ? null : proj.id); }} className="text-theme text-xl font-bold">
                                            {isOpen ? "−" : "+"}
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-1">
                                        <div className="block lg:hidden space-y-1">
                                            <p>📅 Consegna: {proj.consegna ?? "—"}</p>
                                            <p>📊 Stato: {proj.stato?.nome ?? "—"}</p>
                                            <p>⏫ Priorità: {proj.priorita?.nome ?? "—"}</p>
                                        </div>
                                        {proj.cliente?.nome && <p>👤 Cliente: {proj.cliente.nome}</p>}
                                        {proj.membri.length > 0 && <p>👥 Membri: {proj.membri.map(m => `${m.nome} ${m.cognome ?? ""}`).join(", ")}</p>}
                                        {proj.note && <p>🗒️ Note: {proj.note}</p>}
                                        <div className="pt-2">
                                            <p className="font-semibold mb-1">📌 Task assegnate:</p>
                                            <ul className="list-disc ml-5 space-y-1">
                                                {(taskPerProgetto[proj.id] ?? []).map(t => {
                                                    const utenti = t.assegnatari.map(u => `${u.nome} ${u.cognome ?? ""}`).join(", ");
                                                    return (
                                                        <li key={t.id}>📝 {t.nome} | {utenti || "—"} | {t.consegna ? new Date(t.consegna).toLocaleDateString() : "—"}</li>
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
                <MiniProjectEditorModal progettoId={progettoDaModificareId} onClose={() => setProgettoDaModificareId(null)} />
            )}
        </div>
    );
}
