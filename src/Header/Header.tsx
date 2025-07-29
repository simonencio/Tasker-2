import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUserCircle,
    faBars,
    faPlus,
    faBell,
    faMoon,
    faSun,
    faDesktop,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient";
import MiniTaskCreatorModal from "../Creazione/MiniTaskCreatorModal";
import MiniProjectCreatorModal from "../Creazione/MiniProjectCreatorModal";
import NotificheSidebar from "../Notifiche/NotificheSidebar";
import {
    richiediPermessoNotificheBrowser,
    mostraNotificaBrowser,
} from "../Notifiche/notificheBrowserUtils";
import MiniClientCreatorModal from "../Creazione/MiniClientCreatorModal";

type NotificaUtenteRecord = {
    notifica_id: string;
    utente_id: string;
    visualizzato: boolean;
    visualizzato_al: string | null;
    letto: boolean;
    inviato: boolean;
    deleted_at: string | null;
};

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
    const [themeDropdown, setThemeDropdown] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string>("light");

    const dropdownRef = useRef<HTMLDivElement>(null);
    const createRef = useRef<HTMLDivElement>(null);
    const themeRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const applyTheme = (theme: string) => {
        let resolved = theme;
        localStorage.setItem("theme", theme);
        if (theme === "dark") document.documentElement.classList.add("dark");
        else if (theme === "light") document.documentElement.classList.remove("dark");
        else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            document.documentElement.classList.toggle("dark", prefersDark);
            resolved = prefersDark ? "dark" : "light";
        }
        setCurrentTheme(resolved);
    };

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme") || "system";
        applyTheme(storedTheme);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            const theme = localStorage.getItem("theme") || "system";
            if (theme === "system") applyTheme("system");
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
        setOpen(false);
    };

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                richiediPermessoNotificheBrowser();
            }
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            const id = session?.user?.id || null;
            setUserId(id);
            if (id) richiediPermessoNotificheBrowser();
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const aggiornaContatoreNotifiche = async () => {
        if (!userId) return;
        const { count } = await supabase
            .from("notifiche_utenti")
            .select("*", { count: "exact", head: true })
            .eq("utente_id", userId)
            .is("visualizzato", false)
            .is("deleted_at", null);
        setNonViste(count || 0);
    };

    useEffect(() => { if (userId) aggiornaContatoreNotifiche(); }, [userId]);

    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel(`realtime_notifiche_${userId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifiche_utenti",
                filter: `utente_id=eq.${userId}`,
            }, async (payload) => {
                aggiornaContatoreNotifiche();
                const nuovaNotifica = payload.new as NotificaUtenteRecord;
                const { data, error } = await supabase
                    .from("notifiche")
                    .select("messaggio")
                    .eq("id", nuovaNotifica.notifica_id)
                    .single();
                if (!error && data) mostraNotificaBrowser("🔔 Notifica Kalimero", {
                    body: data.messaggio,
                    icon: "/kalimero_logo.png",
                });
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
            if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <header className="bg-theme text-theme w-full shadow-md z-50 relative px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {loggedIn && (
                        <button onClick={onToggleSidebar} className="w-10 h-10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBars} className="text-2xl icon-color" />
                        </button>
                    )}
                    <Link to={loggedIn ? "/home" : "/login"} className="text-xl font-bold tracking-wide">
                        <img
                            className="h-8"
                            src={currentTheme === "dark" ? "/kalimero_logo2.png" : "/kalimero_logo.png"}
                            alt="Logo"
                        />
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    {loggedIn && (
                        <>
                            <div className="relative" ref={createRef}>
                                <button onClick={() => setCreateOpen(p => !p)} className="w-10 h-10 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faPlus} className="text-2xl text-green-500" />
                                </button>
                                {createOpen && (
                                    <div className="absolute right-0 mt-2 w-40 dropdown-panel z-50">
                                        {["Attività", "Progetto", "Clienti"].map((label, i) => (
                                            <button
                                                key={label}
                                                onClick={() => {
                                                    setCreateOpen(false);
                                                    [setShowTaskModal, setShowProjectModal, setShowClientModal][i](true);
                                                }}
                                                className="dropdown-button"
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={themeRef}>
                                <button onClick={() => setThemeDropdown(p => !p)} className="w-10 h-10 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faMoon} className="text-2xl text-sky-500" />
                                </button>
                                {themeDropdown && (
                                    <div className="absolute right-0 mt-5 w-40 dropdown-panel z-50">
                                        {[{ icon: faSun, label: "Chiaro", theme: "light", color: "text-yellow-400" },
                                        { icon: faMoon, label: "Scuro", theme: "dark", color: "text-sky-500" },
                                        { icon: faDesktop, label: "Sistema", theme: "system", color: "text-gray-500 dark:text-gray-300" }
                                        ].map(({ icon, label, theme, color }) => (
                                            <button
                                                key={label}
                                                onClick={() => { applyTheme(theme); setThemeDropdown(false); }}
                                                className="dropdown-button flex items-center gap-2"
                                            >
                                                <FontAwesomeIcon icon={icon} className={`text-base ${color}`} /> {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setNotificheOpen(true)} className="relative w-10 h-10 flex items-center justify-center">
                                <FontAwesomeIcon icon={faBell} className="text-2xl text-yellow-500" />
                                {nonViste > 0 && (
                                    <span className="notification-badge">{nonViste}</span>
                                )}
                            </button>
                        </>
                    )}

                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setOpen(p => !p)} className="w-10 h-10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUserCircle} className="text-2xl text-purple-500" />
                        </button>
                        {open && (
                            <div className="absolute right-0 mt-2 w-48 dropdown-panel z-50">
                                {loggedIn ? (
                                    <>
                                        <button onClick={() => { navigate("/profilo"); setOpen(false); }} className="dropdown-button">Gestione account</button>
                                        <button onClick={handleLogout} className="dropdown-button">Logout</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { navigate("/register"); setOpen(false); }} className="dropdown-button">Registrati</button>
                                        <button onClick={() => { navigate("/login"); setOpen(false); }} className="dropdown-button">Login</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {showProjectModal && <MiniProjectCreatorModal onClose={() => setShowProjectModal(false)} offsetIndex={0} />}
            {showTaskModal && <MiniTaskCreatorModal onClose={() => setShowTaskModal(false)} offsetIndex={showProjectModal ? 1 : 0} />}
            {showClientModal && <MiniClientCreatorModal onClose={() => setShowClientModal(false)} offsetIndex={(showProjectModal ? 1 : 0) + (showTaskModal ? 1 : 0)} />}
            {notificheOpen && (
                <NotificheSidebar
                    open={notificheOpen}
                    onClose={() => { setNotificheOpen(false); aggiornaContatoreNotifiche(); }}
                />
            )}
        </>
    );
}
