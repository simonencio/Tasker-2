import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";

export default function ModificaPassword() {
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const aggiornaPassword = async () => {
        const { error } = await supabase.auth.updateUser({ password });
        setMessage(error ? `Errore: ${error.message}` : "Password aggiornata.");
    };

    return (
        <div>
            <h2 className="text-xl font-semibold">Modifica Password</h2>
            <input
                type="password"
                className="border p-2 w-full my-2"
                placeholder="Nuova password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={aggiornaPassword} className="bg-blue-600 text-white px-4 py-2 rounded">
                Aggiorna Password
            </button>
            {message && <p className="mt-2">{message}</p>}
        </div>
    );
}
