import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";

export default function ModificaImmagineProfilo() {
    const [immagini, setImmagini] = useState<string[]>([]);
    const [selezionata, setSelezionata] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const caricaImmagini = async () => {
            const { data, error } = await supabase.storage.from("avatars").list("", {
                limit: 100,
                offset: 0,
                sortBy: { column: "name", order: "asc" }
            });

            if (error) {
                setMessage(`Errore nel caricamento: ${error.message}`);
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
        const { error } = await supabase.auth.updateUser({
            data: { avatar_url: path },
        });

        setMessage(error ? `Errore: ${error.message}` : "Immagine del profilo aggiornata.");
    };

    const getPublicUrl = (name: string) => {
        return supabase.storage.from("avatars").getPublicUrl(name).data.publicUrl;
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Scegli immagine del profilo</h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {immagini.map((img) => (
                    <img
                        key={img}
                        src={getPublicUrl(img)}
                        alt={img}
                        className={`cursor-pointer border-4 rounded ${
                            selezionata === img ? "border-blue-500" : "border-transparent"
                        }`}
                        onClick={() => setSelezionata(img)}
                    />
                ))}
            </div>

            <button
                onClick={salvaImmagine}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
                Salva Immagine
            </button>

            {message && <p className="mt-2">{message}</p>}
        </div>
    );
}
