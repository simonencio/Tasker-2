import React, { useState, useEffect } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag, faPalette, faXmark } from "@fortawesome/free-solid-svg-icons";
import { traduciColore } from "../supporto/traduzioniColori";

type Props = { onClose: () => void; offsetIndex?: number };

export default function MiniPrioritaCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [colore, setColore] = useState("");
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const reset = () => {
        setNome("");
        setColore("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setSuccess(false);
        setLoading(true);

        if (!nome.trim()) {
            setErrore("Il nome della priorità è obbligatorio.");
            setLoading(false);
            return;
        }

        const coloreTradotto = colore ? traduciColore(colore) : null;

        const { error } = await supabase.from("priorita").insert({
            nome,
            colore: coloreTradotto,
        });

        if (error) {
            setErrore(error.message);
            setLoading(false);
            setTimeout(() => setErrore(null), 3000);
            return;
        }

        setSuccess(true);
        reset();
        setLoading(false);
        setTimeout(() => setSuccess(false), 3000);
    };

    const baseInputClass =
        "w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-offset-1 bg-theme text-theme";

    const computedLeft = offsetIndex
        ? `min(calc(${offsetIndex} * 420px + 24px), calc(100% - 24px - 400px))`
        : "24px";

    return (
        <div
            className="fixed bottom-6 z-50 rounded-xl shadow-xl p-5 bg-white dark:bg-gray-800 modal-container"
            style={
                isMobile
                    ? { left: 0, right: 0, margin: "auto", width: "calc(100% - 32px)", maxWidth: "400px", zIndex: 100 + offsetIndex }
                    : { left: computedLeft, width: "400px", zIndex: 100 + offsetIndex }
            }
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-red-600 text-2xl">
                <FontAwesomeIcon icon={faXmark} />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center text-theme">Aggiungi Priorità</h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme">Nome *</label>
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faFlag} className="text-gray-500" />
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className={baseInputClass}
                            placeholder="Es. Alta"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme">Colore</label>
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faPalette} className="text-gray-500" />
                        <input
                            type="text"
                            value={colore}
                            onChange={(e) => setColore(e.target.value)}
                            className={baseInputClass}
                            placeholder="es. rosso"
                        />
                    </div>
                </div>

                {(errore || success) && (
                    <div className="text-center text-sm">
                        {errore && <div className="text-red-600">{errore}</div>}
                        {success && <div className="text-green-600">✅ Priorità inserita</div>}
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60">
                    {loading ? "Salvataggio..." : "Crea Priorità"}
                </button>
            </form>
        </div>
    );
}
