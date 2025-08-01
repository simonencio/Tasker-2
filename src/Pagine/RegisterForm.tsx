import { useEffect, useState } from "react";
import { supabase, AVATAR_BASE_URL } from "../supporto/supabaseClient";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUser, faEnvelope, faLock, faLockOpen, faImage, faEye, faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

export default function RegisterForm() {
    const [form, setForm] = useState({
        email: "", confermaEmail: "", password: "", confermaPassword: "",
        nome: "", cognome: "", avatar: "",
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
                    .filter((f) => f.name && /\.(png|jpe?g|webp|gif)$/i.test(f.name))
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
            setError("Le email non coincidono."); setLoading(false); return;
        }
        if (form.password !== form.confermaPassword) {
            setError("Le password non coincidono."); setLoading(false); return;
        }

        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    emailRedirectTo: "http://localhost:5173/confirm-email",
                    data: { nome: form.nome, cognome: form.cognome, avatar: form.avatar || null },
                },
            });
            if (signUpError || !signUpData.user) throw signUpError || new Error("Registrazione fallita.");
            const userId = signUpData.user.id;

            const { error: insertUserError } = await supabase.from("utenti").insert({
                id: userId, email: form.email, nome: form.nome, cognome: form.cognome,
                avatar: form.avatar || null, ruolo: 1,
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
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-theme text-theme">
                <div className="max-w-md p-8 text-center rounded-xl shadow-xl bg-theme text-theme border border-gray-200 dark:border-[#444]">
                    <p className="text-xl font-semibold">
                        ✅ Registrazione completata! Controlla la tua email per confermare.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 bg-theme text-theme">
            <form
                onSubmit={handleRegister}
                className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 rounded-xl shadow-xl bg-theme text-theme border border-gray-200 dark:border-[#444] space-y-6"
            >
                <h2 className="text-2xl sm:text-3xl font-bold text-center">
                    Crea il tuo account
                </h2>

                {/* Nome + Cognome */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {["nome", "cognome"].map((field) => (
                        <div key={field} className="relative">
                            <FontAwesomeIcon
                                icon={faUser}
                                className="absolute left-3 top-1/2 -translate-y-1/2 icon-color text-base sm:text-lg"
                            />
                            <input
                                name={field}
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                value={form[field as keyof typeof form]}
                                onChange={handleChange}
                                required
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-2.5 md:py-3 rounded-md border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{
                                    backgroundColor: "var(--color-background-light)",
                                    color: "var(--color-text-light)",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Email + Conferma Email */}
                {["email", "confermaEmail"].map((field) => (
                    <div key={field} className="relative">
                        <FontAwesomeIcon
                            icon={faEnvelope}
                            className="absolute left-3 top-1/2 -translate-y-1/2 icon-color text-base sm:text-lg"
                        />
                        <input
                            name={field}
                            type="email"
                            placeholder={field === "email" ? "Email" : "Conferma Email"}
                            value={form[field as keyof typeof form]}
                            onChange={handleChange}
                            required
                            autoComplete="off"
                            className="w-full pl-10 pr-4 py-2.5 md:py-3 rounded-md border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: "var(--color-background-light)",
                                color: "var(--color-text-light)",
                            }}
                        />
                    </div>
                ))}

                {/* Password + Conferma Password */}
                {[{ field: "password", show: showPassword, setShow: setShowPassword },
                { field: "confermaPassword", show: showConfirmPassword, setShow: setShowConfirmPassword }]
                    .map(({ field, show, setShow }) => (
                        <div key={field} className="relative">
                            <FontAwesomeIcon
                                icon={show ? faLockOpen : faLock}
                                className="absolute left-3 top-1/2 -translate-y-1/2 icon-color text-base sm:text-lg"
                            />
                            <input
                                name={field}
                                type={show ? "text" : "password"}
                                placeholder={field === "password" ? "Password" : "Conferma Password"}
                                value={form[field as keyof typeof form]}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                                className="w-full pl-10 pr-12 py-2.5 md:py-3 rounded-md border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{
                                    backgroundColor: "var(--color-background-light)",
                                    color: "var(--color-text-light)",
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShow(!show)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 icon-color hover-bg-theme p-1.5 rounded transition"
                                aria-label="Mostra/Nascondi password"
                            >
                                <FontAwesomeIcon icon={show ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    ))}

                {/* Avatar Picker */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-theme">
                        <FontAwesomeIcon icon={faImage} />
                        Seleziona un avatar (opzionale):
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <div
                            onClick={() => setForm((f) => ({ ...f, avatar: "" }))}
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-theme text-theme cursor-pointer transition hover:ring-2 hover:ring-blue-300 ${form.avatar === "" ? "ring-2 ring-blue-500" : "opacity-70 hover:opacity-100"}`}



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
                                    className={`w-12 h-12 rounded-full object-cover cursor-pointer transition ${form.avatar === url ? "ring-2 ring-blue-500" : "opacity-70 hover:opacity-100"}`}
                                />
                            );
                        })}
                    </div>
                </div>

                {error && (
                    <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-sm sm:text-base transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Registrazione in corso..." : "Registrati"}
                </button>

                <p className="text-center text-sm sm:text-base text-theme">
                    Hai già un account?{" "}
                    <Link to="/" className="text-blue-600 hover:underline">
                        Accedi
                    </Link>
                </p>
            </form>
        </div>
    );
}
