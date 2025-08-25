import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import ListaGenerica from "./ListaGenerica";
import MiniUserEditorModal from "../Modifica/MiniUserEditorModal";
import { fetchUtenti } from "../supporto/fetchData";

type Utente = {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    avatar_url?: string | null;
    ruolo: { id: number; nome: string };
    progetti: { id: string; nome: string; slug?: string }[];
};

export default function ListaUtenti() {
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(true);
    const [utenteAttivo, setUtenteAttivo] = useState<Utente | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchUtenti()
            .then(setUtenti)
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <ListaGenerica<Utente>
                titolo="Lista Utenti"
                icona={faUser}
                coloreIcona="text-purple-500"
                tipo="utenti"
                dati={utenti}
                loading={loading}
                colonne={[
                    {
                        chiave: "avatar",
                        label: "",
                        className: "w-10 shrink-0",
                        render: (u) =>
                            u.avatar_url ? (
                                <img
                                    src={u.avatar_url}
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
                                    {u.nome[0]?.toUpperCase() ?? "?"}
                                </div>
                            ),
                    },
                    {
                        chiave: "nomeCompleto",
                        label: "Nome",
                        className: "flex-1 font-medium truncate",
                        render: (u) => `${u.nome} ${u.cognome}`,
                    },
                ]}
                azioni={(u) => (
                    <>
                        {u.progetti.length > 0 && (
                            <button
                                onClick={() => setUtenteAttivo(u)}
                                className="icon-color hover:text-violet-600"
                                title="Progetti utente"
                            >
                                <FontAwesomeIcon icon={faFolderOpen} />
                            </button>
                        )}
                    </>
                )}
                renderDettaglio={(u) => (
                    <>
                        <p>Email: {u.email}</p>
                        <p>Ruolo: {u.ruolo?.nome}</p>
                    </>
                )}
                renderModaleModifica={(id, onClose) => (
                    <MiniUserEditorModal utenteId={id} onClose={onClose} />
                )}
            />

            {/* MODALE PROGETTI */}
            {utenteAttivo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="modal-container bg-theme text-theme shadow-xl rounded-xl p-6 w-[90%] max-w-md animate-scale-fade">
                        <h2 className="text-xl font-bold mb-4 text-center">
                            📁 Progetti di {utenteAttivo.nome}
                        </h2>
                        <ul className="ml-5 space-y-2 max-h-[50vh] overflow-y-auto">
                            {utenteAttivo.progetti.map((p) => (
                                <li
                                    key={p.id}
                                    className="cursor-pointer link hover:underline"
                                    onClick={() => navigate(`/progetti/${p.slug ?? p.id}`)}
                                >
                                    {p.nome}
                                </li>
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
                </div>
            )}
        </>
    );
}
