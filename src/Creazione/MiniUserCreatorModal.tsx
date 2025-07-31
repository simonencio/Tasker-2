import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faEnvelope, faUserCheck } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient"; // adatta se il path è diverso

// tipo locale per ruoli (schema public.ruoli)
type Role = {
    id: number;
    nome: string;
};

type Props = { onClose: () => void; offsetIndex?: number };

// form coerente con la tabella utenti: nome, cognome, email, ruolo, avatar_url
type UserForm = {
    email: string;
    nome: string;
    cognome: string;
    ruolo: number;
    avatar_url: string;
};

// URL della tua edge function che crea utente + invia reset
const EDGE_FUNCTION_URL = "https://kieyhhmxinmdsnfdglrm.supabase.co/functions/v1/create_user_and_reset"; // sostituisci con il tuo endpoint reale

export default function MiniUserCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [form, setForm] = useState<UserForm>({
        email: "",
        nome: "",
        cognome: "",
        ruolo: 0,
        avatar_url: "",
    });
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // gestione responsive
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // carica ruoli dal db
    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase.from("ruoli").select("id,nome");
                if (error) throw error;
                setRoles(
                    (data || []).map((r: any) => ({
                        id: r.id,
                        nome: r.nome,
                    }))
                );
            } catch (e: any) {
                setErrore("Impossibile caricare i ruoli: " + (e.message || e));
            }
        })();
    }, []);

    const handleChange = (field: keyof UserForm, value: string | number) => {
        setForm((f) => ({ ...f, [field]: value as any }));
    };

    const resetForm = () => {
        setForm({
            email: "",
            nome: "",
            cognome: "",
            ruolo: 0,
            avatar_url: "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setSuccess(false);

        if (!form.email.trim() || !form.nome.trim() || !form.cognome.trim() || !form.ruolo) {
            setErrore("Email, nome, cognome e ruolo sono obbligatori.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                email: form.email,
                first_name: form.nome, // mappatura per edge function
                last_name: form.cognome,
                avatar_url: form.avatar_url || null,
                role_id: form.ruolo,
                redirectTo: `${window.location.origin}/reset-password/${form.email}`, // adatta se serve diverso
            };

            const res = await fetch(EDGE_FUNCTION_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || "Errore creazione utente");
            }

            setSuccess(true);
            resetForm();
        } catch (err: any) {
            setErrore(err.message || "Errore generico");
        } finally {
            setLoading(false);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    const baseInputClass =
        "w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-offset-1 bg-white dark:bg-[#1f2937]";

    const computedLeft = offsetIndex
        ? `min(calc(${offsetIndex} * 420px + 24px), calc(100% - 24px - 400px))`
        : "24px";

    return (
        <div
            className="fixed bottom-6 z-50 rounded-xl shadow-xl p-5 bg-white dark:bg-[#2c3542] modal-container"
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
            aria-labelledby="mini-user-creator-title"
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-red-600 text-2xl"
                title="Chiudi"
                aria-label="Chiudi"
            >
                <FontAwesomeIcon icon={faXmark} />
            </button>

            <h2 id="mini-user-creator-title" className="text-xl font-semibold mb-4 text-center text-theme">
                Crea Utente &amp; Reset Password
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme" htmlFor="nome">
                        Nome *
                    </label>
                    <input
                        id="nome"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                        className={baseInputClass}
                        placeholder="Mario"
                        required
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme" htmlFor="cognome">
                        Cognome *
                    </label>
                    <input
                        id="cognome"
                        value={form.cognome}
                        onChange={(e) => handleChange("cognome", e.target.value)}
                        className={baseInputClass}
                        placeholder="Rossi"
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
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={baseInputClass}
                        placeholder="utente@esempio.com"
                        required
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme" htmlFor="ruolo">
                        Ruolo *
                    </label>
                    <select
                        id="ruolo"
                        value={form.ruolo}
                        onChange={(e) => handleChange("ruolo", +e.target.value)}
                        className={baseInputClass}
                        required
                    >
                        <option value={0} disabled>
                            Seleziona ruolo
                        </option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme" htmlFor="avatar_url">
                        Avatar (URL)
                    </label>
                    <input
                        id="avatar_url"
                        value={form.avatar_url}
                        onChange={(e) => handleChange("avatar_url", e.target.value)}
                        className={baseInputClass}
                        placeholder="https://..."
                    />
                </div>

                {(errore || success) && (
                    <div className="text-center text-sm">
                        {errore && (
                            <div className="text-red-600" role="alert">
                                {errore}
                            </div>
                        )}
                        {success && (
                            <div className="text-green-600 flex items-center justify-center" role="status">
                                <FontAwesomeIcon icon={faUserCheck} className="mr-2" /> Utente creato e email inviata
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
