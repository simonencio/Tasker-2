import { useEffect, useState } from "react";
import { supabase } from "./supporto/supabaseClient";

export default function ConfirmEmailWelcome() {
    const [nome, setNome] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [errore, setErrore] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                setErrore("Errore durante la conferma. Utente non trovato.");
                setLoading(false);
                return;
            }

            const userId = session.user.id;

            const { data: utente, error: userError } = await supabase
                .from("utenti")
                .select("nome")
                .eq("id", userId)
                .single();

            if (userError || !utente) {
                setErrore("Errore nel recupero del profilo utente.");
            } else {
                setNome(utente.nome);
            }

            setLoading(false);
        };

        fetchUser();
    }, []);

    if (loading) return <p className="text-center mt-10">🔄 Conferma in corso...</p>;
    if (errore) return <p className="text-center text-red-500 mt-10">{errore}</p>;

    return (
        <div className="text-center mt-10">
            <h1 className="text-2xl font-bold text-green-600">✅ Email confermata</h1>
            <p className="mt-4 text-lg">🎉 Benvenuto <strong>{nome}</strong> in Tasker!</p>
        </div>
    );
}
