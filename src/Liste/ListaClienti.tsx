import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressBook,
    faPen,
    faFolderOpen,
    faEnvelope,
    faPhone,
    faStickyNote,
} from "@fortawesome/free-solid-svg-icons";
import MiniClientEditorModal from "../Modifica/MiniClientEditorModal";

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
    const [clienteEspansoId, setClienteEspansoId] = useState<string | null>(null);
    const [clienteDaModificareId, setClienteDaModificareId] = useState<string | null>(null);
    const [clienteAttivo, setClienteAttivo] = useState<Cliente | null>(null); // 🔹 per modale progetti

    const navigate = useNavigate();

    useEffect(() => {
        const caricaClienti = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("clienti")
                .select(`
                    id, nome, email, telefono, avatar_url, note, deleted_at,
                    progetti:progetti ( id, nome, slug, deleted_at )
                `)
                .order("created_at", { ascending: false });

            if (!error && data) {
                const clientiPuliti = data
                    .filter(c => !c.deleted_at)
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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {/* intestazione */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme">
                    <FontAwesomeIcon icon={faAddressBook} className="text-orange-500 mr-2" />
                    Lista Clienti
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

                    {/* righe clienti */}
                    {clienti.map(cliente => {
                        const isOpen = clienteEspansoId === cliente.id;
                        return (
                            <div key={cliente.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                                {/* riga principale */}
                                <div
                                    className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer"
                                    onClick={() => setClienteEspansoId(isOpen ? null : cliente.id)}
                                >
                                    <div className="w-10 shrink-0 flex items-center justify-center">
                                        {cliente.avatar_url ? (
                                            <img
                                                src={cliente.avatar_url}
                                                alt="Avatar"
                                                className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
                                                {cliente.nome[0]?.toUpperCase() ?? "?"}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 font-medium truncate">{cliente.nome}</div>

                                    <div className="w-20 flex justify-end items-center gap-3 shrink-0">
                                        {cliente.progetti.length > 0 && (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setClienteAttivo(cliente); // 🔹 apre modale progetti
                                                }}
                                                className="icon-color hover:text-violet-600"
                                                title="Progetti cliente"
                                            >
                                                <FontAwesomeIcon icon={faFolderOpen} />
                                            </button>
                                        )}
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setClienteDaModificareId(cliente.id);
                                            }}
                                            className="icon-color hover:text-blue-600"
                                            title="Modifica cliente"
                                        >
                                            <FontAwesomeIcon icon={faPen} />
                                        </button>
                                    </div>
                                </div>

                                {/* sezione espansa */}
                                {isOpen && (
                                    <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-1">
                                        {cliente.email && (
                                            <p>
                                                <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-500" />
                                                {cliente.email}
                                            </p>
                                        )}
                                        {cliente.telefono && (
                                            <p>
                                                <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-500" />
                                                {cliente.telefono}
                                            </p>
                                        )}
                                        {cliente.note && (
                                            <p>
                                                <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-500" />
                                                {cliente.note}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

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

            {/* MODALE MODIFICA CLIENTE */}
            {clienteDaModificareId && (
                <MiniClientEditorModal
                    clienteId={clienteDaModificareId}
                    onClose={() => setClienteDaModificareId(null)}
                />
            )}
        </div>
    );
}
