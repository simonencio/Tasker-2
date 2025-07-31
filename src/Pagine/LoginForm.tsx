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
        if (error) setError(error.message);
        else navigate("/home");
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 bg-theme text-theme">

            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 rounded-xl shadow-xl bg-white dark:bg-[#2c3542] text-gray-800 dark:text-gray-100 space-y-6"
            >
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
                    Accedi al tuo account
                </h2>

                {/* Email */}
                <div className="relative">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 text-base sm:text-lg"
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="off"
                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 md:py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f2937] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <FontAwesomeIcon
                        icon={showPassword ? faLockOpen : faLock}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 text-base sm:text-lg"
                    />
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full pl-10 pr-12 py-2 sm:py-2.5 md:py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f2937] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded transition"
                        aria-label="Mostra/Nascondi password"
                    >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                </div>

                {error && (
                    <p className="text-red-600 dark:text-red-400 text-sm text-center">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-sm sm:text-base transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Accesso in corso..." : "Login"}
                </button>

                <p className="text-center text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    Non hai un account?{" "}
                    <Link to="/register" className="text-blue-600 hover:underline">
                        Registrati
                    </Link>
                </p>
            </form>
        </div>
    );
}
