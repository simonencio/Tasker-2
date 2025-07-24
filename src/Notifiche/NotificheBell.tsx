import { useEffect, useState } from "react";
import NotificheSidebar from "./NotificheSidebar";
import { supabase } from "../supporto/supabaseClient";

export default function NotificheBell() {
    const [open, setOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session?.user);
        });
    }, []);

    if (!isLoggedIn) return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-4 right-4 bg-blue-600 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-lg z-50"
                title="Notifiche"
            >
                N
            </button>
            <NotificheSidebar open={open} onClose={() => setOpen(false)} />
        </>
    );
}
