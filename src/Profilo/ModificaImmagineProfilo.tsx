import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import "toaster-js/default.css";
import "../App.css";
import { useToast } from '../supporto/useToast'
import { AVATAR_BASE_URL } from '../supporto/supabaseClient'

export default function ModificaImmagineProfilo() {
    const toast = useToast();

    const [immagini, setImmagini] = useState<string[]>([]);
    const [selezionata, setSelezionata] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const [aperto, setAperto] = useState(false);
    const toggleAperto = () => setAperto(!aperto);

    useEffect(() => {
        const caricaImmagini = async () => {
            const { data, error } = await supabase.storage.from("avatars").list("", {
                limit: 100,
                offset: 0,
                sortBy: { column: "name", order: "asc" }
            });

            if (error) {
                toast("Errore nel caricamento", 'error');
            } else if (data) {
                const files = data.filter(item => item.name.endsWith(".png") || item.name.endsWith(".jpg") || item.name.endsWith(".jpeg"));
                setImmagini(files.map(f => f.name));
            }
        };

        caricaImmagini();
    }, []);

    const salvaImmagine = async () => {
        if (!selezionata) {
            setMessage("Seleziona un'immagine.");
            return;
        }

        const path = `avatars/${selezionata}`;
        const fullUrl = `${AVATAR_BASE_URL}${selezionata}`;
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { error: authError } = await supabase.auth.updateUser({
            data: { avatar_url: fullUrl },
        });

        const { error: utentiError } = await supabase
            .from("utenti")
            .update({ avatar_url: fullUrl })
            .eq("id", user.id);

        if (authError || utentiError) {
             toast("Errore nel salvataggio", 'error');
        } else {
            toast("Immagine Aggiornata", 'success');
        }
    };


    const getPublicUrl = (name: string) => {
        return supabase.storage.from("avatars").getPublicUrl(name).data.publicUrl;
    };

    return (
        <div className="modal-container max-w-xl mx-auto rounded-xl shadow space-y-4 p-4">
            <button
                onClick={toggleAperto}
                className="w-full flex justify-between items-center text-theme font-semibold text-xl focus:outline-none"
            >
                <span>Immagine del Profilo</span>
                <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} className="text-lg" />
            </button>
            {aperto && (
                <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {immagini.map((img) => (
                            <img
                                key={img}
                                src={getPublicUrl(img)}
                                alt={img}
                                className={`cursor-pointer border-4 rounded ${selezionata === img ? "border-blue-500" : "border-transparent"}`}
                                onClick={() => setSelezionata(img)}
                            />
                        ))}
                    </div>
                    <button
                        onClick={salvaImmagine}
                        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Salva Immagine
                    </button>
                    {message && <p className="text-sm text-theme">{message}</p>}
                </>
            )}
        </div>
    );
}