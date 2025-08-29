// src/Pagine/LoginForm.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEnvelope, faLock, faLockOpen, faEye, faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { useCaptcha } from "../supporto/useCaptcha";
import CaptchaStatus from "../supporto/CaptchaStatus";

function LoginInnerForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const { captchaReady, runCaptcha } = useCaptcha("login");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = await runCaptcha();
            if (!token) {
                setError("Verifica captcha fallita.");
                setLoading(false);
                return;
            }

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
            else navigate("/home");
        } catch (err: any) {
            setError("Errore durante il login.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 bg-theme text-theme">
            <form onSubmit={handleLogin}
                className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 rounded-xl shadow-xl bg-theme text-theme border space-y-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-center">Accedi al tuo account</h2>

                {/* Email */}
                <div className="relative">
                    <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 icon-color" />
                    <input name="email" type="email" placeholder="Email"
                        value={email} onChange={(e) => setEmail(e.target.value)} required
                        className="w-full pl-10 pr-4 py-2 rounded-md border" />
                </div>

                {/* Password */}
                <div className="relative">
                    <FontAwesomeIcon icon={showPassword ? faLockOpen : faLock} className="absolute left-3 top-1/2 -translate-y-1/2 icon-color" />
                    <input name="password" type={showPassword ? "text" : "password"} placeholder="Password"
                        value={password} onChange={(e) => setPassword(e.target.value)} required
                        className="w-full pl-10 pr-12 py-2 rounded-md border" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                </div>

                <CaptchaStatus ready={captchaReady} />
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg">
                    {loading ? "Accesso in corso..." : "Login"}
                </button>

                <p className="text-center text-sm">
                    <button type="button" onClick={() => navigate("/forgot-password")} className="text-blue-600 hover:underline">
                        Hai dimenticato la password?
                    </button>
                </p>
                <p className="text-center text-sm">
                    Non hai un account? <Link to="/register" className="text-blue-600 hover:underline">Registrati</Link>
                </p>
            </form>
        </div>
    );
}

export default function LoginForm() {
    return (
        <GoogleReCaptchaProvider reCaptchaKey="6LdKArcrAAAAANmGpTkLa-GopiPqy1BUreHKmDfL">
            <LoginInnerForm />
        </GoogleReCaptchaProvider>
    );
}
