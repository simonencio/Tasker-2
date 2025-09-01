// src/Creazione/MiniUserCreatorModal.tsx
import React, { useState, useEffect, type JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faXmark, faEnvelope, faUserCheck, faUser, faShieldAlt, faImage,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient";
import { dispatchResourceEvent } from "../Liste/config/azioniConfig";

type Props = { onClose: () => void; offsetIndex?: number };
type PopupField = "cognome" | "ruolo" | "avatar";
type Role = { id: number; nome: string };

const EDGE_FUNCTION_URL =
    "https://kieyhhmxinmdsnfdglrm.supabase.co/functions/v1/create_user_and_reset";

export default function MiniUserCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [cognome, setCognome] = useState("");
    const [ruolo, setRuolo] = useState(0);
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [roles, setRoles] = useState<Role[]>([]);
    const [popupOpen, setPopupOpen] = useState<PopupField | null>(null);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // --- RESPONSIVE
    useEffect(() => {
        const resize = () => setIsMobile(window.innerWidth <= 768);
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    // --- CARICA RUOLI + REALTIME
    useEffect(() => {
        const fetchAll = async () => {
            const { data } = await supabase.from("ruoli").select("id,nome").is("deleted_at", null);
            if (data) setRoles(data);
        };
        fetchAll();

        const channel = supabase.channel("realtime_user_dropdowns");
        channel
            .on("postgres_changes", { event: "*", schema: "public", table: "ruoli" }, fetchAll)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const reset = () => {
        setNome(""); setCognome(""); setEmail("");
        setRuolo(0); setAvatarUrl(""); setPopupOpen(null);
    };

    // --- SUBMIT
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null); setSuccess(false); setLoading(true);

        if (!nome.trim() || !cognome.trim() || !email.trim() || !ruolo) {
            setErrore("Nome, cognome, email e ruolo sono obbligatori.");
            setLoading(false);
            return;
        }

        try {
            // 1) Edge function → crea user in auth + tabella
            const payload = {
                email,
                nome,
                cognome,
                avatar_url: avatarUrl || null,
                ruolo,
                redirectTo: `${window.location.origin}/reset-password`,
            };

            const res = await fetch(EDGE_FUNCTION_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Errore creazione utente");

            // 2) Recupera utente completo da db (join ruolo)
            const { data: nuovoUtente } = await supabase
                .from("utenti")
                .select("id, nome, cognome, email, avatar_url, ruolo:ruolo (id, nome)")
                .eq("id", json.user.id)
                .single();

            // 3) Aggiorna subito tutte le viste utenti
            if (nuovoUtente) {
                dispatchResourceEvent("add", "utenti", { item: nuovoUtente });
            }

            setSuccess(true);
            reset();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setErrore(err.message || "Errore generico");
            setTimeout(() => setErrore(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    // --- STILI
    const baseInputClass =
        "w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-offset-1 bg-theme text-theme";

    const popupInputs: Record<PopupField, JSX.Element> = {
        cognome: (
            <input
                aria-label="Cognome"
                type="text"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                className={baseInputClass}
                placeholder="Es. Rossi"
            />
        ),
        ruolo: (
            <div className="space-y-1 max-h-60 ">
                {roles.map((r) => (
                    <div
                        key={r.id}
                        onClick={() => {
                            setRuolo(r.id === ruolo ? 0 : r.id);
                            setPopupOpen(null);
                        }}
                        className={`cursor-pointer px-2 py-1 rounded border ${ruolo === r.id
                            ? "selected-panel font-semibold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"
                            }`}
                    >
                        {r.nome}
                    </div>
                ))}
            </div>
        ),
        avatar: (
            <input
                aria-label="Avatar URL"
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
            icon: faUser,
            popup: "cognome" as const,
            label: "Cognome",
            color: "text-orange-400",
            active: "text-orange-600",
        },
        {
            icon: faShieldAlt,
            popup: "ruolo" as const,
            label: "Ruolo",
            color: "text-indigo-400",
            active: "text-indigo-600",
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

    // --- RENDER
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
            role="dialog"
            aria-labelledby="mini-user-modal-title"
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
                id="mini-user-modal-title"
                className="text-xl font-semibold mb-4 text-center text-theme"
            >
                Aggiungi Utente
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme" htmlFor="nome">
                        Nome *
                    </label>
                    <input
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className={baseInputClass}
                        placeholder="Es. Mario"
                        required
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme" htmlFor="email">
                        Email *
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={baseInputClass}
                        placeholder="utente@esempio.com"
                        required
                    />
                </div>

                <div className="h-2 sm:h-4 md:h-7" aria-hidden="true" />

                <div className="relative">
                    <div className="flex gap-4 text-lg mb-2">
                        {popupButtons.map(({ icon, popup: field, color, active, label }) => (
                            <button
                                key={field}
                                type="button"
                                aria-label={label}
                                onClick={() =>
                                    setPopupOpen((prev) => (prev === field ? null : field))
                                }
                                className={`focus:outline-none ${popupOpen === field ? active : color
                                    }`}
                            >
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        ))}
                    </div>

                    {popupOpen && (
                        <div
                            key={`${popupOpen}-${roles.length}`}
                            className="absolute bottom-full mb-2 border rounded p-4 bg-theme text-theme shadow-md max-h-60 hide-scrollbar overflow-auto z-60 left-0 w-full"
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
                            <div
                                className="text-green-600 flex items-center justify-center"
                                role="status"
                            >
                                <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
                                Utente creato e email inviata
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 flex justify-center gap-2"
                    >
                        {loading ? "Creazione..." : "Crea & Invia Reset"}
                        <FontAwesomeIcon icon={faEnvelope} />
                    </button>
                </div>
            </form>
        </div>
    );
}
