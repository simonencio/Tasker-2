// src/Task-Creazione/MiniTaskCreatorModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faFlag,
    faSignal,
    faCalendarDays,
    faClock,
    faXmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Tipi
type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };

type Props = {
    onClose: () => void;
};

export default function MiniTaskCreatorModal({ onClose }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [statoId, setStatoId] = useState<string>("");
    const [prioritaId, setPrioritaId] = useState<string>("");
    const [consegna, setConsegna] = useState<string>("");
    const [ore, setOre] = useState("0");
    const [minuti, setMinuti] = useState("0");

    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);

    const [popupOpen, setPopupOpen] = useState<"stato" | "priorita" | "consegna" | "tempo" | null>(null);

    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const { data: statiData } = await supabase.from("stati").select("id, nome").is("deleted_at", null);
            const { data: prioritaData } = await supabase.from("priorita").select("id, nome").is("deleted_at", null);
            if (statiData) setStati(statiData);
            if (prioritaData) setPriorita(prioritaData);
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setLoading(true);

        const tempoStimato = `${ore} hours ${minuti} minutes`;

        const { error } = await supabase.from("tasks").insert([
            {
                nome,
                note: note || null,
                stato_id: Number(statoId),
                priorita_id: Number(prioritaId),
                consegna,
                tempo_stimato: tempoStimato
            }
        ]);

        setLoading(false);

        if (error) {
            setErrore(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1200);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-xl shadow-lg p-4 w-[350px] z-50">
            <h3 className="text-lg font-semibold mb-2">Nuova Attività</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm ">
                <div className="h-[300px]">

                    <div>
                        <label className="block mb-1 font-medium">Nome *</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Note</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-3">
                    <button
                        type="button"
                        className="text-gray-600 hover:text-black"
                        title="Stato"
                        onClick={() => setPopupOpen(popupOpen === "stato" ? null : "stato")}
                    >
                        <FontAwesomeIcon icon={faFlag} />
                    </button>

                    <button
                        type="button"
                        className="text-gray-600 hover:text-black"
                        title="Priorità"
                        onClick={() => setPopupOpen(popupOpen === "priorita" ? null : "priorita")}
                    >
                        <FontAwesomeIcon icon={faSignal} />
                    </button>

                    <button
                        type="button"
                        className="text-gray-600 hover:text-black"
                        title="Consegna"
                        onClick={() => setPopupOpen(popupOpen === "consegna" ? null : "consegna")}
                    >
                        <FontAwesomeIcon icon={faCalendarDays} />
                    </button>

                    <button
                        type="button"
                        className="text-gray-600 hover:text-black"
                        title="Tempo Stimato"
                        onClick={() => setPopupOpen(popupOpen === "tempo" ? null : "tempo")}
                    >
                        <FontAwesomeIcon icon={faClock} />
                    </button>
                </div>

                {popupOpen === "stato" && (
                    <div className="absolute bottom-12 left-2 bg-white shadow-lg border rounded p-2 z-50 w-[300px]">
                        <div className="flex justify-between items-center mb-1">
                            <strong>Seleziona stato</strong>
                            <FontAwesomeIcon icon={faXmark} className="cursor-pointer" onClick={() => setPopupOpen(null)} />
                        </div>
                        <select
                            value={statoId}
                            onChange={(e) => setStatoId(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        >
                            <option value="">-- seleziona --</option>
                            {stati.map((s) => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

                {popupOpen === "priorita" && (
                    <div className="absolute bottom-12 left-2 bg-white shadow-lg border rounded p-2 z-50 w-[300px]">
                        <div className="flex justify-between items-center mb-1">
                            <strong>Seleziona priorità</strong>
                            <FontAwesomeIcon icon={faXmark} className="cursor-pointer" onClick={() => setPopupOpen(null)} />
                        </div>
                        <select
                            value={prioritaId}
                            onChange={(e) => setPrioritaId(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        >
                            <option value="">-- seleziona --</option>
                            {priorita.map((p) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

                {popupOpen === "consegna" && (
                    <div className="absolute bottom-12 left-2 bg-white shadow-lg border rounded p-2 z-50 w-[300px]">
                        <div className="flex justify-between items-center mb-1">
                            <strong>Seleziona data</strong>
                            <FontAwesomeIcon icon={faXmark} className="cursor-pointer" onClick={() => setPopupOpen(null)} />
                        </div>
                        <input
                            type="date"
                            value={consegna}
                            onChange={(e) => setConsegna(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                )}

                {popupOpen === "tempo" && (
                    <div className="absolute bottom-12 left-2 bg-white shadow-lg border rounded p-2 z-50 w-[300px]">
                        <div className="flex justify-between items-center mb-1">
                            <strong>Tempo stimato</strong>
                            <FontAwesomeIcon icon={faXmark} className="cursor-pointer" onClick={() => setPopupOpen(null)} />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={ore}
                                onChange={(e) => setOre(e.target.value)}
                                className="w-1/2 border rounded px-2 py-1"
                            >
                                {[...Array(25).keys()].map((h) => (
                                    <option key={h} value={h}>{h}h</option>
                                ))}
                            </select>
                            <select
                                value={minuti}
                                onChange={(e) => setMinuti(e.target.value)}
                                className="w-1/2 border rounded px-2 py-1"
                            >
                                {[0, 15, 30, 45].map((m) => (
                                    <option key={m} value={m}>{m}min</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {errore && <div className="text-red-600 text-sm">{errore}</div>}
                {success && <div className="text-green-600 text-sm">Attività creata ✅</div>}

                <div className="flex justify-between pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-600 hover:text-black text-sm"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                        {loading ? "Salvataggio..." : "Crea"}
                    </button>
                </div>
            </form>
        </div>
    );
}
