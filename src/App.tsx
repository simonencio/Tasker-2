import { useEffect, useState, useCallback } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";
import "./App.css";

import RegisterForm from "./Pagine/RegisterForm";
import ConfirmEmailWelcome from "./Pagine/ConfirmEmailWelcome";
import LoginForm from "./Pagine/LoginForm";
import Home from "./Pagine/Home";
import Profilo from "./Profilo/Profilo";
import ListaProgetti from "./Liste/ListaProgetti";
import ListaTask from "./Liste/ListaTask";
import DettaglioProgetto from "./GestioneProgetto/DettaglioProgetto";
import CalendarioProgetto from "./GestioneProgetto/CalendarioProgetto";
import BachecaProgetto from "./GestioneProgetto/BachecaProgetto";
import ListaClienti from "./Liste/ListaClienti";
import ListaUtenti from "./Liste/ListaUtenti";
import ResetPassword from "./Pagine/ResetPassword";
// import AnimatedLogo from "./LandingPage/AnimatedLogo"; // ✅ Importa l'animazione
import Header from "./Header/Header";
import Sidebar from "./Sidebar/Sidebar";
import NotificheSidebar from "./Notifiche/NotificheSidebar";
import MiniProjectCreatorModal from "./Creazione/MiniProjectCreatorModal";
import MiniTaskCreatorModal from "./Creazione/MiniTaskCreatorModal";
import MiniClientCreatorModal from "./Creazione/MiniClientCreatorModal";
import MiniUserCreatorModal from "./Creazione/MiniUserCreatorModal";
import DettaglioTask from "./GestioneTask/DettaglioTask";



type ModalType = "project" | "task" | "client" | "user";

function AppContent() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [, setUserId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificheOpen, setNotificheOpen] = useState(false);
    const [activeModals, setActiveModals] = useState<ModalType[]>([]);
    const location = useLocation();
    // const [showAnimation, setShowAnimation] = useState(true); // ✅ Stato per animazione
    const publicRoutes = ["/login", "/register", "/confirm-email", "/reset-password/"];
    const isPublic = (() => {
        if (location.pathname.startsWith("/reset-password/")) return true;
        return publicRoutes.includes(location.pathname);
    })();

    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

    useEffect(() => {
        const checkAuth = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setLoggedIn(!!user);
            setUserId(user?.id ?? null);
        };

        checkAuth();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const newUser = session?.user;
            setLoggedIn(!!newUser);
            setUserId(newUser?.id ?? null);
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const getMaxModals = useCallback(() => {
        if (windowWidth <= 768) return 1;
        if (windowWidth <= 1024) return 2;
        return 4;
    }, [windowWidth]);

    useEffect(() => {
        const max = getMaxModals();
        if (activeModals.length > max) {
            setActiveModals((prev) => prev.slice(prev.length - max));
        }
    }, [windowWidth, activeModals, getMaxModals]);

    const toggleSidebar = () => {
        setSidebarOpen((prev) => {
            if (!prev) setNotificheOpen(false);
            return !prev;
        });
    };

    const toggleNotifiche = () => {
        setNotificheOpen((prev) => {
            if (!prev) setSidebarOpen(false);
            return !prev;
        });
    };

    const openModal = (type: ModalType) => {
        setActiveModals((prev) => {
            const max = getMaxModals();
            if (prev.includes(type)) return prev;
            const updated = [...prev, type];
            if (updated.length > max) {
                return updated.slice(updated.length - max);
            }
            return updated;
        });
    };

    const closeModal = (type: ModalType) => {
        setActiveModals((prev) => prev.filter((m) => m !== type));
    };

    const getOffset = (type: ModalType) => {
        return activeModals.indexOf(type);
    };
    // ✅ Mostra l’animazione iniziale se attiva
    // if (showAnimation) return <AnimatedLogo onFinish={() => setShowAnimation(false)} />;
    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50">
                <Header
                    loggedIn={loggedIn}
                    onToggleSidebar={toggleSidebar}
                    onApriNotifiche={toggleNotifiche}
                    notificheSidebarAperta={notificheOpen}
                    onApriModale={openModal}
                />
            </header>

            {isPublic ? (
                <main className="pt-16 bg-theme text-theme px-6 min-h-[calc(100vh-4rem)]">
                    <Routes>
                        <Route path="/login" element={<LoginForm />} />
                        <Route path="/register" element={<RegisterForm />} />
                        <Route path="/confirm-email" element={<ConfirmEmailWelcome />} />
                        <Route path="/reset-password/:userId" element={<ResetPassword />} />
                    </Routes>
                </main>
            ) : (
                <main className="pt-16 bg-theme text-theme overflow-hidden relative">
                    {sidebarOpen && (
                        <div className="fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-theme shadow-xl">
                            <Sidebar
                                isOpen={sidebarOpen}
                                onClose={() => setSidebarOpen(false)}
                                onApriProjectModal={() => openModal("project")}
                                onApriTaskModal={() => openModal("task")}
                                onApriClientModal={() => openModal("client")}
                                onApriUserModal={() => openModal("user")}
                            />
                        </div>
                    )}

                    {notificheOpen && (
                        <div className="fixed top-16 right-0 z-40 w-64 h-[calc(100vh-4rem)] bg-theme shadow-xl">
                            <NotificheSidebar open={notificheOpen} onClose={() => setNotificheOpen(false)} />
                        </div>
                    )}

                    <div className="w-full relative z-10">
                        <div className="px-6 py-6 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
                            <Routes>
                                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
                                <Route path="/home" element={<Home />} />
                                <Route path="/progetti" element={<ListaProgetti />} />
                                <Route path="/task" element={<ListaTask />} />
                                <Route path="/clienti" element={<ListaClienti />} />
                                <Route path="/utenti" element={<ListaUtenti />} />
                                <Route path="/profilo" element={<Profilo />} />
                                <Route path="/progetti/:id" element={<DettaglioProgetto />} />
                                <Route path="/progetti/:id/calendario" element={<CalendarioProgetto />} />
                                <Route path="/progetti/:id/bacheca" element={<BachecaProgetto />} />
                                <Route path="/tasks/:id" element={<DettaglioTask />} />
                            </Routes>
                        </div>
                    </div>
                </main>
            )}

            {activeModals.includes("project") && (
                <MiniProjectCreatorModal onClose={() => closeModal("project")} offsetIndex={getOffset("project")} />
            )}
            {activeModals.includes("task") && (
                <MiniTaskCreatorModal onClose={() => closeModal("task")} offsetIndex={getOffset("task")} />
            )}
            {activeModals.includes("client") && (
                <MiniClientCreatorModal onClose={() => closeModal("client")} offsetIndex={getOffset("client")} />
            )}
            {activeModals.includes("user") && (
                <MiniUserCreatorModal onClose={() => closeModal("user")} offsetIndex={getOffset("user")} />
            )}
        </>
    );
}

export default function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}
