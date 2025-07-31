import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faUserCheck } from "@fortawesome/free-solid-svg-icons";

export default function ConfirmEmailWelcome() {
    const [nome, setNome] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [errore, setErrore] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.user) {
                setErrore("Errore durante la conferma. Utente non trovato.");
                setLoading(false);
                return;
            }

            const { data: utente, error: userError } = await supabase
                .from("utenti")
                .select("nome")
                .eq("id", session.user.id)
                .single();

            if (userError || !utente) {
                setErrore("Errore nel recupero del profilo utente.");
            } else {
                setNome(utente.nome);
                setTimeout(() => navigate("/home"), 2000);
            }

            setLoading(false);
        };

        fetchUser();
    }, [navigate]);

    return (
        <div className="w-full h-full flex justify-center items-center bg-theme text-theme px-4">
            {loading ? (
                <div className="text-lg">Caricamento...</div>
            ) : errore ? (
                <div className="text-red-500 text-lg text-center flex items-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-red-500 mr-2" />
                    {errore}
                </div>
            ) : (
                <div className="success-box flex flex-col items-center text-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-4xl mb-3" />
                    <h1 className="text-2xl font-bold mb-2">Email confermata!</h1>
                    <p className="text-lg">
                        <FontAwesomeIcon icon={faUserCheck} className="text-blue-500 mr-2" />
                        Benvenuto <strong>{nome}</strong> in{" "}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">Tasker</span>!
                    </p>
                </div>
            )}
        </div>
    );
}
