import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEnvelope,
    faLock,
    faLockOpen,
    faEye,
    faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        } else {
            navigate("/home");
        }

        setLoading(false);
    };

    return (
        <div className="max-w-lg mx-auto mt-12">
            <form
                onSubmit={handleLogin}
                className="modal-container shadow-xl rounded-2xl p-8 space-y-6"
            >
                <h2 className="text-2xl font-bold text-theme text-center">Accedi al tuo account</h2>

                {/* Email */}
                <div className="relative">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        className="absolute left-3 top-1/2 -translate-y-1/2 icon-color"
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="off"
                        className="input-style bg-white text-black pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <FontAwesomeIcon
                        icon={showPassword ? faLockOpen : faLock}
                        className="absolute left-3 top-1/2 -translate-y-1/2 icon-color"
                    />
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="input-style bg-white text-black pl-10 pr-12 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 icon-color hover-bg-theme p-1 rounded transition"
                    >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                </div>

                {/* Errore */}
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Accesso in corso..." : "Login"}
                </button>

                {/* Link registrazione */}
                <p className="text-center text-theme">
                    Non hai un account?{" "}
                    <Link className="text-blue-600 hover:underline" to="/register">
                        Registrati
                    </Link>
                </p>
            </form>
        </div>
    );
}
