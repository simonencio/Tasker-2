// src/Notifiche/NotificheSidebar.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { getNotificheUtente, type Notifica } from "./notificheUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTasks,
    faDiagramProject,
    faUserTie,
    faBell,
} from "@fortawesome/free-solid-svg-icons";

import { renderDettaglio } from "./notificheUtils";

/* ============================== Hook campanello ============================== */
export function useNotificheBell() {
    const [open, setOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [nonViste, setNonViste] = useState(0);

    


    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
            setUserId(user?.id || null);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const uid = session?.user?.id || null;
                setIsLoggedIn(!!uid);
                setUserId(uid);
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!userId) return;
        supabase
            .from("notifiche_utenti")
            .select("*", { count: "exact", head: true })
            .eq("utente_id", userId)
            .is("visualizzato", false)
            .is("deleted_at", null)
            .then(({ count }) => setNonViste(count || 0));
    }, [userId, open]);

    return { open, setOpen, isLoggedIn, nonViste, userId };
}

/* ============================== Sidebar notifiche ============================== */
type Props = {
    open: boolean;
    onClose: () => void;
    userId: string | null;
};

export default function NotificheSidebar({ open, onClose, userId }: Props) {
    const [notifiche, setNotifiche] = useState<Notifica[]>([]);
    const [loading, setLoading] = useState(true);

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
                .is("visualizzato", false)
                .is("deleted_at", null);
        };

        const loadNotifiche = async () => {
            setLoading(true);
            const data = await getNotificheUtente(userId);
            setNotifiche(data);
            setLoading(false);
        };

        markAsViewed().then(loadNotifiche);
    }, [open, userId]);

    // 🔄 Realtime aggiornamento mentre la sidebar è aperta
    useEffect(() => {
        if (!open || !userId) return;

        const channel = supabase
            .channel(`realtime_sidebar_notifiche_${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifiche_utenti",
                    filter: `utente_id=eq.${userId}`,
                },
                async () => {
                    const data = await getNotificheUtente(userId);
                    setNotifiche(data);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
        <aside
            className={`absolute top-0 right-0 h-full w-full md:w-100 sidebar-theme text-theme transition-transform duration-300 z-40 ${open ? "translate-x-0 notifiche-shadow-open" : "translate-x-full"
                }`}
        >
            {/* Header */}
            <div className="p-5 flex items-center bg-theme">
                <h2 className="text-xl font-bold text-theme flex items-center gap-2">
                    <FontAwesomeIcon
                        icon={faBell}
                        className="text-yellow-500 text-xl"
                    />
                    Notifiche
                </h2>
                <button
                    onClick={onClose}
                    className="ml-auto text-sm px-2 py-1 border rounded"
                >
                    Chiudi
                </button>
            </div>

            {/* Contenuto */}
            <div className="p-5 overflow-y-auto hide-scrollbar h-[calc(100%-72px)] bg-theme text-theme">
                {loading ? (
                    <p className="text-base opacity-70">
                        Caricamento notifiche...
                    </p>
                ) : notifiche.length === 0 ? (
                    <p className="text-base opacity-60">
                        Nessuna notifica disponibile
                    </p>
                ) : (
                    <ul className="space-y-5">
                        {notifiche.map((n) => (
                            <li
                                key={n.id}
                                className={`rounded-lg popup-panel p-4 transition border border-gray-200 dark:border-gray-700 ${n.letto ? "opacity-60" : "shadow-md"
                                    }`}
                            >
                                <p
                                    className={`text-base ${n.letto ? "" : "font-semibold"
                                        }`}
                                >
                                    {n.messaggio}
                                </p>
                                {renderDettaglio(n)}

                                {(n.task_nome ||
                                    n.progetto_nome ||
                                    n.creatore_nome) && (
                                        <div className="text-sm mt-3 space-y-2">
                                            {n.task_nome && (
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon
                                                        icon={faTasks}
                                                        className="text-purple-500 text-lg"
                                                    />
                                                    <span>
                                                        <span className="font-medium">
                                                            Task:
                                                        </span>{" "}
                                                        {n.task_nome}
                                                    </span>
                                                </div>
                                            )}
                                            {n.progetto_nome && (
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon
                                                        icon={faDiagramProject}
                                                        className="text-blue-500 text-lg"
                                                    />
                                                    <span>
                                                        <span className="font-medium">
                                                            Progetto:
                                                        </span>{" "}
                                                        {n.progetto_nome}
                                                    </span>
                                                </div>
                                            )}
                                            {n.creatore_nome && (
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon
                                                        icon={faUserTie}
                                                        className="text-green-500 text-lg"
                                                    />
                                                    <span>
                                                        <span className="font-medium">
                                                            Azione di:
                                                        </span>{" "}
                                                        {n.creatore_nome}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex justify-between items-center mt-4">
                                    <p className="text-xs opacity-50">
                                        {new Date(
                                            n.data_creazione
                                        ).toLocaleString()}
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
        </aside>
    );
}
