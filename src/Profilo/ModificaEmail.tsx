import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";

export default function ModificaEmail() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    const aggiornaEmail = async () => {
        const { error } = await supabase.auth.updateUser({ email });
        setMessage(error ? `Errore: ${error.message}` : "Email aggiornata. Controlla la tua casella per confermare.");
    };

    return (
        <div>
            <h2 className="text-xl font-semibold">Modifica Email</h2>
            <input
                type="email"
                className="border p-2 w-full my-2"
                placeholder="Nuova email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={aggiornaEmail} className="bg-blue-600 text-white px-4 py-2 rounded">
                Aggiorna Email
            </button>
            {message && <p className="mt-2">{message}</p>}
        </div>
    );
}
