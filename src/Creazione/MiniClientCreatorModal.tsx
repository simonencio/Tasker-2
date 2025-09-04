import React, { useState, useEffect, type JSX } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEnvelope,
    faPhone,
    faImage,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { dispatchResourceEvent } from "../Liste/config/azioniConfig";
import { resourceConfigs } from "../Liste/config";

type Props = { onClose: () => void; offsetIndex?: number };
type PopupField = "email" | "telefono" | "avatar";

export default function MiniClientCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [email, setEmail] = useState("");
    const [telefono, setTelefono] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [popupOpen, setPopupOpen] = useState<PopupField | null>(null);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const reset = () => {
        setNome("");
        setNote("");
        setEmail("");
        setTelefono("");
        setAvatarUrl("");
        setPopupOpen(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setSuccess(false);
        setLoading(true);

        if (!nome.trim()) {
            setErrore("Il nome del cliente è obbligatorio.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("clienti")
            .insert({
                nome,
                note: note || null,
                email: email || null,
                telefono: telefono || null,
                avatar_url: avatarUrl || null,
            })
            .select()
            .single();   // 👈 importantissimo: ci serve il record appena creato

        if (error || !data) {
            setErrore(error?.message || "Errore creazione cliente");
            setLoading(false);
            setTimeout(() => setErrore(null), 3000);
            return;
        }

        // Refetch coerente (per avere join completi se ci sono)
        let nuovo: any = data;
        try {
            const rc: any = (resourceConfigs as any)["clienti"];
            const userResp = await supabase.auth.getUser();
            const utenteId = userResp?.data?.user?.id ?? null;

            if (rc?.fetch) {
                const all = await rc.fetch({ filtro: {}, utenteId });
                nuovo = (all || []).find((x: any) => String(x.id) === String(data.id)) ?? data;
            }
        } catch (err) {
            console.warn("Refetch cliente fallito, uso record base:", err);
        }

        // ✅ Dispatch finale → SOLO replace, niente add
        if (nuovo && nuovo.id) {
            dispatchResourceEvent("replace", "clienti", { item: nuovo });
        }




        setSuccess(true);
        reset();
        setLoading(false);
        setTimeout(() => setSuccess(false), 3000);
    };


    const baseInputClass =
        "w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-offset-1 bg-theme text-theme";

    const popupInputs: Record<PopupField, JSX.Element> = {
        email: (
            <input
                aria-label="Email cliente"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={baseInputClass}
                placeholder="es. cliente@esempio.com"
            />
        ),
        telefono: (
            <input
                aria-label="Telefono cliente"
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={baseInputClass}
                placeholder="es. +39 333 1234567"
            />
        ),
        avatar: (
            <input
                aria-label="URL avatar"
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className={baseInputClass}
                placeholder="es. https://..."
            />
        ),
    };

    const popupButtons = [
        {
            icon: faEnvelope,
            popup: "email" as const,
            label: "Email",
            color: "text-blue-400",
            active: "text-blue-600",
        },
        {
            icon: faPhone,
            popup: "telefono" as const,
            label: "Telefono",
            color: "text-green-400",
            active: "text-green-600",
        },
        {
            icon: faImage,
            popup: "avatar" as const,
            label: "Avatar",
            color: "text-purple-400",
            active: "text-purple-600",
        },
    ];

    const computedLeft = offsetIndex
        ? `min(calc(${offsetIndex} * 420px + 24px), calc(100% - 24px - 400px))`
        : "24px";

    return (
        <div
            className="fixed bottom-6 z-50 rounded-xl shadow-xl p-5 bg-white dark:bg-gray-800 modal-container"
            style={
                isMobile
                    ? {
                        left: 0,
                        right: 0,
                        marginLeft: "auto",
                        marginRight: "auto",
                        width: "calc(100% - 32px)",
                        maxWidth: "400px",
                        zIndex: 100 + offsetIndex,
                    }
                    : {
                        left: computedLeft,
                        width: "400px",
                        zIndex: 100 + offsetIndex,
                    }
            }
            aria-labelledby="mini-client-modal-title"
            role="dialog"
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-red-600 text-2xl"
                title="Chiudi"
                aria-label="Chiudi"
            >
                <FontAwesomeIcon icon={faXmark} />
            </button>

            <h2
                id="mini-client-modal-title"
                className="text-xl font-semibold mb-4 text-center text-theme"
            >
                Aggiungi Cliente
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label
                        className="block mb-1 font-medium text-theme"
                        htmlFor="nome-cliente"
                    >
                        Nome *
                    </label>
                    <input
                        id="nome-cliente"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className={baseInputClass}
                        placeholder="Es. Mario Rossi"
                    />
                </div>

                <div>
                    <label
                        className="block mb-1 font-medium text-theme"
                        htmlFor="note-cliente"
                    >
                        Note
                    </label>
                    <textarea
                        id="note-cliente"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className={`${baseInputClass} resize-none`}
                        placeholder="Note aggiuntive..."
                    />
                </div>

                <div className="relative">
                    <div className="flex gap-4 text-lg mb-2">
                        {popupButtons.map(({ icon, popup: field, color, active, label }) => (
                            <button
                                key={field}
                                type="button"
                                aria-label={label}
                                onClick={() => setPopupOpen((o) => (o === field ? null : field))}
                                className={`focus:outline-none ${popupOpen === field ? active : color}`}
                            >
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        ))}
                    </div>

                    {popupOpen && (
                        <div
                            className="absolute bottom-full mb-2 border rounded p-4 bg-theme text-theme shadow-md max-h-60 overflow-auto z-50 left-0 w-full"
                            role="dialog"
                            aria-label={`Modifica ${popupOpen}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <strong className="capitalize text-theme">{popupOpen}</strong>
                                <button
                                    type="button"
                                    onClick={() => setPopupOpen(null)}
                                    aria-label="Chiudi popup"
                                    className="text-sm"
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                            {popupInputs[popupOpen]}
                        </div>
                    )}
                </div>

                {(errore || success) && (
                    <div className="text-center text-sm">
                        {errore && (
                            <div className="text-red-600" role="alert">
                                {errore}
                            </div>
                        )}
                        {success && (
                            <div className="text-green-600" role="status">
                                ✅ Cliente inserito
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Salvataggio..." : "Crea Cliente"}
                    </button>
                </div>
            </form>
        </div>
    );
}
