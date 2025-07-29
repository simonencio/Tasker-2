import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faFlag, faSignal, faCalendarDays, faClock, faXmark,
    faUserPlus, faBuilding
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { inviaNotifica } from "../Notifiche/notificheUtils";

type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };
type Progetto = { id: string; nome: string };
type Utente = { id: string; nome: string; cognome: string };
type PopupType = "stato" | "priorita" | "consegna" | "tempo" | "progetto" | "utente";

type Props = { onClose: () => void; offsetIndex?: number };

export default function MiniTaskCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [statoId, setStatoId] = useState("");
    const [prioritaId, setPrioritaId] = useState("");
    const [consegna, setConsegna] = useState("");
    const [ore, setOre] = useState(0);
    const [minuti, setMinuti] = useState(0);
    const [popupOpen, setPopupOpen] = useState<PopupType | null>(null);
    const [progettoId, setProgettoId] = useState("");
    const [assegnatario, setAssegnatario] = useState<Utente | null>(null);
    const [mostraAvviso, setMostraAvviso] = useState(false);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [partecipanti, setPartecipanti] = useState<Utente[]>([]);
    const [esterni, setEsterni] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from("stati").select("id, nome").is("deleted_at", null),
            supabase.from("priorita").select("id, nome").is("deleted_at", null),
            supabase.from("progetti").select("id, nome").is("deleted_at", null),
            supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
        ]).then(([s, p, pr, u]) => {
            if (s.data) setStati(s.data);
            if (p.data) setPriorita(p.data);
            if (pr.data) setProgetti(pr.data);
            if (u.data) setUtenti(u.data);
        });
    }, []);

    useEffect(() => {
        if (!progettoId) return;
        supabase
            .from("utenti_progetti")
            .select("utente_id")
            .eq("progetto_id", progettoId)
            .then(({ data }) => {
                const ids = data?.map((m) => m.utente_id) || [];
                setPartecipanti(utenti.filter((u) => ids.includes(u.id)));
                setEsterni(utenti.filter((u) => !ids.includes(u.id)));
                if (assegnatario) setMostraAvviso(!ids.includes(assegnatario.id));
            });
    }, [progettoId, utenti, assegnatario]);

    const reset = () => {
        setNome(""); setNote(""); setStatoId(""); setPrioritaId(""); setConsegna("");
        setOre(0); setMinuti(0); setPopupOpen(null);
        setProgettoId(""); setAssegnatario(null); setMostraAvviso(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null); setLoading(true);
        const { data: userInfo } = await supabase.auth.getUser();
        const tempo = ore || minuti ? `${ore} hours ${minuti} minutes` : null;
        const { data: createdTask, error } = await supabase.from("tasks").insert({
            nome, note: note || null, stato_id: statoId ? +statoId : null,
            priorita_id: prioritaId ? +prioritaId : null, consegna: consegna || null, tempo_stimato: tempo
        }).select().single();

        if (error || !createdTask) {
            setErrore(error?.message || "Errore creazione task");
            setLoading(false);
            return setTimeout(() => setErrore(null), 3000);
        }

        const taskId = createdTask.id, azioni = [];
        if (progettoId)
            azioni.push(supabase.from("progetti_task").insert({ task_id: taskId, progetti_id: progettoId }));

        if (assegnatario) {
            if (progettoId) {
                const { data: esiste } = await supabase.from("utenti_progetti").select("id")
                    .eq("utente_id", assegnatario.id).eq("progetto_id", progettoId).maybeSingle();
                if (!esiste) {
                    azioni.push(supabase.from("utenti_progetti").insert({ utente_id: assegnatario.id, progetto_id: progettoId }));
                    inviaNotifica("PROGETTO_ASSEGNATO", [assegnatario.id],
                        `Sei stato assegnato al progetto contenente la nuova attività: ${nome}`, userInfo.user?.id, { progetto_id: progettoId });
                }
            }
            azioni.push(supabase.from("utenti_task").insert({ utente_id: assegnatario.id, task_id: taskId }));
            inviaNotifica("TASK_ASSEGNATO", [assegnatario.id], `Ti è stata assegnata una nuova attività: ${nome}`,
                userInfo.user?.id, { progetto_id: progettoId || undefined, task_id: taskId });
        }

        await Promise.all(azioni);
        setLoading(false); setSuccess(true); reset();
        setTimeout(() => setSuccess(false), 3000);
    };

    const IconButton = ({ icon, popup, color, activeColor }: any) => (
        <button
            key={popup} title={popup} type="button"
            className={`${popupOpen === popup ? activeColor : color}`}
            onClick={() => setPopupOpen(popupOpen === popup ? null : popup)}
        >
            <FontAwesomeIcon icon={icon} />
        </button>
    );

    return (
        <div
            className="fixed bottom-6 transition-all duration-300 w-[400px] rounded-xl shadow-xl p-5 modal-container"
            style={{
                left: `${offsetIndex * 420 + 24}px`,
                zIndex: 100 + offsetIndex,
            }}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-red-600 text-2xl"
                title="Chiudi"
            >
                <FontAwesomeIcon icon={faXmark} className="icon-color" />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center text-theme">Crea Nuova Attività</h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme">Nome *</label>
                    <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="w-full border rounded px-3 py-2 input-style"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme">Note</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full border rounded px-3 py-2 resize-none input-style"
                    />
                </div>

                {popupOpen && (
                    <div className="absolute bottom-10 left-0 rounded p-4 z-50 w-1/2 popup-panel">
                        <div className="flex justify-between items-center mb-2">
                            <strong className="capitalize">{popupOpen}</strong>
                            <FontAwesomeIcon icon={faXmark} className="cursor-pointer icon-color" onClick={() => setPopupOpen(null)} />
                        </div>

                        {popupOpen === "stato" && (
                            <select value={statoId} onChange={(e) => setStatoId(e.target.value)} className="w-full border rounded px-2 py-1 input-style">
                                <option value="">-- seleziona --</option>
                                {stati.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                        )}

                        {popupOpen === "priorita" && (
                            <select value={prioritaId} onChange={(e) => setPrioritaId(e.target.value)} className="w-full border rounded px-2 py-1 input-style">
                                <option value="">-- seleziona --</option>
                                {priorita.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        )}

                        {popupOpen === "consegna" && (
                            <input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} className="w-full border rounded px-2 py-1 input-style" />
                        )}

                        {popupOpen === "tempo" && (
                            <div className="flex gap-2">
                                <select value={ore} onChange={(e) => setOre(+e.target.value)} className="w-1/2 border rounded px-2 py-1 text-sm h-8 hide-scrollbar input-style">
                                    {[...Array(25).keys()].map((h) => <option key={h} value={h}>{h}h</option>)}
                                </select>
                                <select value={minuti} onChange={(e) => setMinuti(+e.target.value)} className="w-1/2 border rounded px-2 py-1 text-sm h-8 hide-scrollbar input-style">
                                    {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m}min</option>)}
                                </select>
                            </div>
                        )}

                        {popupOpen === "progetto" && (
                            <div className="max-h-[200px] overflow-y-auto hide-scrollbar space-y-1">
                                {progetti.map(p => (
                                    <div
                                        key={p.id}
                                        className={`p-2 cursor-pointer rounded border ${progettoId === p.id ? "bg-cyan-100 border-cyan-400 font-semibold" : "hover:bg-theme border-transparent"}`}
                                        onClick={() => {
                                            setProgettoId(p.id);
                                            if (assegnatario) setMostraAvviso(!partecipanti.some(u => u.id === assegnatario.id));
                                            setPopupOpen(null);
                                        }}
                                    >
                                        {p.nome}
                                    </div>
                                ))}
                            </div>
                        )}

                        {popupOpen === "utente" && (
                            <div className="max-h-[200px] overflow-y-auto space-y-1 hide-scrollbar">
                                {(progettoId ? [...partecipanti, ...esterni] : utenti).map(u => (
                                    <div
                                        key={u.id}
                                        className={`p-2 cursor-pointer rounded border ${assegnatario?.id === u.id ? "bg-green-100 border-green-400 font-semibold" : "hover:bg-theme border-transparent"}`}
                                        onClick={() => {
                                            setAssegnatario(u);
                                            if (progettoId) setMostraAvviso(!partecipanti.some(p => p.id === u.id));
                                            setPopupOpen(null);
                                        }}
                                    >
                                        {u.nome} {u.cognome}
                                        {esterni.includes(u) && <span className="text-xs text-gray-400"> (non partecipa)</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="relative h-4 mb-2">
                    {mostraAvviso && <div className="absolute w-full text-yellow-600 text-xs text-center">⚠️ L’utente selezionato non è membro del progetto. Sarà aggiunto automaticamente.</div>}
                    {errore && <div className="absolute w-full text-red-600 text-sm text-center">{errore}</div>}
                    {success && <div className="absolute w-full text-green-600 text-sm text-center">✅ Attività creata</div>}
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div className="flex gap-4 text-lg">
                        {[
                            { icon: faFlag, popup: "stato", color: "text-red-400", activeColor: "text-red-600" },
                            { icon: faSignal, popup: "priorita", color: "text-yellow-400", activeColor: "text-yellow-600" },
                            { icon: faCalendarDays, popup: "consegna", color: "text-blue-400", activeColor: "text-blue-600" },
                            { icon: faClock, popup: "tempo", color: "text-purple-400", activeColor: "text-purple-600" },
                            { icon: faBuilding, popup: "progetto", color: "text-cyan-400", activeColor: "text-cyan-600" },
                            { icon: faUserPlus, popup: "utente", color: "text-green-400", activeColor: "text-green-600" },
                        ].map(IconButton)}
                    </div>
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        {loading ? "Salvataggio..." : "Crea Attività"}
                    </button>
                </div>
            </form>
        </div>
    );

}
