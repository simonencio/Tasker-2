// src/Notifiche/NotificheBell.tsx
import { useEffect, useState } from "react";
import NotificheSidebar from "./NotificheSidebar";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";

export default function NotificheBell() {
    const [open, setOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [nonViste, setNonViste] = useState(0);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
            setUserId(user?.id || null);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const uid = session?.user?.id || null;
            setIsLoggedIn(!!uid);
            setUserId(uid);
        });

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
            .then(({ count }) => setNonViste(count || 0));
    }, [userId, open]);

    if (!isLoggedIn) return null;

    const handleOpen = () => {
        setOpen(true);
    };

    return (
        <>
            <button
                onClick={handleOpen}
                className="fixed  text-gray-700 text-2xl z-50"
                title="Notifiche"
            >
                <div className="relative">
                    <FontAwesomeIcon icon={faBell} />
                    {nonViste > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                            {nonViste}
                        </span>
                    )}
                </div>
            </button>
            <NotificheSidebar open={open} onClose={() => setOpen(false)} />
        </>
    );
}
