import { useState, useEffect } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import "toaster-js/default.css";
import "../App.css";
import { useToast } from '../supporto/useToast'



export default function ModificaNominativo() {
    const toast = useToast();

    const [aperto, setAperto] = useState(false);
    const toggleAperto = () => setAperto(!aperto);

    const [nome, setNome] = useState("");
    const [cognome, setCognome] = useState("");



    useEffect(() => {
        const caricaDati = async () => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from("utenti")
                .select("nome, cognome")
                .eq("id", user.id)
                .maybeSingle();

            if (!error && data) {
                setNome(data.nome ?? "");
                setCognome(data.cognome ?? "");
            }
        };

        caricaDati();
    }, []);

    const salva = async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { error } = await supabase
            .from("utenti")
            .update({ nome, cognome })
            .eq("id", user.id);

        if (error) {
            toast("Errore nel salvataggio", 'error');
        } else {
            toast("Modifcato con successo", 'success');
        }
    };

    return (
        <div className="modal-container max-w-xl mx-auto rounded-xl shadow p-4 space-y-4 mb-6">
            <button
                onClick={toggleAperto}
                className="w-full flex justify-between items-center text-theme font-semibold text-xl focus:outline-none"
            >
                <span>Modifica Nominativo</span>
                <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} className="text-lg" />
            </button>

            {aperto && (
                <>
                    <div>
                        <label className="block text-sm text-theme mb-1 mt-4">Nome</label>
                        <input
                            type="text"
                            className="input-style w-full"
                            placeholder="Mario"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-theme mb-1 mt-4">Cognome</label>
                        <input
                            type="text"
                            className="input-style w-full"
                            placeholder="Rossi"
                            value={cognome}
                            onChange={(e) => setCognome(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={salva}
                        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Modifica Dati
                    </button>
                </>
            )}
        </div>
    );
}






