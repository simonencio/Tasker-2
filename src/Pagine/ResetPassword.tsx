import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faKey } from "@fortawesome/free-solid-svg-icons";
import { Toast } from "toaster-js";
import "toaster-js/default.css";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { useCaptcha } from "../supporto/useCaptcha";
import CaptchaStatus from "../supporto/CaptchaStatus";

function ResetPasswordInner() {
    const { userId } = useParams<{ userId?: string }>();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const { captchaReady, runCaptcha } = useCaptcha("reset-password");

    useEffect(() => {
        const fetchEmail = async () => {
            try {
                if (userId) {
                    const { data, error } = await supabase
                        .from("utenti")
                        .select("email")
                        .eq("id", userId)
                        .single();

                    if (error || !data) {
                        new Toast("Utente non trovato o ID non valido.", "error");
                    } else {
                        setEmail(data.email);
                    }
                } else {
                    const { data: { user }, error } = await supabase.auth.getUser();
                    if (error || !user) {
                        new Toast("Non riesco a recuperare l'utente dal token.", "error");
                    } else {
                        setEmail(user.email ?? "");
                    }
                }
            } catch {
                new Toast("Errore durante il recupero dell'email.", "error");
            }
        };

        fetchEmail();
    }, [userId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const token = await runCaptcha();
        if (!token) {
            new Toast("Verifica captcha fallita.", "warning");
            return;
        }

        if (!password || !confirmPassword) {
            new Toast("Inserisci entrambe le password.", "warning");
            return;
        }

        if (password !== confirmPassword) {
            new Toast("Le password non corrispondono.", "warning");
            return;
        }

        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (updateError) {
            new Toast("Errore durante il reset: " + updateError.message, "error");
        } else {
            new Toast("Password aggiornata con successo!", "success");
            await supabase.auth.signOut();
            setTimeout(() => navigate("/", { replace: true }), 2000);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-theme px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md card-theme p-8 space-y-6 animate-scale-fade"
            >
                {/* Icona + Titolo */}
                <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white shadow">
                        <FontAwesomeIcon icon={faKey} size="lg" />
                    </div>
                    <h2 className="form-heading">Reset della Password</h2>
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-theme mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        readOnly
                        autoComplete="username"
                        className="input-style w-full bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    />
                </div>

                {/* Nuova Password */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-theme mb-1">
                        Nuova Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            className="input-style w-full pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                        >
                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                        </button>
                    </div>
                </div>

                {/* Conferma Password */}
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-theme mb-1">
                        Conferma Password
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            className="input-style w-full pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                        >
                            <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                        </button>
                    </div>
                </div>

                {/* reCAPTCHA status */}
                <CaptchaStatus ready={captchaReady} />

                {/* Pulsante */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition disabled:opacity-50"
                >
                    {loading ? "Reset in corso..." : "Resetta Password"}
                </button>
            </form>
        </div>
    );
}

export default function ResetPassword() {
    return (
        <GoogleReCaptchaProvider reCaptchaKey="6LdKArcrAAAAANmGpTkLa-GopiPqy1BUreHKmDfL">
            <ResetPasswordInner />
        </GoogleReCaptchaProvider>
    );
}
