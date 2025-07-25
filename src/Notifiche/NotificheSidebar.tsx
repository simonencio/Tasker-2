// src/NotificheSidebar.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { getNotificheUtente, type Notifica } from "./notificheUtils";

export default function NotificheSidebar({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
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
        setLoading(true);

        getNotificheUtente(userId).then((notifiche) => {
            setNotifiche(notifiche);
            setLoading(false);
        });
    }, [open, userId]);

    const segnaComeLetta = async (notificaUtenteId: string) => {
        const now = new Date().toISOString();

        const { error } = await supabase
            .from("notifiche_utenti")
            .update({
                letto: true,
                letto_al: now,
            })
            .eq("id", notificaUtenteId);

        if (!error) {
            setNotifiche((prev) =>
                prev.map((n) =>
                    n.id === notificaUtenteId ? { ...n, letto: true } : n
                )
            );

            setTimeout(async () => {
                await supabase
                    .from("notifiche_utenti")
                    .update({ deleted_at: new Date().toISOString() })
                    .eq("id", notificaUtenteId);
            }, 10000);
        }
    };


    return (
        <div
            className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l z-50 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"
                }`}
        >
            <div className="p-4 border-b flex justify-between items-center bg-gray-100">
                <h2 className="text-lg font-semibold">🔔 Notifiche</h2>
                <button onClick={onClose} className="text-red-500 font-bold text-xl">
                    ×
                </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
                {loading ? (
                    <p className="text-gray-500">Caricamento notifiche...</p>
                ) : notifiche.length === 0 ? (
                    <p className="text-gray-400">Nessuna notifica disponibile</p>
                ) : (
                    <ul className="divide-y">
                        {notifiche.map((n) => (
                            <li key={n.id} className="py-3">
                                <p className={`text-sm ${n.letto ? "text-gray-600" : "font-semibold"}`}>
                                    {n.messaggio}
                                </p>
                                {(n.task_nome || n.progetto_nome || n.creatore_nome) && (
                                    <div className="text-xs text-gray-500 mt-1 pl-1 space-y-1">
                                        {n.task_nome && <div>📝 Task: <span className="font-medium">{n.task_nome}</span></div>}
                                        {n.progetto_nome && <div>📁 Progetto: <span className="font-medium">{n.progetto_nome}</span></div>}
                                        {n.creatore_nome && <div>👤 Azione di: <span className="font-medium">{n.creatore_nome}</span></div>}
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-gray-400">
                                        {new Date(n.data_creazione).toLocaleString()}
                                    </p>
                                    {n.letto ? (
                                        <span className="text-green-600 text-xs ml-2">✅ Letta</span>
                                    ) : (
                                        <button
                                            onClick={() => segnaComeLetta(n.id)}
                                            className="text-sm text-blue-600 hover:underline ml-2"
                                        >
                                            Segna come letta
                                        </button>

                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
