import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
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
        <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-4 sm:px-6 md:px-8 bg-theme">
            <form
                onSubmit={handleLogin}
                className="
            modal-container shadow-xl bg-theme rounded-2xl w-full 
            max-w-sm  
            md:max-w-md lg:max-w-md 
            xl:max-w-md 
            2xl:max-w-3xl
            

            p-6 sm:p-8 md:p-8 xl:p-8 2xl:p-10 
            space-y-6"
            >
                <h2 className="text-center font-bold text-xl sm:text-2xl text-theme">
                    Accedi al tuo account
                </h2>

                {/* Email */}
                <div className="relative">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        className="absolute left-3 top-1/2 -translate-y-1/2 icon-color text-base"
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="off"
                        className="input-style placeholder-gray-500 text-sm sm:text-base md:text-base 2xl:text-base bg-white dark:bg-zinc-800 dark:text-white pl-10 pr-4 py-2.5 sm:py-3 w-full rounded-lg border border-gray-300 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <FontAwesomeIcon
                        icon={showPassword ? faLockOpen : faLock}
                        className="absolute left-3 top-1/2 -translate-y-1/2 icon-color text-base"
                    />
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="input-style placeholder-gray-500 text-sm sm:text-base md:text-base 2xl:text-base bg-white dark:bg-zinc-800 dark:text-white pl-10 pr-12 py-2.5 sm:py-3 w-full rounded-lg border border-gray-300 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 icon-color hover-bg-theme p-1 sm:p-1.5 rounded transition"
                    >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                </div>

                {/* Errore */}
                {error && <p className="text-red-600 text-sm sm:text-base text-center">{error}</p>}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base md:text-base py-2.5 sm:py-3 md:py-3.5 rounded-lg tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Accesso in corso..." : "Login"}
                </button>

                {/* Link registrazione */}
                <p className="text-center text-sm sm:text-base text-theme">
                    Non hai un account?{" "}
                    <Link className="text-blue-600 hover:underline" to="/register">
                        Registrati
                    </Link>
                </p>
            </form>
        </div>
    );
}
