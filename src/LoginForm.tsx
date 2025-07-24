import { useState } from "react";
import { supabase } from "./supporto/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";



export default function LoginForm() {

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
        <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-8 p-6 bg-white shadow-md rounded-xl space-y-4">
            <h2 className="text-xl font-semibold">Login</h2>

            <div className="relative">

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full border p-2 rounded "
                />

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full border p-2 rounded"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                    {loading ? "Caricamento..." : "Login"}
                </button>
            </div>

            {error && <p className="text-red-600">{error}</p>}
            <p className="text-center">
                Non hai un account? <Link className="text-blue-600 underline" to="/register">Registrati</Link>
            </p>
        </form>
    );
}
