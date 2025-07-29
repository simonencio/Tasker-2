import { useEffect, useState } from "react";
import { supabase, AVATAR_BASE_URL } from "./supporto/supabaseClient";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUser,
    faEnvelope,
    faLock,
    faLockOpen,
    faImage,
    faEye,
    faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

export default function RegisterForm() {
    const [form, setForm] = useState({
        email: "",
        confermaEmail: "",
        password: "",
        confermaPassword: "",
        nome: "",
        cognome: "",
        avatar: "",
    });

    const [avatars, setAvatars] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchAvatars = async () => {
            const { data } = await supabase.storage.from("avatars").list("", { limit: 100 });
            if (data) {
                const filtered = data
                    .filter((f) =>
                        f.name && f.metadata && /\.(png|jpe?g|webp|gif)$/i.test(f.name)
                    )
                    .map((f) => f.name);
                setAvatars(filtered);
            }
        };
        fetchAvatars();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (form.email !== form.confermaEmail) {
            setError("Le email non coincidono.");
            setLoading(false);
            return;
        }

        if (form.password !== form.confermaPassword) {
            setError("Le password non coincidono.");
            setLoading(false);
            return;
        }

        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    emailRedirectTo: "http://localhost:5173/confirm-email",
                    data: {
                        nome: form.nome,
                        cognome: form.cognome,
                        avatar: form.avatar || null,
                    },
                },
            });

            if (signUpError || !signUpData.user) throw signUpError || new Error("Registrazione fallita.");
            const userId = signUpData.user.id;

            const { error: insertUserError } = await supabase.from("utenti").insert({
                id: userId,
                email: form.email,
                nome: form.nome,
                cognome: form.cognome,
                avatar: form.avatar || null,
                ruolo: 1,
            });

            if (insertUserError) throw insertUserError;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Errore durante la registrazione.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-12 p-8 modal-container text-center rounded-2xl shadow-lg">
                <p className="text-theme text-xl font-semibold">
                    ✅ Registrazione completata! Controlla la tua email per confermare.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto mt-12">
            <form onSubmit={handleRegister} className="modal-container shadow-xl rounded-2xl p-8 space-y-6">
                <h2 className="text-2xl font-bold text-theme text-center">Crea il tuo account</h2>

                {/* Nome e Cognome */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {["nome", "cognome"].map((field) => (
                        <div key={field} className="relative">
                            <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 icon-color" />
                            <input
                                name={field}
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                value={form[field as keyof typeof form]}
                                onChange={handleChange}
                                required
                                autoComplete="off"
                                className="input-style pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            />
                        </div>
                    ))}
                </div>

                {/* Email */}
                {["email", "confermaEmail"].map((field) => (
                    <div key={field} className="relative">
                        <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 icon-color" />
                        <input
                            name={field}
                            type="email"
                            placeholder={field === "email" ? "Email" : "Conferma Email"}
                            value={form[field as keyof typeof form]}
                            onChange={handleChange}
                            required
                            autoComplete="off"
                            className="input-style pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        />
                    </div>
                ))}

                {/* Password */}
                {[
                    { field: "password", show: showPassword, setShow: setShowPassword },
                    { field: "confermaPassword", show: showConfirmPassword, setShow: setShowConfirmPassword },
                ].map(({ field, show, setShow }) => (
                    <div key={field} className="relative">
                        <FontAwesomeIcon
                            icon={show ? faLockOpen : faLock}
                            className="absolute left-3 top-1/2 -translate-y-1/2 icon-color"
                        />
                        <input
                            name={field}
                            type={show ? "text" : "password"}
                            placeholder={field === "password" ? "Password" : "Conferma Password"}
                            value={form[field as keyof typeof form]}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                            className="input-style pl-10 pr-12 py-2 w-full rounded-lg border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        />
                        <button
                            type="button"
                            onClick={() => setShow(!show)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 icon-color hover-bg-theme p-1 rounded transition"
                        >
                            <FontAwesomeIcon icon={show ? faEyeSlash : faEye} />
                        </button>
                    </div>
                ))}

                {/* Avatar Picker */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-theme flex items-center gap-2">
                        <FontAwesomeIcon icon={faImage} className="icon-color" />
                        Seleziona un avatar (opzionale):
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <div
                            onClick={() => setForm((f) => ({ ...f, avatar: "" }))}
                            className={`w-12 h-12 rounded-full cursor-pointer flex items-center justify-center text-sm font-bold bg-gray-100 hover:bg-blue-100 transition ${form.avatar === "" ? "ring-2 ring-blue-500" : "opacity-70 hover:opacity-100"
                                }`}
                        >
                            N/A
                        </div>
                        {avatars.map((file) => {
                            const url = `${AVATAR_BASE_URL}${file}`;
                            return (
                                <img
                                    key={file}
                                    src={url}
                                    alt={file}
                                    onClick={() => setForm((f) => ({ ...f, avatar: url }))}
                                    className={`w-12 h-12 rounded-full object-cover cursor-pointer transition ${form.avatar === url ? "ring-2 ring-blue-500" : "opacity-70 hover:opacity-100"
                                        }`}
                                />
                            );
                        })}
                    </div>
                </div>

                {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Registrazione in corso..." : "Registrati"}
                </button>

                <p className="text-center text-theme">
                    Hai già un account?{" "}
                    <Link className="text-blue-600 hover:underline" to="/">
                        Accedi
                    </Link>
                </p>
            </form>
        </div>
    );
}
