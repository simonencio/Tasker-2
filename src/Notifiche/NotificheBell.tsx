// // src/Notifiche/NotificheBell.tsx
// import { useEffect, useState } from "react";
// import NotificheSidebar from "./NotificheSidebar";
// import { supabase } from "../supporto/supabaseClient";

// export function useNotificheBell() {
//     const [open, setOpen] = useState(false);
//     const [isLoggedIn, setIsLoggedIn] = useState(false);
//     const [userId, setUserId] = useState<string | null>(null);
//     const [nonViste, setNonViste] = useState(0);

//     useEffect(() => {
//         supabase.auth.getUser().then(({ data: { user } }) => {
//             setIsLoggedIn(!!user);
//             setUserId(user?.id || null);
//         });

//         const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
//             const uid = session?.user?.id || null;
//             setIsLoggedIn(!!uid);
//             setUserId(uid);
//         });

//         return () => {
//             listener.subscription.unsubscribe();
//         };
//     }, []);

//     useEffect(() => {
//         if (!userId) return;
//         supabase
//             .from("notifiche_utenti")
//             .select("*", { count: "exact", head: true })
//             .eq("utente_id", userId)
//             .is("visualizzato", false)
//             .then(({ count }) => setNonViste(count || 0));
//     }, [userId, open]);

//     return {
//         open,
//         setOpen,
//         isLoggedIn,
//         nonViste,
//     };
// }

// export { NotificheSidebar };
