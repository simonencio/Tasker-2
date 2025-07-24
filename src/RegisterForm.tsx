import { useState } from "react";
import { supabase } from "./supporto/supabaseClient";

export default function RegisterForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nome, setNome] = useState("");
    const [cognome, setCognome] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: "http://localhost:5173/confirm-email",
                    data: { nome, cognome },
                },
            });

            if (signUpError || !signUpData.user) throw signUpError || new Error("Registrazione fallita.");
            const userId = signUpData.user.id;

            const { error: insertUserError } = await supabase.from("utenti").insert({
                id: userId,
                email,
                nome,
                cognome,
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
                        messaggio: `🎉 Benvenuto ${nome} in Tasker`,
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
        <form onSubmit={handleRegister} className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow space-y-4 bg-white">
            <h2 className="text-xl font-bold text-center text-gray-800">Registrati su Tasker</h2>
            <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full p-2 border rounded" />
            <input type="text" placeholder="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} required className="w-full p-2 border rounded" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border rounded" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border rounded" />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Registrazione in corso..." : "Registrati"}
            </button>
        </form>
    );
}
