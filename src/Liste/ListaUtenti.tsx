import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPen, faFolderOpen, faEnvelope, faUser
} from "@fortawesome/free-solid-svg-icons";

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
    const [utenteEspanso, setUtenteEspanso] = useState<string | null>(null);
    const [utenteAttivo, setUtenteAttivo] = useState<Utente | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

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
        <div className="min-h-screen bg-theme text-theme p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-purple-500 w-6 h-6" />
                Lista Utenti
            </h1>

            {loading ? (
                <p className="text-center text-lg">Caricamento...</p>
            ) : (
                <div className="max-w-4xl mx-auto card-theme shadow-md">
                    {/* INTESTAZIONE */}
                    <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-[15px] font-semibold text-theme gap-2 sm:gap-4">
                        <div className="flex-1 pl-0 sm:pl-[48px] text-left">Nome</div>
                        <div className="hidden sm:flex sm:w-40 items-center justify-center">Email</div>
                        <div className="hidden sm:flex sm:w-32 items-center justify-center">Ruolo</div>
                        <div className="hidden sm:flex w-auto items-center justify-center">Azioni</div>
                        <div className="w-6" />
                    </div>

                    {/* RIGHE UTENTI */}
                    {utenti.map((utente) => (
                        <div key={utente.id} className="border-t border-gray-100 dark:border-gray-700 hover-bg-theme transition">
                            <div
                                className="flex items-center px-4 py-3 gap-2 sm:gap-4 cursor-pointer"
                                onClick={() => {
                                    if (window.innerWidth <= 640) {
                                        setUtenteEspanso(prev => prev === utente.id ? null : utente.id);
                                    }
                                }}
                            >
                                {/* Avatar + Nome */}
                                <div className="flex-1 flex items-center gap-3 text-sm sm:text-[15px] font-medium pl-0 sm:pl-[48px] text-left">
                                    {utente.avatar_url ? (
                                        <img src={utente.avatar_url} alt="Avatar" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-200">
                                            N/A
                                        </div>
                                    )}

                                    {utente.nome} {utente.cognome}
                                </div>

                                {/* Email */}
                                <div className="hidden sm:flex sm:w-40 justify-center text-sm">
                                    {utente.email || <span className="italic text-gray-400">—</span>}
                                </div>

                                {/* Ruolo */}
                                <div className="hidden sm:flex sm:w-32 justify-center text-sm">
                                    {utente.ruolo?.nome || <span className="italic text-gray-400">—</span>}
                                </div>

                                {/* Azioni solo in desktop */}
                                <div className="hidden sm:flex w-auto gap-3 items-center justify-center text-theme text-sm">
                                    {utente.progetti.length > 0 && (
                                        <span
                                            className="cursor-pointer hover:text-violet-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUtenteAttivo(utente);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faFolderOpen} />
                                        </span>
                                    )}
                                    <span
                                        className="cursor-pointer hover:text-blue-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log("Modifica utente:", utente.id);
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </span>
                                </div>

                                {/* Toggle solo in mobile */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.innerWidth <= 640) {
                                            setUtenteEspanso(prev => prev === utente.id ? null : utente.id);
                                        }
                                    }}
                                    className="sm:hidden w-6 h-6 flex-shrink-0 text-blue-600 flex items-center justify-center rounded hover-bg-theme"
                                >
                                    {utenteEspanso === utente.id ? "−" : "+"}
                                </button>
                            </div>

                            {/* DETTAGLI SOLO MOBILE */}
                            {utenteEspanso === utente.id && (
                                <div className="px-4 py-3 text-sm space-y-3 bg-theme border-t border-gray-100 dark:border-gray-700 animate-scale-fade sm:hidden">
                                    {/* Email */}
                                    <div className="flex items-start gap-2">
                                        <FontAwesomeIcon icon={faEnvelope} className="icon-color w-4 h-4 mt-[2px]" />
                                        <div>
                                            <span className="font-semibold">Email</span><br />
                                            {utente.email}
                                        </div>
                                    </div>

                                    {/* Ruolo */}
                                    <div className="flex items-start gap-2">
                                        <FontAwesomeIcon icon={faUser} className="icon-color w-4 h-4 mt-[2px]" />
                                        <div>
                                            <span className="font-semibold">Ruolo</span><br />
                                            {utente.ruolo?.nome}
                                        </div>
                                    </div>

                                    {/* Azioni */}
                                    <div className="flex gap-6 pt-2 text-[15px]">
                                        {utente.progetti.length > 0 && (
                                            <span
                                                className="cursor-pointer hover:text-violet-500"
                                                onClick={() => setUtenteAttivo(utente)}
                                            >
                                                <FontAwesomeIcon icon={faFolderOpen} className="mr-1" />
                                                Progetti
                                            </span>
                                        )}
                                        <span
                                            className="cursor-pointer hover:text-blue-500"
                                            onClick={() => console.log("Modifica utente:", utente.id)}
                                        >
                                            <FontAwesomeIcon icon={faPen} className="mr-1" />
                                            Modifica
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* MODALE PROGETTI */}
            {utenteAttivo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="modal-container bg-theme text-theme shadow-xl rounded-xl p-6 w-[90%] max-w-md animate-scale-fade">
                        <h2 className="text-xl font-bold mb-4 text-center">📁 Progetti di {utenteAttivo.nome}</h2>
                        <ul className="ml-5 space-y-2 max-h-[50vh] overflow-y-auto">
                            {utenteAttivo.progetti.map((p) => (
                                <li key={p.id} className="text-sm link hover:underline cursor-pointer">
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
        </div>
    );
}
