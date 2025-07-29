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
            <header className="bg-theme text-theme w-full shadow-md z-50 relative px-2 sm:px-4 lg:px-6 py-2 sm:py-3 flex flex-wrap items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4 max-w-full overflow-hidden">
                    {loggedIn && (
                        <button onClick={onToggleSidebar} className="w-8 max-[400px]:w-9 sm:w-10 xl:w-12 2xl:w-14 h-8 max-[400px]:h-9 sm:h-10 xl:h-12 2xl:h-14 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBars} className="text-base max-[400px]:text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl icon-color" />
                        </button>
                    )}
                    <Link to={loggedIn ? "/home" : "/login"} className="text-base sm:text-lg md:text-xl font-bold tracking-wide">
                        <img
                            className="h-6 max-[400px]:h-7 sm:h-8 md:h-9 xl:h-10 2xl:h-12"
                            src={currentTheme === "dark" ? "/kalimero_logo2.png" : "/kalimero_logo.png"}
                            alt="Logo"
                        />
                    </Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mt-2 sm:mt-0">
                    {loggedIn && (
                        <>
                            <div className="relative" ref={createRef}>
                                <button onClick={() => setCreateOpen(p => !p)} className="w-8 max-[400px]:w-9 sm:w-10 xl:w-12 2xl:w-14 h-8 max-[400px]:h-9 sm:h-10 xl:h-12 2xl:h-14 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faPlus} className="text-base max-[400px]:text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl text-green-500" />
                                </button>
                                {createOpen && (
                                    <div className="absolute right-0 mt-2 w-36 sm:w-40 dropdown-panel z-50">
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
                                <button onClick={() => setThemeDropdown(p => !p)} className="w-8 max-[400px]:w-9 sm:w-10 xl:w-12 2xl:w-14 h-8 max-[400px]:h-9 sm:h-10 xl:h-12 2xl:h-14 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faMoon} className="text-base max-[400px]:text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl text-sky-500" />
                                </button>
                                {themeDropdown && (
                                    <div className="absolute right-0 mt-5 w-36 sm:w-40 dropdown-panel z-50">
                                        {[{ icon: faSun, label: "Chiaro", theme: "light", color: "text-yellow-400" },
                                        { icon: faMoon, label: "Scuro", theme: "dark", color: "text-sky-500" },
                                        { icon: faDesktop, label: "Sistema", theme: "system", color: "text-gray-500 dark:text-gray-300" }
                                        ].map(({ icon, label, theme, color }) => (
                                            <button
                                                key={label}
                                                onClick={() => { applyTheme(theme); setThemeDropdown(false); }}
                                                className="dropdown-button flex items-center gap-2"
                                            >
                                                <FontAwesomeIcon icon={icon} className={`text-sm sm:text-base md:text-lg ${color}`} /> {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setNotificheOpen(true)} className="relative w-8 max-[400px]:w-9 sm:w-10 xl:w-12 2xl:w-14 h-8 max-[400px]:h-9 sm:h-10 xl:h-12 2xl:h-14 flex items-center justify-center">
                                <FontAwesomeIcon icon={faBell} className="text-base max-[400px]:text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl text-yellow-500" />
                                {nonViste > 0 && (
                                    <span className="notification-badge">{nonViste}</span>
                                )}
                            </button>
                        </>
                    )}

                    {!loggedIn && (
                        <div className="relative" ref={themeRef}>
                            <button onClick={() => setThemeDropdown(p => !p)} className="w-8 max-[400px]:w-9 sm:w-10 xl:w-12 2xl:w-14 h-8 max-[400px]:h-9 sm:h-10 xl:h-12 2xl:h-14 flex items-center justify-center">
                                <FontAwesomeIcon icon={faMoon} className="text-base max-[400px]:text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl text-sky-500" />
                            </button>
                            {themeDropdown && (
                                <div className="absolute right-0 mt-5 w-36 sm:w-40 dropdown-panel z-50">
                                    {[{ icon: faSun, label: "Chiaro", theme: "light", color: "text-yellow-400" },
                                    { icon: faMoon, label: "Scuro", theme: "dark", color: "text-sky-500" },
                                    { icon: faDesktop, label: "Sistema", theme: "system", color: "text-gray-500 dark:text-gray-300" }
                                    ].map(({ icon, label, theme, color }) => (
                                        <button
                                            key={label}
                                            onClick={() => { applyTheme(theme); setThemeDropdown(false); }}
                                            className="dropdown-button flex items-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={icon} className={`text-sm sm:text-base md:text-lg ${color}`} /> {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setOpen(p => !p)} className="w-8 max-[400px]:w-9 sm:w-10 xl:w-12 2xl:w-14 h-8 max-[400px]:h-9 sm:h-10 xl:h-12 2xl:h-14 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUserCircle} className="text-base max-[400px]:text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl text-purple-500" />
                        </button>
                        {open && (
                            <div className="absolute right-0 mt-2 w-44 sm:w-48 dropdown-panel z-50">
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