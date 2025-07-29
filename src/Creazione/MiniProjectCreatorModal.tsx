import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faUserPlus, faBuilding, faFlag, faSignal, faCalendarDays, faClock, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import type { Cliente, Utente, Stato, Priorita, PopupType, MiniProjectModalProps } from "../supporto/types";

type Props = MiniProjectModalProps & { offsetIndex?: number };

export default function MiniProjectCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [utentiSelezionati, setUtentiSelezionati] = useState<Utente[]>([]);
    const [statoId, setStatoId] = useState("");
    const [prioritaId, setPrioritaId] = useState("");
    const [consegna, setConsegna] = useState("");
    const [ore, setOre] = useState(0);
    const [minuti, setMinuti] = useState(0);
    const [popupOpen, setPopupOpen] = useState<PopupType | null>(null);
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from("clienti").select("id,nome").is("deleted_at", null),
            supabase.from("utenti").select("id,nome,cognome").is("deleted_at", null),
            supabase.from("stati").select("id,nome").is("deleted_at", null),
            supabase.from("priorita").select("id,nome").is("deleted_at", null),
        ]).then(([cl, u, s, p]) => {
            if (cl.data) setClienti(cl.data);
            if (u.data) setUtenti(u.data);
            if (s.data) setStati(s.data);
            if (p.data) setPriorita(p.data);
        });
    }, []);

    const resetForm = () => {
        setNome(""); setNote(""); setClienteId(null);
        setUtentiSelezionati([]); setStatoId("");
        setPrioritaId(""); setConsegna("");
        setOre(0); setMinuti(0); setPopupOpen(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null); setSuccess(false); setLoading(true);

        if (!nome.trim()) {
            setErrore("Il nome del progetto è obbligatorio.");
            setLoading(false);
            return;
        }

        const tempo_stimato = ore || minuti ? `${ore} hours ${minuti} minutes` : null;
        const user = await supabase.auth.getUser();

        const { data: created, error } = await supabase
            .from("progetti")
            .insert({
                nome, note: note || null, cliente_id: clienteId,
                stato_id: statoId ? +statoId : null,
                priorita_id: prioritaId ? +prioritaId : null,
                consegna: consegna || null,
                tempo_stimato,
            })
            .select()
            .single();

        if (error || !created) {
            setErrore(error?.message || "Errore");
            setLoading(false);
            setTimeout(() => setErrore(null), 3000);
            return;
        }

        const progettoId = created.id;
        for (const u of utentiSelezionati) {
            await supabase.from("utenti_progetti").insert({ progetto_id: progettoId, utente_id: u.id });
            await inviaNotifica("PROGETTO_ASSEGNATO", [u.id], `Sei stato assegnato al nuovo progetto: ${nome}`, user.data?.user?.id, { progetto_id: progettoId });
        }

        setSuccess(true);
        resetForm();
        setLoading(false);
        setTimeout(() => {
            setSuccess(false);
            onClose();
        }, 3000);
    };

    const renderPopupContent = () => {
        if (!popupOpen) return null;
        const base = "w-full border rounded px-2 py-1 input-style";

        const popup = {
            cliente: (
                <select value={clienteId ?? ""} onChange={(e) => setClienteId(e.target.value || null)} className={base}>
                    <option value="">-- nessuno --</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
            ),
            utenti: (
                <div className="space-y-1 max-h-[180px] overflow-y-auto hide-scrollbar">
                    {utenti.map(u => {
                        const selected = utentiSelezionati.some(s => s.id === u.id);
                        return (
                            <div key={u.id} onClick={() => setUtentiSelezionati(prev => selected ? prev.filter(s => s.id !== u.id) : [...prev, u])}
                                className={`cursor-pointer px-2 py-1 rounded ${selected ? "bg-blue-100 font-semibold" : "hover:bg-theme"}`}>
                                {u.nome} {u.cognome}
                            </div>
                        );
                    })}
                </div>
            ),
            stato: (
                <select value={statoId} onChange={(e) => setStatoId(e.target.value)} className={base}>
                    <option value="">-- seleziona --</option>
                    {stati.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
            ),
            priorita: (
                <select value={prioritaId} onChange={(e) => setPrioritaId(e.target.value)} className={base}>
                    <option value="">-- seleziona --</option>
                    {priorita.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
            ),
            consegna: <input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} className={base} />,
            tempo: (
                <div className="flex gap-2">
                    <select value={ore} onChange={(e) => setOre(+e.target.value)} className="w-1/2 border rounded px-2 py-1 input-style">
                        {[...Array(25).keys()].map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                    <select value={minuti} onChange={(e) => setMinuti(+e.target.value)} className="w-1/2 border rounded px-2 py-1 input-style">
                        {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}min</option>)}
                    </select>
                </div>
            ),
        };

        return (
            <div className="absolute bottom-10 left-0 rounded shadow-lg p-4 z-50 w-[300px] popup-panel">
                <div className="flex justify-between items-center mb-2">
                    <strong className="capitalize">{popupOpen}</strong>
                    <FontAwesomeIcon icon={faXmark} className="cursor-pointer icon-color" onClick={() => setPopupOpen(null)} />
                </div>
                {popup[popupOpen]}
            </div>
        );
    };

    const popupButtons = [
        { icon: faBuilding, popup: "cliente", color: "text-green-400", active: "text-green-600" },
        { icon: faUserPlus, popup: "utenti", color: "text-blue-400", active: "text-blue-600" },
        { icon: faFlag, popup: "stato", color: "text-red-400", active: "text-red-600" },
        { icon: faSignal, popup: "priorita", color: "text-yellow-400", active: "text-yellow-600" },
        { icon: faCalendarDays, popup: "consegna", color: "text-indigo-400", active: "text-indigo-600" },
        { icon: faClock, popup: "tempo", color: "text-purple-400", active: "text-purple-600" },
    ] as const;

    return (
        <div className="fixed bottom-6 transition-all duration-300 w-[400px] rounded-xl shadow-xl p-5 modal-container"
            style={{ left: `${offsetIndex * 420 + 24}px`, zIndex: 100 + offsetIndex }}>
            <button onClick={onClose} className="absolute top-4 right-4 text-red-600 text-2xl" title="Chiudi">
                <FontAwesomeIcon icon={faXmark} className="icon-color" />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center text-theme">Crea Nuovo Progetto</h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme">Nome *</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full border rounded px-3 py-2 input-style" />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme">Note</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 resize-none input-style" />
                </div>

                {renderPopupContent()}

                <div className="relative h-4 mb-2">
                    {errore && <div className="absolute w-full text-center text-red-600 text-sm">{errore}</div>}
                    {success && <div className="absolute w-full text-center text-green-600 text-sm">✅ Progetto creato</div>}
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div className="flex gap-4 text-lg">
                        {popupButtons.map(({ icon, popup, color, active }) => (
                            <button key={popup} type="button"
                                onClick={() => setPopupOpen(popupOpen === popup ? null : popup)}
                                className={`${popupOpen === popup ? active : color}`}>
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        ))}
                    </div>
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        {loading ? "Salvataggio..." : "Crea Progetto"}
                    </button>
                </div>
            </form>
        </div>
    );
}
