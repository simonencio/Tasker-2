import { useState, useEffect } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import "toaster-js/default.css";
import "../App.css";
import { useToast } from '../supporto/useToast'



export default function ModificaEmail() {
    const toast = useToast();

    const [aperto, setAperto] = useState(false);
    const toggleAperto = () => setAperto(!aperto);

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    const aggiornaEmail = async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { error: authError } = await supabase.auth.updateUser({ email });
        const { error: utentiError } = await supabase
            .from("utenti")
            .update({ email })
            .eq("id", user.id);

        if (authError || utentiError) {
            toast("Errore nel salvataggio", 'error');
        } else {
            toast("Email cambiata con successo", 'success');
        }
    };

    return (
        <div className="modal-container max-w-xl mx-auto rounded-xl shadow p-4 space-y-4 mb-6">
            <button
                onClick={toggleAperto}
                className="w-full flex justify-between items-center text-theme font-semibold text-xl focus:outline-none"
            >
                <span>Modifica Email</span>
                <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} className="text-lg" />
            </button>

            {aperto && (
                <>
                    <label className="block text-sm text-theme mb-1 mt-4">Nuova Email</label>
                    <input
                        type="email"
                        className="input-style w-full"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button onClick={aggiornaEmail} className="mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                        Aggiorna Email
                    </button>
                    {message && <p className="text-sm text-theme">{message}</p>}
                </>
            )}
        </div>
    );
}
