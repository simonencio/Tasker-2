import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faUserPlus,
    faBuilding,
    faFlag,
    faSignal,
    faCalendarDays,
    faClock,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { inviaNotifica } from "../Notifiche/notificheUtils";

type Cliente = { id: string; nome: string };
type Utente = { id: string; nome: string; cognome: string };
type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };

type PopupType = "cliente" | "utenti" | "stato" | "priorita" | "consegna" | "tempo";
type Props = { onClose: () => void };

export default function MiniProjectCreatorModal({ onClose }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [utentiSelezionati, setUtentiSelezionati] = useState<Utente[]>([]);
    const [statoId, setStatoId] = useState("");
    const [prioritaId, setPrioritaId] = useState("");
    const [consegna, setConsegna] = useState("");
    const [ore, setOre] = useState("0");
    const [minuti, setMinuti] = useState("0");

    const [popupOpen, setPopupOpen] = useState<PopupType | null>(null);
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);

    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [{ data: cl }, { data: u }, { data: s }, { data: p }] = await Promise.all([
                supabase.from("clienti").select("id, nome").is("deleted_at", null),
                supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
                supabase.from("stati").select("id, nome").is("deleted_at", null),
                supabase.from("priorita").select("id, nome").is("deleted_at", null),
            ]);
            if (cl) setClienti(cl);
            if (u) setUtenti(u);
            if (s) setStati(s);
            if (p) setPriorita(p);
        };
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setLoading(true);

        if (!nome.trim()) {
            setErrore("Il nome del progetto è obbligatorio.");
            setLoading(false);
            return;
        }

        const tempoStimato = `${ore} hours ${minuti} minutes`;
        const user = await supabase.auth.getUser();

        const { data: created, error } = await supabase
            .from("progetti")
            .insert({
                nome,
                note: note || null,
                cliente_id: clienteId || null,
                stato_id: statoId ? Number(statoId) : null,
                priorita_id: prioritaId ? Number(prioritaId) : null,
                consegna: consegna || null,
                tempo_stimato: tempoStimato === "0 hours 0 minutes" ? null : tempoStimato,
            })
            .select()
            .single();

        if (error || !created) {
            setErrore(error?.message || "Errore nella creazione del progetto.");
            setLoading(false);
            return;
        }

        const progettoId = created.id;

        for (const utente of utentiSelezionati) {
            await supabase.from("utenti_progetti").insert({
                progetto_id: progettoId,
                utente_id: utente.id,
            });

            await inviaNotifica(
                "PROGETTO_ASSEGNATO",
                [utente.id],
                `Sei stato assegnato al nuovo progetto: ${nome}`,
                user.data?.user?.id,
                { progetto_id: progettoId }
            );
        }

        setSuccess(true);
        setTimeout(() => onClose(), 1200);
        setLoading(false);
    };

    const popupButtons = [
        { icon: faBuilding, popup: "cliente", color: "text-green-400", activeColor: "text-green-600" },
        { icon: faUserPlus, popup: "utenti", color: "text-blue-400", activeColor: "text-blue-600" },
        { icon: faFlag, popup: "stato", color: "text-red-400", activeColor: "text-red-600" },
        { icon: faSignal, popup: "priorita", color: "text-yellow-400", activeColor: "text-yellow-600" },
        { icon: faCalendarDays, popup: "consegna", color: "text-indigo-400", activeColor: "text-indigo-600" },
        { icon: faClock, popup: "tempo", color: "text-purple-400", activeColor: "text-purple-600" },
    ];

    return (
        <div className="fixed bottom-6 left-6 z-50 w-[460px] bg-white border border-gray-300 rounded-xl shadow-xl p-5">
            <h2 className="text-xl font-semibold mb-4 text-center">Crea Nuovo Progetto</h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium">Nome *</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full border rounded px-3 py-2" />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Note</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 resize-none" />
                </div>

                <div className="flex justify-center gap-4 text-lg">
                    {popupButtons.map(({ icon, popup, color, activeColor }) => {
                        const isActive = popupOpen === popup;
                        return (
                            <button
                                key={popup}
                                type="button"
                                onClick={() => setPopupOpen((isActive ? null : popup) as PopupType | null)
                                }
                                className={`${isActive ? activeColor : color} transition-colors`}
                            >
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        );
                    })}
                </div>

                {popupOpen && (
                    <div className="absolute bottom-28 left-6 bg-white border rounded shadow-lg p-4 z-50 w-[300px]">
                        <div className="flex justify-between items-center mb-2">
                            <strong className="capitalize">{popupOpen}</strong>
                            <FontAwesomeIcon icon={faXmark} className="cursor-pointer" onClick={() => setPopupOpen(null as PopupType | null)} />
                        </div>

                        {popupOpen === "cliente" && (
                            <select value={clienteId || ""} onChange={(e) => setClienteId(e.target.value || null)} className="w-full border rounded px-2 py-1">
                                <option value="">-- nessuno --</option>
                                {clienti.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        )}

                        {popupOpen === "utenti" && (
                            <div className="space-y-1 max-h-[180px] overflow-y-auto">
                                {utenti.map((u) => {
                                    const isSelected = utentiSelezionati.some(sel => sel.id === u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                setUtentiSelezionati(prev =>
                                                    isSelected
                                                        ? prev.filter(sel => sel.id !== u.id)
                                                        : [...prev, u]
                                                );
                                            }}
                                            className={`cursor-pointer px-2 py-1 rounded hover:bg-gray-100 ${isSelected ? "bg-blue-100 font-semibold" : ""}`}
                                        >
                                            {u.nome} {u.cognome}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {popupOpen === "stato" && (
                            <select value={statoId} onChange={(e) => setStatoId(e.target.value)} className="w-full border rounded px-2 py-1">
                                <option value="">-- seleziona --</option>
                                {stati.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                        )}

                        {popupOpen === "priorita" && (
                            <select value={prioritaId} onChange={(e) => setPrioritaId(e.target.value)} className="w-full border rounded px-2 py-1">
                                <option value="">-- seleziona --</option>
                                {priorita.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        )}

                        {popupOpen === "consegna" && (
                            <input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} className="w-full border rounded px-2 py-1" />
                        )}

                        {popupOpen === "tempo" && (
                            <div className="flex gap-2">
                                <select value={ore} onChange={(e) => setOre(e.target.value)} className="w-1/2 border rounded px-2 py-1">
                                    {[...Array(25).keys()].map((h) => <option key={h} value={h}>{h}h</option>)}
                                </select>
                                <select value={minuti} onChange={(e) => setMinuti(e.target.value)} className="w-1/2 border rounded px-2 py-1">
                                    {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m}min</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {errore && <div className="text-red-600 text-sm">{errore}</div>}
                {success && <div className="text-green-600 text-sm">✅ Progetto creato</div>}

                <div className="flex justify-between pt-4">
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-black">Annulla</button>
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        {loading ? "Salvataggio..." : "Crea Progetto"}
                    </button>
                </div>
            </form>
        </div>
    );
}
