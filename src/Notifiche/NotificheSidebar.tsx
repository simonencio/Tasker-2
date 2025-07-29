import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { getNotificheUtente, type Notifica } from "./notificheUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTasks,
    faDiagramProject,
    faUserTie,
    faBell,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";

export default function NotificheSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [notifiche, setNotifiche] = useState<Notifica[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, []);

    useEffect(() => {
        if (!open || !userId) return;

        const markAsViewed = async () => {
            await supabase
                .from("notifiche_utenti")
                .update({
                    visualizzato: true,
                    visualizzato_al: new Date().toISOString(),
                })
                .eq("utente_id", userId)
                .is("visualizzato", false);
        };

        const loadNotifiche = async () => {
            setLoading(true);
            const data = await getNotificheUtente(userId);
            setNotifiche(data);
            setLoading(false);
        };

        markAsViewed().then(loadNotifiche);
    }, [open, userId]);

    const eliminaNotifica = async (notificaUtenteId: string) => {
        const now = new Date().toISOString();
        setNotifiche((prev) => prev.filter((n) => n.id !== notificaUtenteId));

        await supabase
            .from("notifiche_utenti")
            .update({
                letto: true,
                letto_al: now,
                deleted_at: now,
            })
            .eq("id", notificaUtenteId);
    };

    return (
        <div
            className={`fixed top-0 right-0 h-full w-[22rem] z-50 transition-transform duration-300 border-l border-gray-300 dark:border-gray-700 bg-theme shadow-xl ${open ? "translate-x-0" : "translate-x-full"}`}
        >
            {/* Header */}
            <div className="p-5 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center bg-theme">
                <h2 className="text-xl font-bold text-theme flex items-center gap-2">
                    <FontAwesomeIcon icon={faBell} className="text-yellow-500 text-xl" />
                    Notifiche
                </h2>
                <button onClick={onClose} className="text-2xl text-red-500 hover:opacity-70 transition">
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            {/* Contenuto */}
            <div className="p-5 overflow-y-auto hide-scrollbar h-[calc(100%-72px)] bg-theme text-theme">
                {loading ? (
                    <p className="text-base opacity-70">Caricamento notifiche...</p>
                ) : notifiche.length === 0 ? (
                    <p className="text-base opacity-60">Nessuna notifica disponibile</p>
                ) : (
                    <ul className="space-y-5">
                        {notifiche.map((n) => (
                            <li
                                key={n.id}
                                className={`rounded-lg popup-panel p-4 transition border border-gray-200 dark:border-gray-700 ${n.letto ? "opacity-60" : "shadow-md"}`}
                            >
                                <p className={`text-base ${n.letto ? "" : "font-semibold"}`}>
                                    {n.messaggio}
                                </p>

                                {(n.task_nome || n.progetto_nome || n.creatore_nome) && (
                                    <div className="text-sm mt-3 space-y-2">
                                        {n.task_nome && (
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faTasks} className="text-purple-500 text-lg" />
                                                <span><span className="font-medium">Task:</span> {n.task_nome}</span>
                                            </div>
                                        )}
                                        {n.progetto_nome && (
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faDiagramProject} className="text-blue-500 text-lg" />
                                                <span><span className="font-medium">Progetto:</span> {n.progetto_nome}</span>
                                            </div>
                                        )}
                                        {n.creatore_nome && (
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faUserTie} className="text-green-500 text-lg" />
                                                <span><span className="font-medium">Azione di:</span> {n.creatore_nome}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-4">
                                    <p className="text-xs opacity-50">
                                        {new Date(n.data_creazione).toLocaleString()}
                                    </p>
                                    <button
                                        onClick={() => eliminaNotifica(n.id)}
                                        className="text-xs px-2.5 py-1 rounded border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition"
                                    >
                                        Elimina
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
