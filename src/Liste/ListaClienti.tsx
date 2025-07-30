import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

type Cliente = {
    id: string;
    nome: string;
    email?: string | null;
    telefono?: string | null;
    avatar_url?: string | null;
    note?: string | null;
    progetti: { id: string; nome: string }[];
};

type Props = {
    sidebarSinistraAperta: boolean;
    notificheSidebarAperta: boolean;
};

export default function ListaClienti({ sidebarSinistraAperta, notificheSidebarAperta }: Props) {
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
          progetti:progetti (
            id, nome, deleted_at
          )
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

    const getGridCols = () => {
        const count = Number(sidebarSinistraAperta) + Number(notificheSidebarAperta);
        if (count === 2) return "xl:grid-cols-2";
        if (count === 1) return "xl:grid-cols-3";
        return "xl:grid-cols-4";
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-theme mb-6">📒 Lista Clienti</h1>

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 ${getGridCols()}`}>
                    {clienti.map((cliente) => (
                        <div
                            key={cliente.id}
                            className="relative card-theme p-5 hover-bg-theme transition-all cursor-pointer flex flex-col justify-between min-h-[16rem]"
                            onClick={() => navigate(`/clienti/${cliente.id}`)}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Modifica cliente:", cliente.id);
                                }}
                                className="absolute bottom-2 right-2 text-sm text-theme hover:text-blue-500"
                            >
                                <FontAwesomeIcon icon={faPen} />
                            </button>

                            <div>
                                {cliente.avatar_url && (
                                    <img
                                        src={cliente.avatar_url}
                                        alt="Avatar"
                                        className="w-16 h-16 rounded-full object-cover mb-3"
                                    />
                                )}

                                <h2 className="text-xl font-semibold text-theme mb-1">{cliente.nome}</h2>

                                {cliente.email && (
                                    <p className="text-sm text-theme mb-1">
                                        📧 <span className="font-medium">{cliente.email}</span>
                                    </p>
                                )}

                                {cliente.telefono && (
                                    <p className="text-sm text-theme mb-1">
                                        📞 <span className="font-medium">{cliente.telefono}</span>
                                    </p>
                                )}

                                {cliente.note && (
                                    <p className="text-xs text-theme mt-3 italic line-clamp-3">
                                        {cliente.note}
                                    </p>
                                )}
                            </div>

                            {cliente.progetti.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setClienteAttivo(cliente);
                                    }}
                                    className="mt-4 flex items-center gap-2 text-sm icon-color hover:text-violet-500"
                                >
                                    <FontAwesomeIcon icon={faFolderOpen} />
                                    Mostra progetti
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ✅ MODALE PROGETTI */}
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
