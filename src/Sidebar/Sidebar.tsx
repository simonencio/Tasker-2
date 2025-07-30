import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faHome,
    faProjectDiagram,
    faTasks,
    faPlus,
    faUserTie,
} from "@fortawesome/free-solid-svg-icons";

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    onApriProjectModal: () => void;
    onApriTaskModal: () => void;
    onApriClientModal: () => void; // ✅ aggiunta
};


export default function Sidebar({
    isOpen,
    onClose,
    onApriProjectModal,
    onApriTaskModal,
    onApriClientModal,
}: SidebarProps) {
    const [theme, setTheme] = useState("light");
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const getCurrentTheme = () => {
            const isDark = document.documentElement.classList.contains("dark");
            setTheme(isDark ? "dark" : "light");
        };

        getCurrentTheme();
        const observer = new MutationObserver(getCurrentTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const checkRuolo = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from("utenti")
                .select("ruolo")
                .eq("id", user.id)
                .single();
            if (!error && data?.ruolo === 1) setIsAdmin(true);
        };
        checkRuolo();
    }, []);

    return (
        <aside
            className={`absolute top-0 left-0 h-full w-64 sidebar-theme text-theme transition-transform duration-300 z-40 ${isOpen ? "translate-x-0 sidebar-shadow-open" : "-translate-x-full"
                }`}
        >
            <nav className="flex flex-col p-4 gap-4 h-full items-center">
                <button
                    onClick={() => {
                        navigate("/home");
                        onClose();
                    }}
                    className="focus:outline-none transition-transform duration-300 hover:scale-110"
                    title="Torna alla Home"
                >
                    <img
                        src={theme === "dark" ? "/kalimero_logo2.png" : "/kalimero_logo.png"}
                        alt="Logo Kalimero"
                        className="h-8 sm:h-9 md:h-10 lg:h-11 xl:h-12"
                    />
                </button>

                <div className="w-full flex flex-col gap-4 mt-4">
                    {/* ✅ HOME */}
                    <NavLink
                        to="/home"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"}`
                        }
                    >
                        <FontAwesomeIcon icon={faHome} className="icon-color" />
                        Home
                    </NavLink>

                    {/* ✅ PROGETTI */}
                    <NavLink
                        to="/progetti"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"}`
                        }
                    >
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faProjectDiagram} className="icon-color" />
                            Progetti
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onApriProjectModal();
                            }}
                            className="icon-color hover:text-blue-400 transition"
                            title="Nuovo progetto"
                        >
                            <FontAwesomeIcon icon={faPlus} size="sm" />
                        </button>
                    </NavLink>

                    {/* ✅ TASK */}
                    <NavLink
                        to="/task"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"}`
                        }
                    >
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faTasks} className="icon-color" />
                            Task
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onApriTaskModal();
                            }}
                            className="icon-color hover:text-green-500 transition"
                            title="Nuova task"
                        >
                            <FontAwesomeIcon icon={faPlus} size="sm" />
                        </button>
                    </NavLink>

                    {/* ✅ CLIENTI - Solo admin */}
                    {isAdmin && (
                        <NavLink
                            to="/clienti"
                            onClick={onClose}
                            className={({ isActive }) =>
                                `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"}`
                            }
                        >
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faUserTie} className="icon-color" />
                                Clienti
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onApriClientModal(); // ✅ apre modale clienti
                                }}
                                className="icon-color hover:text-red-400 transition"
                                title="Nuovo cliente"
                            >
                                <FontAwesomeIcon icon={faPlus} size="sm" />
                            </button>
                        </NavLink>
                    )}

                </div>
            </nav>
        </aside>
    );
}
