import { useState } from "react";
import { supabase } from "./supporto/supabaseClient";
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from "lucide-react";

export default function RegisterForm() {
    const [form, setForm] = useState({
        email: '',
        confermaEmail: '',
        password: '',
        confermaPassword: '',
        nome: '',
        cognome: '',
        avatar: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();

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
                        avatar: form.avatar
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
                ruolo: 1,
            });
            if (insertUserError) throw insertUserError;

            const { data: tipo, error: tipoErr } = await supabase
                .from("notifiche_tipi")
                .select("id")
                .eq("codice", "UTENTE_REGISTRATO")
                .single();

            if (!tipoErr && tipo?.id) {
                const { data: notificaData, error: notificaError } = await supabase
                    .from("notifiche")
                    .insert({
                        tipo_id: tipo.id,
                        messaggio: `🎉 Benvenuto ${form.nome} in Tasker`,
                        destinatari_tutti: false,
                        creatore_id: null,
                    })
                    .select("id")
                    .single();

                if (!notificaError && notificaData?.id) {
                    await supabase.from("notifiche_utenti").insert({
                        notifica_id: notificaData.id,
                        utente_id: userId,
                    });
                }
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Errore durante la registrazione.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow bg-green-50 text-center">
                <p className="text-green-700 text-lg font-semibold">
                    ✅ Registrazione completata! Controlla la tua email per confermare.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-20 space-y-4">
            <h1 className="text-2xl font-bold">Registrati</h1>
            <form onSubmit={handleRegister} className="space-y-4">
                <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} className="w-full p-2 border rounded" />
                <input name="cognome" placeholder="Cognome" value={form.cognome} onChange={handleChange} className="w-full p-2 border rounded" />
                <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full p-2 border rounded" />
                <input name="confermaEmail" type="email" placeholder="Conferma Email" value={form.confermaEmail} onChange={handleChange} className="w-full p-2 border rounded" />

                <div className="relative">
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-blue-600"
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                <div className="relative">
                    <input
                        name="confermaPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Conferma Password"
                        value={form.confermaPassword}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-blue-600"
                    >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                <input name="avatar" placeholder="URL Avatar (opzionale)" value={form.avatar} onChange={handleChange} className="w-full p-2 border rounded" />

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
                    {loading ? "Registrazione in corso..." : "Registrati"}
                </button>
            </form>

            <p className="text-center">
                Hai già un account? <Link className="text-blue-600 underline" to="/">Accedi</Link>
            </p>
        </div>
    );
}
