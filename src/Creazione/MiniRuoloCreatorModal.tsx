import React, { useState, useEffect } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserShield, faXmark } from "@fortawesome/free-solid-svg-icons";
import { dispatchResourceEvent } from "../Liste/config/azioniConfig";
import { resourceConfigs } from "../Liste/config";

type Props = { onClose: () => void; offsetIndex?: number };

export default function MiniRuoloCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
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

    const reset = () => setNome("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setSuccess(false);
        setLoading(true);

        if (!nome.trim()) {
            setErrore("Il nome del ruolo è obbligatorio.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("ruoli")
            .insert({ nome })
            .select()
            .single(); // 👈 prendiamo subito il record creato

        if (error || !data) {
            setErrore(error?.message || "Errore creazione ruolo");
            setLoading(false);
            setTimeout(() => setErrore(null), 3000);
            return;
        }

        // Refetch coerente (per avere join completi se ci sono)
        let nuovo: any = data;
        try {
            const rc: any = (resourceConfigs as any)["ruoli"];
            const userResp = await supabase.auth.getUser();
            const utenteId = userResp?.data?.user?.id ?? null;

            if (rc?.fetch) {
                const all = await rc.fetch({ filtro: {}, utenteId });
                nuovo = (all || []).find((x: any) => String(x.id) === String(data.id)) ?? data;
            }
        } catch (err) {
            console.warn("Refetch ruolo fallito, uso record base:", err);
        }

        // ✅ Dispatch finale → SOLO replace, niente add
        if (nuovo && nuovo.id) {
            dispatchResourceEvent("replace", "ruoli", { item: nuovo });
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

            <h2 className="text-xl font-semibold mb-4 text-center text-theme">Aggiungi Ruolo</h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme">Nome *</label>
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserShield} className="text-gray-500" />
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className={baseInputClass}
                            placeholder="Es. Amministratore"
                            required
                        />
                    </div>
                </div>

                {(errore || success) && (
                    <div className="text-center text-sm">
                        {errore && <div className="text-red-600">{errore}</div>}
                        {success && <div className="text-green-600">✅ Ruolo inserito</div>}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                >
                    {loading ? "Salvataggio..." : "Crea Ruolo"}
                </button>
            </form>
        </div>
    );
}
