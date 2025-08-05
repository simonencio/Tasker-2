import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPen, faFolderOpen, faAddressBook,
    faEnvelope, faPhone, faStickyNote
} from "@fortawesome/free-solid-svg-icons";

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
    const [clienteEspanso, setClienteEspanso] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const caricaClienti = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("clienti")
                .select(`id, nome, email, telefono, avatar_url, note, deleted_at, progetti:progetti ( id, nome, deleted_at )`)
                .order("created_at", { ascending: false });

            if (!error && data) {
                const clientiPuliti = data
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
        <div className="min-h-screen bg-theme text-theme p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FontAwesomeIcon icon={faAddressBook} className="text-orange-500 w-6 h-6" />
                Lista Clienti
            </h1>

            {loading ? (
                <p className="text-center text-lg">Caricamento...</p>
            ) : (
                <div className="max-w-4xl mx-auto card-theme shadow-md">
                    {/* INTESTAZIONE */}
                    <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-[15px] font-semibold text-theme gap-2 sm:gap-4">
                        <div className="flex-1 pl-0 sm:pl-[48px] text-left sm:text-left">Nome</div>
                        <div className="hidden sm:flex sm:w-40 items-center justify-center">Email</div>
                        <div className="hidden sm:flex sm:w-32 items-center justify-center">Telefono</div>
                        <div className="hidden sm:flex w-auto items-center justify-center">Azioni</div>
                        <div className="w-6" />
                    </div>

                    {/* RIGHE CLIENTI */}
                    {clienti.map((cliente) => (
                        <div key={cliente.id} className="border-t border-gray-100 dark:border-gray-700 hover-bg-theme transition">
                            <div
                                className="flex items-center px-4 py-3 gap-2 sm:gap-4 cursor-pointer"
                                onClick={() => setClienteEspanso((prev) => (prev === cliente.id ? null : cliente.id))}
                            >
                                {/* Avatar + Nome */}
                                <div className="flex-1 flex items-center gap-3 text-sm sm:text-[15px] font-medium pl-0 sm:pl-[48px] text-left">
                                    {cliente.avatar_url ? (
                                        <img src={cliente.avatar_url} alt="Avatar" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-200">
                                            N/A
                                        </div>
                                    )}
                                    {cliente.nome}
                                </div>

                                {/* Email */}
                                <div className="hidden sm:flex sm:w-40 justify-center text-sm">
                                    {cliente.email || <span className="italic text-gray-400">—</span>}
                                </div>

                                {/* Telefono */}
                                <div className="hidden sm:flex sm:w-32 justify-center text-sm">
                                    {cliente.telefono || <span className="italic text-gray-400">—</span>}
                                </div>

                                {/* Azioni (solo sm+) */}
                                <div
                                    className="hidden sm:flex w-auto gap-3 items-center justify-center text-theme text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span
                                        className="cursor-pointer hover:text-violet-500"
                                        onClick={() => cliente.progetti.length > 0 && setClienteAttivo(cliente)}
                                    >
                                        <FontAwesomeIcon icon={faFolderOpen} />
                                    </span>
                                    <span className="cursor-pointer hover:text-blue-500" onClick={() => { }}>
                                        <FontAwesomeIcon icon={faPen} />
                                    </span>
                                </div>

                                {/* Toggle +/− */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setClienteEspanso((prev) => (prev === cliente.id ? null : cliente.id));
                                    }}
                                    className="w-6 h-6 flex-shrink-0 text-blue-600 flex items-center justify-center rounded hover-bg-theme"
                                >
                                    {clienteEspanso === cliente.id ? "−" : "+"}
                                </button>
                            </div>

                            {/* DETTAGLI CLIENTE */}
                            {clienteEspanso === cliente.id && (
                                <div className="px-4 py-3 text-sm space-y-3 bg-theme border-t border-gray-100 dark:border-gray-700 animate-scale-fade">
                                    {/* Azioni per sm e inferiori */}
                                    <div className="flex sm:hidden gap-6 pl-0 text-[15px] text-theme">
                                        <span
                                            className="cursor-pointer hover:text-violet-500"
                                            onClick={() => cliente.progetti.length > 0 && setClienteAttivo(cliente)}
                                        >
                                            <FontAwesomeIcon icon={faFolderOpen} /> <span className="ml-1">Progetti</span>
                                        </span>
                                        <span
                                            className="cursor-pointer hover:text-blue-500"
                                            onClick={() => { }}
                                        >
                                            <FontAwesomeIcon icon={faPen} /> <span className="ml-1">Modifica</span>
                                        </span>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-start gap-2 pl-0 sm:pl-[48px]">
                                        <FontAwesomeIcon icon={faEnvelope} className="icon-color w-4 h-4 mt-[2px]" />
                                        <div>
                                            <span className="font-semibold">Email</span><br />
                                            {cliente.email || <span className="italic text-gray-400">—</span>}
                                        </div>
                                    </div>

                                    {/* Telefono */}
                                    <div className="flex items-start gap-2 pl-0 sm:pl-[48px]">
                                        <FontAwesomeIcon icon={faPhone} className="icon-color w-4 h-4 mt-[2px]" />
                                        <div>
                                            <span className="font-semibold">Telefono</span><br />
                                            {cliente.telefono || <span className="italic text-gray-400">—</span>}
                                        </div>
                                    </div>

                                    {/* Note */}
                                    {cliente.note && (
                                        <div className="flex items-start gap-2 pl-0 sm:pl-[48px]">
                                            <FontAwesomeIcon icon={faStickyNote} className="icon-color w-4 h-4 mt-[2px]" />
                                            <div>
                                                <span className="font-semibold">Note</span><br />
                                                {cliente.note}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* MODALE PROGETTI */}
            {clienteAttivo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="modal-container bg-theme text-theme shadow-xl rounded-xl p-6 w-[90%] max-w-md animate-scale-fade">
                        <h2 className="text-xl font-bold mb-4 text-center">📁 Progetti di {clienteAttivo.nome}</h2>
                        <ul className="ml-5 space-y-2 max-h-[50vh] overflow-y-auto">
                            {clienteAttivo.progetti.map((p) => (
                                <li
                                    key={p.id}
                                    onClick={() => navigate(`/progetti/${p.id}`)}
                                    className="text-sm link hover:underline cursor-pointer"
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
        </div>
    );
}
