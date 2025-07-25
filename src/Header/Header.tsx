// src/components/Header.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faBars, faPlus, faBell } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient";
import MiniTaskCreatorModal from "../Creazione/MiniTaskCreatorModal";
import AggiungiCliente from "../Creazione/Clienti";
import MiniProjectCreatorModal from "../Creazione/MiniProjectCreatorModal";
import NotificheSidebar from "../Notifiche/NotificheSidebar";

type HeaderProps = {
    onToggleSidebar: () => void;
    loggedIn: boolean;
};

export default function Header({ loggedIn, onToggleSidebar }: HeaderProps) {
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [notificheOpen, setNotificheOpen] = useState(false);
    const [nonViste, setNonViste] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const createRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
        setOpen(false);
    };

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Recupero iniziale delle notifiche non lette
    useEffect(() => {
        if (!userId) return;
        const fetchNonViste = async () => {
            const { count } = await supabase
                .from("notifiche_utenti")
                .select("*", { count: "exact", head: true })
                .eq("utente_id", userId)
                .is("visualizzato", false);
            setNonViste(count || 0);
        };
        fetchNonViste();
    }, [userId]);

    // Realtime listener su notifiche_utenti
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`notifiche_changes_${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifiche_utenti",
                    filter: `utente_id=eq.${userId}`,
                },
                async () => {
                    const { count } = await supabase
                        .from("notifiche_utenti")
                        .select("*", { count: "exact", head: true })
                        .eq("utente_id", userId)
                        .is("visualizzato", false);
                    setNonViste(count || 0);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
            if (createRef.current && !createRef.current.contains(e.target as Node)) {
                setCreateOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <header className="w-full bg-white shadow-md z-50 relative px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {loggedIn && (
                        <button
                            onClick={onToggleSidebar}
                            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-black"
                            title="Apri Menu"
                        >
                            <FontAwesomeIcon icon={faBars} className="text-2xl" />
                        </button>
                    )}

                    <div className="text-xl font-bold text-gray-800 tracking-wide">
                        <Link to={loggedIn ? "/home" : "/login"}>
                            <img className="h-8" src="../public/kalimero_logo.png" alt="Kalimero Logo" />
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {loggedIn && (
                        <>
                            {/* Bottone Crea */}
                            <div className="relative" ref={createRef}>
                                <button
                                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-green-600 transition"
                                    title="Crea"
                                    onClick={() => setCreateOpen((prev) => !prev)}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-2xl" />
                                </button>

                                {createOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg p-2 z-50">
                                        <button
                                            onClick={() => {
                                                setCreateOpen(false);
                                                setShowTaskModal(true);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                        >
                                            Attività
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCreateOpen(false);
                                                setShowProjectModal(true);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                        >
                                            Progetto
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCreateOpen(false);
                                                setShowClientModal(true);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                        >
                                            Clienti
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Campanella Notifiche */}
                            <div className="w-10 h-10 flex items-center justify-center relative">
                                <button
                                    onClick={() => setNotificheOpen(true)}
                                    className="text-gray-600 hover:text-yellow-600 transition text-2xl relative"
                                    title="Notifiche"
                                >
                                    <FontAwesomeIcon icon={faBell} />
                                    {nonViste > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[11px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-md">
                                            {nonViste}
                                        </span>
                                    )}
                                </button>
                            </div>

                        </>
                    )}

                    {/* Bottone Account */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-blue-600 transition"
                            title="Gestione Account"
                            onClick={() => setOpen((prev) => !prev)}
                        >
                            <FontAwesomeIcon icon={faUserCircle} className="text-2xl" />
                        </button>

                        {open && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg p-2 z-50">
                                {loggedIn ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                navigate("/profilo");
                                                setOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                        >
                                            Gestione account
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                                        >
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                navigate("/register");
                                                setOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                        >
                                            Registrati
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate("/login");
                                                setOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            Login
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modali */}
            {showTaskModal && <MiniTaskCreatorModal onClose={() => setShowTaskModal(false)} />}
            {showClientModal && <AggiungiCliente onClose={() => setShowClientModal(false)} />}
            {showProjectModal && <MiniProjectCreatorModal onClose={() => setShowProjectModal(false)} />}
            {notificheOpen && <NotificheSidebar open={notificheOpen} onClose={() => setNotificheOpen(false)} />}
        </>
    );
}
