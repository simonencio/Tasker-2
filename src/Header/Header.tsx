// Header.tsx completo aggiornato ✅
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
import {
    richiediPermessoNotificheBrowser,
    mostraNotificaBrowser,
} from "../Notifiche/notificheBrowserUtils";
import { isUtenteAdmin } from "../supporto/ruolo";

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
    onApriModale: (type: "project" | "task" | "client" | "user") => void;
};

type Utente = {
    nome: string;
    cognome: string;
    avatar_url: string | null;
};

export default function Header({
    loggedIn,
    onToggleSidebar,
    onApriNotifiche,
    notificheSidebarAperta,
    onApriModale,
}: HeaderProps) {
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [nonViste, setNonViste] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [themeDropdown, setThemeDropdown] = useState(false);
    const [, setCurrentTheme] = useState("light");
    const [isAdmin, setIsAdmin] = useState(false);
    const [utente, setUtente] = useState<Utente | null>(null);

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

                const { data, error } = await supabase
                    .from("utenti")
                    .select("nome, cognome, avatar_url")
                    .eq("id", user.id)
                    .single();
                if (data && !error) setUtente(data);

                const admin = await isUtenteAdmin();
                setIsAdmin(admin);
            }
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            const id = session?.user?.id || null;
            setUserId(id);
            if (id) {
                richiediPermessoNotificheBrowser();
                supabase
                    .from("utenti")
                    .select("nome, cognome, avatar_url")
                    .eq("id", id)
                    .single()
                    .then(async ({ data }) => {
                        setUtente(data || null);
                        const admin = await isUtenteAdmin();
                        setIsAdmin(admin);
                    });
            }
        });

        return () => {
            authListener?.subscription?.unsubscribe();
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

    useEffect(() => {
        if (userId) aggiornaContatoreNotifiche();
    }, [userId]);

    useEffect(() => {
        if (notificheSidebarAperta && userId) {
            setNonViste(0);
            supabase
                .from("notifiche_utenti")
                .update({ visualizzato: true, visualizzato_al: new Date().toISOString() })
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
                } else aggiornaContatoreNotifiche();

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

        return () => {
            supabase.removeChannel(channel);
        };
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

    const renderUserIcon = () => {
        const wrapperClass =
            "w-[28px] h-[28px] rounded-full flex items-center justify-center flex-none";
        const styleFix = {
            display: "inline-block",
            verticalAlign: "middle",
            lineHeight: "1",
        };

        if (!loggedIn) {
            return (
                <FontAwesomeIcon
                    icon={faUserCircle}
                    size="xl"
                    className="text-purple-500 hover:scale-125 hover:shadow-xl transition-transform"
                />
            );
        }

        if (utente?.avatar_url) {
            return (
                <img
                    src={utente.avatar_url}
                    alt="avatar"
                    className={`${wrapperClass} object-cover border border-gray-400 dark:border-gray-600`}
                    style={styleFix}
                />
            );
        }

        return (
            <FontAwesomeIcon
                icon={faUserCircle}
                size="xl"
                className="text-purple-500 hover:scale-125 hover:shadow-xl transition-transform"
            />
        );
    };

    return (
        <div className="min-h-16 px-4 py-3 flex justify-between items-center shadow-md bg-theme text-theme transition-colors duration-300">
            <div className="flex items-center gap-3">
                {loggedIn && (
                    <span onClick={onToggleSidebar} className="cursor-pointer px-3 py-2 rounded">
                        <FontAwesomeIcon icon={faBars} size="xl" className="text-[#c22e35] hover:scale-125 hover:shadow-xl transition-transform duration-300" />
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {loggedIn && (
                    <div ref={createRef} className="relative">
                        <span onClick={() => setCreateOpen(p => !p)} className="cursor-pointer px-3 py-2 rounded">
                            <FontAwesomeIcon icon={faPlus} size="xl" className="text-green-500 hover:scale-125 hover:shadow-xl transition-transform duration-300" />
                        </span>
                        {createOpen && (
                            <div className="dropdown-panel absolute right-0 mt-2 w-36 sm:w-40 z-50">
                                <button onClick={() => { onApriModale("task"); setCreateOpen(false); }} className="dropdown-button">Attività</button>
                                <button onClick={() => { onApriModale("project"); setCreateOpen(false); }} className="dropdown-button">Progetto</button>
                                {isAdmin && (
                                    <>
                                        <button onClick={() => { onApriModale("client"); setCreateOpen(false); }} className="dropdown-button">Clienti</button>
                                        <button onClick={() => { onApriModale("user"); setCreateOpen(false); }} className="dropdown-button">Utenti</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div ref={themeRef} className="relative">
                    <span onClick={() => setThemeDropdown(p => !p)} className="cursor-pointer px-3 py-2 rounded">
                        <FontAwesomeIcon icon={faMoon} size="xl" className="text-sky-500 hover:scale-125 hover:shadow-xl transition-transform" />
                    </span>
                    {themeDropdown && (
                        <div className="dropdown-panel absolute right-0 mt-2 w-30 z-50">
                            {[{ icon: faSun, label: "Chiaro", theme: "light", color: "text-yellow-400" },
                            { icon: faMoon, label: "Scuro", theme: "dark", color: "text-sky-500" },
                            { icon: faDesktop, label: "Sistema", theme: "system", color: "text-blue-700" }]
                                .map(({ icon, label, theme, color }) => (
                                    <button
                                        key={label}
                                        onClick={() => { applyTheme(theme); setThemeDropdown(false); }}
                                        className="dropdown-button flex items-center"
                                    >
                                        <span className={`w-6 shrink-0 text-center ${color}`}>
                                            <FontAwesomeIcon icon={icon} size="lg" />
                                        </span>
                                        <span className="ml-2 text-left">{label}</span>
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                {loggedIn && (
                    <span onClick={onApriNotifiche} className="cursor-pointer px-3 py-2 rounded relative">
                        <FontAwesomeIcon icon={faBell} size="xl" className="text-yellow-500 hover:scale-125 hover:shadow-xl transition-transform" />
                        {nonViste > 0 && !notificheSidebarAperta && (
                            <span className="notification-badge">{nonViste}</span>
                        )}
                    </span>
                )}

                <div ref={dropdownRef} className="relative">
                    <span onClick={() => setOpen(p => !p)} className="cursor-pointer px-3 py-2 rounded">
                        {renderUserIcon()}
                    </span>
                    {open && (
                        <div className="dropdown-panel absolute right-0 mt-2 w-44 sm:w-48 z-50">
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
    );
}
