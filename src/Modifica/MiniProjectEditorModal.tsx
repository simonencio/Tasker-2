// 📁 Modifica/MiniProjectEditorModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { inviaNotifica } from "../Notifiche/notificheUtils";

type Props = {
    progettoId: string;
    onClose: () => void;
};

type Cliente = { id: string; nome: string };
type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };
type Utente = { id: string; nome: string; cognome: string };

export default function MiniProjectEditorModal({ progettoId, onClose }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [statoId, setStatoId] = useState<number | null>(null);
    const [prioritaId, setPrioritaId] = useState<number | null>(null);
    const [consegna, setConsegna] = useState("");
    const [tempoStimato, setTempoStimato] = useState("");

    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [membriSelezionati, setMembriSelezionati] = useState<string[]>([]);
    const [, setMembriPrecedenti] = useState<string[]>([]);
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from("progetti").select("*").eq("id", progettoId).single(),
            supabase.from("utenti_progetti").select("utente_id").eq("progetto_id", progettoId),
            supabase.from("clienti").select("id, nome").is("deleted_at", null),
            supabase.from("stati").select("id, nome").is("deleted_at", null),
            supabase.from("priorita").select("id, nome").is("deleted_at", null),
            supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
        ]).then(([progettoRes, membriRes, clientiRes, statiRes, prioritaRes, utentiRes]) => {
            const progetto = progettoRes.data;
            if (progetto) {
                setNome(progetto.nome || "");
                setNote(progetto.note || "");
                setClienteId(progetto.cliente_id);
                setStatoId(progetto.stato_id);
                setPrioritaId(progetto.priorita_id);
                setConsegna(progetto.consegna || "");
                setTempoStimato(progetto.tempo_stimato || "");
            }
            if (membriRes.data) {
                const ids = membriRes.data.map((m: any) => m.utente_id);
                setMembriSelezionati(ids);
                setMembriPrecedenti(ids);
            }
            if (clientiRes.data) setClienti(clientiRes.data);
            if (statiRes.data) setStati(statiRes.data);
            if (prioritaRes.data) setPriorita(prioritaRes.data);
            if (utentiRes.data) setUtenti(utentiRes.data);
        });
    }, [progettoId]);

    const toggleMembro = (id: string) => {
        setMembriSelezionati((prev) =>
            prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
        );
    };

    const salvaModifiche = async () => {
        await supabase
            .from("progetti")
            .update({
                nome,
                note,
                cliente_id: clienteId,
                stato_id: statoId,
                priorita_id: prioritaId,
                consegna,
                tempo_stimato: tempoStimato,
            })
            .eq("id", progettoId);

        const { data: esistenti } = await supabase
            .from("utenti_progetti")
            .select("utente_id")
            .eq("progetto_id", progettoId);

        const esistentiIds = esistenti?.map((e: any) => e.utente_id) || [];

        const daAggiungere = membriSelezionati.filter((id) => !esistentiIds.includes(id));
        const daRimuovere = esistentiIds.filter((id) => !membriSelezionati.includes(id));
        const rimasti = membriSelezionati.filter((id) => esistentiIds.includes(id));

        const user = await supabase.auth.getUser();
        const creatoreId = user.data?.user?.id;

        if (daAggiungere.length > 0) {
            await supabase.from("utenti_progetti").insert(
                daAggiungere.map((id) => ({ progetto_id: progettoId, utente_id: id }))
            );
            await inviaNotifica(
                "PROGETTO_ASSEGNATO",
                daAggiungere,
                `Sei stato assegnato al progetto: ${nome}`,
                creatoreId || undefined,
                { progetto_id: progettoId }
            );
        }

        if (daRimuovere.length > 0) {
            for (const id of daRimuovere) {
                await supabase
                    .from("utenti_progetti")
                    .delete()
                    .eq("progetto_id", progettoId)
                    .eq("utente_id", id);
            }
            await inviaNotifica(
                "PROGETTO_RIMOSSO",
                daRimuovere,
                `Sei stato rimosso dal progetto: ${nome}`,
                creatoreId || undefined,
                { progetto_id: progettoId }
            );
        }

        if (rimasti.length > 0) {
            await inviaNotifica(
                "PROGETTO_MODIFICATO",
                rimasti,
                `Il progetto "${nome}" è stato modificato.`,
                creatoreId || undefined,
                { progetto_id: progettoId }
            );
        }

        onClose();
    };

    return (
        <div className="fixed top-16 bottom-0 left-0 right-0 z-50 bg-black/60 overflow-y-auto px-4 pt-4 pb-8 flex justify-center hide-scrollbar">

            <div className="modal-container p-6 rounded-xl shadow-xl w-full max-w-[600px] my-auto relative">

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-theme">✏️ Modifica Progetto</h2>
                    <button onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} className="icon-color text-xl" />
                    </button>
                </div>

                {/* Nome & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Nome</label>
                        <input
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full input-style"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Note</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full input-style h-[38px]"
                        />
                    </div>
                </div>

                {/* Cliente & Stato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Cliente</label>
                        <select
                            value={clienteId ?? ""}
                            onChange={(e) => setClienteId(e.target.value || null)}
                            className="w-full input-style"
                        >
                            <option value="">Seleziona cliente</option>
                            {clienti.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Stato</label>
                        <select
                            value={statoId ?? ""}
                            onChange={(e) =>
                                setStatoId(e.target.value === "" ? null : Number(e.target.value))
                            }
                            className="w-full input-style"
                        >
                            <option value="">Seleziona stato</option>
                            {stati.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Priorità & Consegna */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Priorità</label>
                        <select
                            value={prioritaId ?? ""}
                            onChange={(e) =>
                                setPrioritaId(e.target.value === "" ? null : Number(e.target.value))
                            }
                            className="w-full input-style"
                        >
                            <option value="">Seleziona priorità</option>
                            {priorita.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Consegna</label>
                        <input
                            type="date"
                            value={consegna}
                            onChange={(e) => setConsegna(e.target.value)}
                            className="w-full input-style"
                        />
                    </div>
                </div>

                {/* Tempo & Membri */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 relative">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Tempo stimato</label>
                        <div className="relative">

                            <input
                                value={tempoStimato}
                                onChange={(e) => setTempoStimato(e.target.value)}
                                placeholder="es: 10:00"
                                className="w-full pl-9 pr-3 py-2 rounded-md border input-style"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="text-sm font-semibold text-theme mb-1 block">Membri</label>
                        <div
                            onClick={() => setPopupOpen(!popupOpen)}
                            className="cursor-pointer input-style text-sm"
                        >
                            {membriSelezionati.length > 0
                                ? `${membriSelezionati.length} membri selezionati`
                                : "Seleziona membri"}
                        </div>

                        {popupOpen && (
                            <div className="absolute bottom-full mb-2 left-0 w-full max-h-60 overflow-y-auto popup-panel z-40">
                                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-300 dark:border-gray-600">
                                    <strong className="text-theme">Membri</strong>
                                    <button onClick={() => setPopupOpen(false)} className="icon-color">
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                                <div className="p-2 space-y-1">
                                    {utenti.map((u) => {
                                        const selected = membriSelezionati.includes(u.id);
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleMembro(u.id)}
                                                className={`cursor-pointer px-2 py-1 rounded border text-sm ${selected
                                                    ? "selected-panel font-semibold"
                                                    : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"
                                                    }`}
                                            >
                                                {u.nome} {u.cognome}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={salvaModifiche}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all mt-4"
                >
                    Salva modifiche
                </button>
            </div>
        </div>
    );
}
