import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faFolderOpen, faEnvelope, faPhone, faAddressBook } from "@fortawesome/free-solid-svg-icons";

type Cliente = {
    id: string;
    nome: string;
    email?: string | null;
    telefono?: string | null;
    avatar_url?: string | null;
    note?: string | null;
    progetti: { id: string; nome: string }[];
};

export default function ListaClienti() {
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [clienteAttivo, setClienteAttivo] = useState<Cliente | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const caricaClienti = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("clienti")
                .select(`
                    id, nome, email, telefono, avatar_url, note, deleted_at,
                    progetti:progetti ( id, nome, deleted_at )
                `)
                .order("created_at", { ascending: false });

            if (!error && data) {
                const clientiPuliti: Cliente[] = data
                    .filter((c) => !c.deleted_at)
                    .map((c: any) => ({
                        ...c,
                        progetti: (c.progetti || []).filter((p: any) => !p.deleted_at),
                    }));
                setClienti(clientiPuliti);
            }

            setLoading(false);
        };

        caricaClienti();
    }, []);

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-theme mb-6">
                <FontAwesomeIcon icon={faAddressBook} className="text-orange-500 mr-2" size="lg" />
                Lista Clienti
            </h1>

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {clienti.map((cliente) => (
                        <div
                            key={cliente.id}
                            onClick={() => navigate(`/clienti/${cliente.id}`)}
                            className="cursor-pointer card-theme hover:bg-gray-50 dark:hover:bg-gray-700 transition-all p-5"
                        >
                            {/* Badge integrato nel flusso */}
                            {/* Badge integrato nel flusso */}
                            {cliente.progetti.length > 0 && (
                                <div className="mb-3 flex justify-between items-center">
                                    <div />
                                    <div className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                                        {cliente.progetti.length} progett{cliente.progetti.length > 1 ? "i" : "o"}
                                    </div>
                                </div>
                            )}


                            {/* Titolo */}
                            <h2 className="text-xl font-semibold mb-1">{cliente.nome}</h2>

                            {/* Avatar */}
                            {cliente.avatar_url && (
                                <img
                                    src={cliente.avatar_url}
                                    alt="Avatar"
                                    className="w-16 h-16 rounded-full object-cover mb-3"
                                />
                            )}

                            {/* Info */}
                            {cliente.email && (
                                <p className="text-sm mb-1">
                                    <FontAwesomeIcon icon={faEnvelope} className="mr-1 icon-color" />
                                    <span className="font-medium">{cliente.email}</span>
                                </p>
                            )}

                            {cliente.telefono && (
                                <p className="text-sm mb-1">
                                    <FontAwesomeIcon icon={faPhone} className="mr-1 icon-color" />
                                    <span className="font-medium">{cliente.telefono}</span>
                                </p>
                            )}

                            {/* Note */}
                            {cliente.note && (
                                <p className="text-xs mt-3 italic line-clamp-3">{cliente.note}</p>
                            )}

                            {/* Azioni in basso */}
                            <div className="mt-4 flex justify-between items-center">
                                {cliente.progetti.length > 0 ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setClienteAttivo(cliente);
                                        }}
                                        className="flex items-center gap-2 text-sm icon-color hover:text-violet-500"
                                    >
                                        <FontAwesomeIcon icon={faFolderOpen} />
                                        Mostra progetti
                                    </button>
                                ) : <span />}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Modifica cliente:", cliente.id);
                                    }}
                                    className="text-sm text-theme hover:text-blue-500"
                                    aria-label={`Modifica cliente ${cliente.nome}`}
                                >
                                    <FontAwesomeIcon icon={faPen} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODALE PROGETTI */}
            {clienteAttivo && (
                <div
                    className="absolute left-1/2 top-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 modal-container bg-theme text-theme shadow-lg rounded-xl p-6 w-[90%] max-w-md animate-scale-fade"
                >
                    <h2 className="text-xl font-bold mb-4 text-center">
                        📁 Progetti di {clienteAttivo.nome}
                    </h2>
                    <ul className="list-disc ml-5 space-y-2 max-h-[50vh] overflow-y-auto">
                        {clienteAttivo.progetti.map((p) => (
                            <li key={p.id} className="text-sm">{p.nome}</li>
                        ))}
                    </ul>
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setClienteAttivo(null)}
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
