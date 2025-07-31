import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faFolderOpen, faEnvelope, faUser } from "@fortawesome/free-solid-svg-icons";

type Utente = {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    avatar_url?: string | null;
    ruolo: { id: number; nome: string };
    progetti: { id: string; nome: string }[];
};

export default function ListaUtenti() {
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(true);
    const [utenteAttivo, setUtenteAttivo] = useState<Utente | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkRuolo = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("utenti")
                .select("ruolo")
                .eq("id", user.id)
                .single();

            if (!error && data && data.ruolo === 1) {
                setIsAdmin(true);
            }
        };

        checkRuolo();
    }, []);

    useEffect(() => {
        if (!isAdmin) return;

        const caricaUtenti = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("utenti")
                .select(`
          id, nome, cognome, email, avatar_url, deleted_at,
          ruolo:ruoli(id, nome),
          progetti:utenti_progetti(progetti(id, nome, deleted_at))
        `)
                .order("created_at", { ascending: false });

            if (!error && data) {
                const utentiPuliti: Utente[] = data
                    .filter((u) => !u.deleted_at)
                    .map((u: any) => ({
                        ...u,
                        ruolo: u.ruolo,
                        progetti: (u.progetti || [])
                            .map((up: any) => up.progetti)
                            .filter((p: any) => p && !p.deleted_at),
                    }));
                setUtenti(utentiPuliti);
            }

            setLoading(false);
        };

        caricaUtenti();
    }, [isAdmin]);

    if (!isAdmin) return <p className="p-6 text-theme">⛔ Accesso riservato agli amministratori.</p>;

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-theme mb-6">👤 Lista Utenti</h1>

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {utenti.map((utente) => (
                        <div
                            key={utente.id}
                            onClick={() => navigate(`/profilo/${utente.id}`)}
                            className="cursor-pointer card-theme hover:bg-gray-50 dark:hover:bg-gray-700 transition-all p-5"
                        >
                            {/* Badge progetti */}
                            {utente.progetti.length > 0 && (
                                <div className="mb-3 flex justify-between items-center">
                                    <div />
                                    <div className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                                        {utente.progetti.length} progett{utente.progetti.length > 1 ? "i" : "o"}
                                    </div>
                                </div>
                            )}

                            {/* Nome e cognome */}
                            <h2 className="text-xl font-semibold mb-1">
                                {utente.nome} {utente.cognome}
                            </h2>

                            {/* Avatar */}
                            {utente.avatar_url && (
                                <img
                                    src={utente.avatar_url}
                                    alt="Avatar"
                                    className="w-16 h-16 rounded-full object-cover mb-3"
                                />
                            )}

                            {/* Email */}
                            {utente.email && (
                                <p className="text-sm mb-1">
                                    <FontAwesomeIcon icon={faEnvelope} className="mr-1 icon-color" />
                                    <span className="font-medium">{utente.email}</span>
                                </p>
                            )}

                            {/* Ruolo */}
                            {utente.ruolo && (
                                <p className="text-sm mb-1">
                                    <FontAwesomeIcon icon={faUser} className="mr-1 icon-color" />
                                    <span className="font-medium italic">{utente.ruolo.nome}</span>
                                </p>
                            )}

                            {/* Azioni */}
                            <div className="mt-4 flex justify-between items-center">
                                {utente.progetti.length > 0 ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUtenteAttivo(utente);
                                        }}
                                        className="flex items-center gap-2 text-sm icon-color hover:text-green-500"
                                    >
                                        <FontAwesomeIcon icon={faFolderOpen} />
                                        Mostra progetti
                                    </button>
                                ) : <span />}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Modifica utente:", utente.id);
                                    }}
                                    className="text-sm text-theme hover:text-blue-500"
                                    aria-label={`Modifica utente ${utente.nome}`}
                                >
                                    <FontAwesomeIcon icon={faPen} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODALE PROGETTI */}
            {utenteAttivo && (
                <div className="absolute left-1/2 top-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 modal-container bg-theme text-theme shadow-lg rounded-xl p-6 w-[90%] max-w-md animate-scale-fade">
                    <h2 className="text-xl font-bold mb-4 text-center">
                        📁 Progetti di {utenteAttivo.nome}
                    </h2>
                    <ul className="list-disc ml-5 space-y-2 max-h-[50vh] overflow-y-auto">
                        {utenteAttivo.progetti.map((p) => (
                            <li key={p.id} className="text-sm">{p.nome}</li>
                        ))}
                    </ul>
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setUtenteAttivo(null)}
                            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white transition"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
