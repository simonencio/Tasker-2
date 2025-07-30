import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import MiniClientCreatorModal from "../Creazione/MiniClientCreatorModal";
import {
    richiediPermessoNotificheBrowser,
    mostraNotificaBrowser,
} from "../Notifiche/notificheBrowserUtils";

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
    loggedIn: boolean;
    onToggleSidebar: () => void;
    onApriNotifiche: () => void;
    notificheSidebarAperta: boolean;
};

export default function Header({
    loggedIn,
    onToggleSidebar,
    onApriNotifiche,
    notificheSidebarAperta,
}: HeaderProps) {
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [nonViste, setNonViste] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [themeDropdown, setThemeDropdown] = useState(false);
    const [, setCurrentTheme] = useState("light");

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

        return () => authListener.subscription.unsubscribe();
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
        if (notificheSidebarAperta && userId) {
            setNonViste(0);
            supabase
                .from("notifiche_utenti")
                .update({
                    visualizzato: true,
                    visualizzato_al: new Date().toISOString(),
                })
                .eq("utente_id", userId)
                .is("visualizzato", false)
                .is("deleted_at", null);
        }
    }, [notificheSidebarAperta, userId]);

    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel(`realtime_notifiche_${userId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifiche_utenti",
                filter: `utente_id=eq.${userId}`,
            }, async (payload) => {
                const nuovaNotifica = payload.new as NotificaUtenteRecord;

                if (notificheSidebarAperta) {
                    await supabase
                        .from("notifiche_utenti")
                        .update({
                            visualizzato: true,
                            visualizzato_al: new Date().toISOString(),
                        })
                        .eq("notifica_id", nuovaNotifica.notifica_id)
                        .eq("utente_id", userId);
                } else {
                    aggiornaContatoreNotifiche();
                }

                const { data } = await supabase
                    .from("notifiche")
                    .select("messaggio")
                    .eq("id", nuovaNotifica.notifica_id)
                    .single();

                if (data) {
                    mostraNotificaBrowser("🔔 Notifica Kalimero", {
                        body: data.messaggio,
                        icon: "/kalimero_logo.png",
                    });
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, notificheSidebarAperta]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
            if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const headerCls = `sticky top-0 z-50 px-4 py-3 flex justify-between items-center shadow-md bg-theme text-theme transition-colors duration-300`;
    const btnCls = `cursor-pointer px-3 py-2 rounded text-[#c22e35] transition-transform duration-300`;
    const iconCls = `hover:scale-125 hover:shadow-xl transition-transform duration-300 ease-in-out`;

    return (
        <>
            <div className={headerCls}>
                <div className="flex items-center gap-3">
                    {loggedIn && (
                        <span onClick={onToggleSidebar} className={btnCls} role="button" tabIndex={0} aria-label="Apri Menu">
                            <FontAwesomeIcon icon={faBars} size="lg" className={iconCls} />
                        </span>
                    )}

                </div>

                <div className="flex items-center gap-2">
                    {loggedIn && (
                        <>
                            {/* CREA */}
                            <div ref={createRef} className="relative">
                                <span onClick={() => setCreateOpen(p => !p)} className={btnCls} role="button" tabIndex={0} aria-label="Crea">
                                    <FontAwesomeIcon icon={faPlus} size="lg" className={`${iconCls} text-green-500`} />
                                </span>
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

                            {/* TEMA */}
                            <div ref={themeRef} className="relative">
                                <span onClick={() => setThemeDropdown(p => !p)} className={btnCls} role="button" tabIndex={0} aria-label="Tema">
                                    <FontAwesomeIcon icon={faMoon} size="lg" className={`${iconCls} text-sky-500`} />
                                </span>
                                {themeDropdown && (
                                    <div className="absolute right-0 mt-2 w-40 dropdown-panel z-50">
                                        {[{ icon: faSun, label: "Chiaro", theme: "light", color: "text-yellow-400" },
                                        { icon: faMoon, label: "Scuro", theme: "dark", color: "text-sky-500" },
                                        { icon: faDesktop, label: "Sistema", theme: "system", color: "text-gray-500 dark:text-gray-300" }]
                                            .map(({ icon, label, theme, color }) => (
                                                <button
                                                    key={label}
                                                    onClick={() => { applyTheme(theme); setThemeDropdown(false); }}
                                                    className="dropdown-button flex items-center gap-2"
                                                >
                                                    <FontAwesomeIcon icon={icon} size="lg" className={`${iconCls} ${color}`} />
                                                    {label}
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* NOTIFICHE */}
                            <span
                                onClick={() => onApriNotifiche()}
                                className={`${btnCls} relative`}
                                role="button"
                                tabIndex={0}
                                aria-label="Notifiche"
                            >

                                <FontAwesomeIcon icon={faBell} size="lg" className={`${iconCls} text-yellow-500`} />
                                {nonViste > 0 && !notificheSidebarAperta && (
                                    <span className="notification-badge">{nonViste}</span>
                                )}
                            </span>
                        </>
                    )}

                    {/* UTENTE */}
                    <div ref={dropdownRef} className="relative">
                        <span onClick={() => setOpen(p => !p)} className={btnCls} role="button" tabIndex={0} aria-label="Utente">
                            <FontAwesomeIcon icon={faUserCircle} size="lg" className={`${iconCls} text-purple-500`} />
                        </span>
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
            </div>

            {/* MODALI */}
            {showProjectModal && <MiniProjectCreatorModal onClose={() => setShowProjectModal(false)} offsetIndex={0} />}
            {showTaskModal && <MiniTaskCreatorModal onClose={() => setShowTaskModal(false)} offsetIndex={showProjectModal ? 1 : 0} />}
            {showClientModal && <MiniClientCreatorModal onClose={() => setShowClientModal(false)} offsetIndex={(showProjectModal ? 1 : 0) + (showTaskModal ? 1 : 0)} />}
        </>
    );
}
