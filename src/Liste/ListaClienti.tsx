import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressBook,
    faFolderOpen,
    faEnvelope,
    faPhone,
    faStickyNote,
} from "@fortawesome/free-solid-svg-icons";

import ListaGenerica from "./ListaGenerica";
import MiniClientEditorModal from "../Modifica/MiniClientEditorModal";
import { fetchClienti } from "../supporto/fetchData";

type Cliente = {
    id: string;
    nome: string;
    email?: string | null;
    telefono?: string | null;
    avatar_url?: string | null;
    note?: string | null;
    progetti: { id: string; nome: string; slug?: string }[];
};

export default function ListaClienti() {
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [clienteAttivo, setClienteAttivo] = useState<Cliente | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchClienti()
            .then(setClienti)
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <ListaGenerica<Cliente>
                titolo="Lista Clienti"
                icona={faAddressBook}
                coloreIcona="text-orange-500"
                tipo="clienti"
                dati={clienti}
                loading={loading}
                colonne={[
                    {
                        chiave: "avatar",
                        label: "",
                        className: "w-10 shrink-0",
                        render: (c) =>
                            c.avatar_url ? (
                                <img
                                    src={c.avatar_url}
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
                                    {c.nome[0]?.toUpperCase() ?? "?"}
                                </div>
                            ),
                    },
                    { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
                ]}
                azioni={(c) => (
                    <>
                        {c.progetti.length > 0 && (
                            <button
                                onClick={() => setClienteAttivo(c)}
                                className="icon-color hover:text-violet-600"
                                title="Progetti cliente"
                            >
                                <FontAwesomeIcon icon={faFolderOpen} />
                            </button>
                        )}
                    </>
                )}
                renderDettaglio={(c) => (
                    <div className="space-y-1">
                        {c.email && (
                            <p>
                                <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-500" />
                                {c.email}
                            </p>
                        )}
                        {c.telefono && (
                            <p>
                                <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-500" />
                                {c.telefono}
                            </p>
                        )}
                        {c.note && (
                            <p>
                                <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-500" />
                                {c.note}
                            </p>
                        )}
                    </div>
                )}
                renderModaleModifica={(id, onClose) => (
                    <MiniClientEditorModal clienteId={id} onClose={onClose} />
                )}
            />

            {/* MODALE PROGETTI */}
            {clienteAttivo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="modal-container bg-theme text-theme shadow-xl rounded-xl p-6 w-[90%] max-w-md animate-scale-fade">
                        <h2 className="text-xl font-bold mb-4 text-center">
                            📁 Progetti di {clienteAttivo.nome}
                        </h2>
                        <ul className="ml-5 space-y-2 max-h-[50vh] overflow-y-auto">
                            {clienteAttivo.progetti.map((p) => (
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
                                onClick={() => setClienteAttivo(null)}
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
