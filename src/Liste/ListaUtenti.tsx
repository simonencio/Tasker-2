import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUser,
    faPen,
    faFolderOpen,

} from "@fortawesome/free-solid-svg-icons";
import MiniUserEditorModal from "../Modifica/MiniUserEditorModal";

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
    const [utenteDaModificareId, setUtenteDaModificareId] = useState<string | null>(null);
    const [utenteAttivo, setUtenteAttivo] = useState<Utente | null>(null); // 🔹 per modale progetti

    const navigate = useNavigate();

    // carica utenti
    useEffect(() => {
        const caricaUtenti = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("utenti")
                .select(`
                    id, nome, cognome, email, avatar_url, deleted_at,
                    ruolo:ruoli(id, nome),
                    progetti:utenti_progetti(progetti(id, nome, slug, deleted_at))
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
    }, [utenteDaModificareId]);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* intestazione */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme">
                    <FontAwesomeIcon icon={faUser} className="text-purple-500 mr-2" />
                    Lista Utenti
                </h1>
            </div>

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-7xl mx-auto">
                    {/* header tabella */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        <div className="w-10 shrink-0" />
                        <div className="flex-1">Nome</div>
                        <div className="w-20 shrink-0 text-center">Azioni</div>
                    </div>

                    {/* righe utenti */}
                    {utenti.map(utente => (
                        <div key={utente.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                            {/* riga principale */}
                            <div className="flex items-center px-4 py-3 text-sm text-theme">
                                {/* avatar */}
                                <div className="w-10 shrink-0 flex items-center justify-center">
                                    {utente.avatar_url ? (
                                        <img
                                            src={utente.avatar_url}
                                            alt="Avatar"
                                            className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
                                            {utente.nome[0]?.toUpperCase() ?? "?"}
                                        </div>
                                    )}
                                </div>

                                {/* nome */}
                                <div className="flex-1 font-medium truncate">
                                    {utente.nome} {utente.cognome}
                                </div>

                                {/* azioni */}
                                <div className="w-20 flex justify-end items-center gap-3 shrink-0">
                                    {utente.progetti.length > 0 && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setUtenteAttivo(utente); // 🔹 apre modale progetti
                                            }}
                                            className="icon-color hover:text-violet-600"
                                            title="Progetti utente"
                                        >
                                            <FontAwesomeIcon icon={faFolderOpen} />
                                        </button>
                                    )}
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            setUtenteDaModificareId(utente.id);
                                        }}
                                        className="icon-color hover:text-blue-600"
                                        title="Modifica utente"
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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

            {/* MODALE MODIFICA UTENTE */}
            {utenteDaModificareId && (
                <MiniUserEditorModal
                    utenteId={utenteDaModificareId}
                    onClose={() => setUtenteDaModificareId(null)}
                />
            )}
        </div>
    );
}
