import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { Toast } from "toaster-js";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 🔒 Qui potresti mettere reCAPTCHA o rate limiting via Edge Function
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                console.error("Errore resetPasswordForEmail:", error.message);
            }

            // ✅ Risposta neutra sempre, no email enumeration
            new Toast(
                "Se l’email è registrata, riceverai un link per resettare la password.",
                "success"
            );
        } catch (err) {
            new Toast("Errore durante la richiesta di reset.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 bg-theme text-theme">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 rounded-xl shadow-xl bg-theme text-theme border border-gray-200 dark:border-[#444] space-y-6"
            >
                <h2 className="text-2xl sm:text-3xl font-bold text-center">
                    Recupera password
                </h2>

                <div className="relative">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        className="absolute left-3 top-1/2 -translate-y-1/2 icon-color text-base sm:text-lg"
                    />
                    <input
                        type="email"
                        placeholder="Inserisci la tua email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 md:py-3 rounded-md border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-sm sm:text-base transition disabled:opacity-60"
                >
                    {loading ? "Invio in corso..." : "Invia link reset"}
                </button>
            </form>
        </div>
    );
}
