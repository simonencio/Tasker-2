import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faHome,
    faProjectDiagram,
    faTasks,
    faPlus,
    faUserTie,
    faUser,
    faEllipsisH,
    faCalendarWeek
} from "@fortawesome/free-solid-svg-icons";

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    onApriProjectModal: () => void;
    onApriTaskModal: () => void;
    onApriClientModal: () => void;
    onApriUserModal: () => void;

};

export default function Sidebar({
    isOpen,
    onClose,
    onApriProjectModal,
    onApriTaskModal,
    onApriClientModal,
    onApriUserModal,
}: SidebarProps) {
    const [theme, setTheme] = useState("light");
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

    return (
        <aside
            className={`absolute top-0 left-0 h-full w-full md:w-70 sidebar-theme text-theme transition-transform duration-300 z-40 ${isOpen ? "translate-x-0 sidebar-shadow-open" : "-translate-x-full"
                }`}
        >
            <nav className="flex flex-col p-4 gap-4 h-full items-center">
                {/* LOGO */}
                <button
                    onClick={() => {
                        navigate("/home");
                        onClose();
                    }}
                    className="focus:outline-none transition-transform duration-300 hover:scale-110"
                    title="Torna alla Home"
                >
                    <img
                        src={theme === "dark" ? "/tasker_logo_finale.png" : "/tasker_logo_finale_2.png"}
                        alt="Logo Tasker"
                        className="h-8 sm:h-9 md:h-10 lg:h-11 xl:h-12"
                    />
                </button>

                <div className="w-full flex flex-col gap-4 mt-4">
                    {/* HOME */}
                    <NavLink
                        to="/home"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"
                            }`
                        }
                    >
                        <FontAwesomeIcon icon={faHome} className="icon-color" />
                        Home
                    </NavLink>

                    {/* CALENDARIO */}
                    <NavLink
                        to="/calendario"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"}`
                        }
                    >
                        <FontAwesomeIcon icon={faCalendarWeek} className="icon-color" />
                        Calendario
                    </NavLink>


                    {/* PROGETTI */}
                    <NavLink
                        to="/progetti"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"
                            }`
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

                    {/* TASK */}
                    <NavLink
                        to="/tasks"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"
                            }`
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

                    {/* CLIENTI */}
                    <NavLink
                        to="/clienti"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"
                            }`
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
                                onApriClientModal();
                            }}
                            className="icon-color hover:text-red-400 transition"
                            title="Nuovo cliente"
                        >
                            <FontAwesomeIcon icon={faPlus} size="sm" />
                        </button>
                    </NavLink>

                    {/* UTENTI */}
                    <NavLink
                        to="/utenti"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center justify-between gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"
                            }`
                        }
                    >
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faUser} className="icon-color" />
                            Utenti
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onApriUserModal();
                            }}
                            className="icon-color hover:text-indigo-400 transition"
                            title="Nuovo utente"
                        >
                            <FontAwesomeIcon icon={faPlus} size="sm" />
                        </button>
                    </NavLink>

                    <NavLink
                        to="/altre-liste"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `hover-bg-theme flex items-center gap-2 ${isActive ? "active-link" : "px-4 py-2 rounded"}`
                        }
                    >
                        <FontAwesomeIcon icon={faEllipsisH} className="icon-color" />
                        Altro
                    </NavLink>
                </div>
            </nav>
        </aside>
    );
}