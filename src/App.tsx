import { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";
import "./App.css";

import RegisterForm from "./Pagine/RegisterForm";
import ConfirmEmailWelcome from "./ConfirmEmailWelcome";
import LoginForm from "./Pagine/LoginForm";
import Home from "./Pagine/Home";
import Profilo from "./Profilo/Profilo";
import ListaProgetti from "./Liste/ListaProgetti";
import ListaTask from "./Liste/ListaTask";
import DettaglioProgetto from "./GestioneProgetti/DettaglioProgetto";
import CalendarioProgetto from "./GestioneProgetti/CalendarioProgetto";
import BachecaProgetto from "./GestioneProgetti/BachecaProgetto";
import ListaClienti from "./Liste/ListaClienti";

import Header from "./Header/Header";
import Sidebar from "./Sidebar/Sidebar";
import NotificheSidebar from "./Notifiche/NotificheSidebar";
import MiniProjectCreatorModal from "./Creazione/MiniProjectCreatorModal";
import AnimatedLogo from "./LandingPage/AnimatedLogo"; // ✅ Importa l'animazione
import MiniTaskCreatorModal from "./Creazione/MiniTaskCreatorModal";
import MiniClientCreatorModal from "./Creazione/MiniClientCreatorModal";

export default function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [, setUserId] = useState<string | null>(null);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificheOpen, setNotificheOpen] = useState(false);
    const [showAnimation, setShowAnimation] = useState(true); // ✅ Stato per animazione

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
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

    // ✅ Mostra l’animazione iniziale se attiva
    if (showAnimation) return <AnimatedLogo onFinish={() => setShowAnimation(false)} />;

    return (
        <Router>
            <header>
                <Header
                    loggedIn={loggedIn}
                    onToggleSidebar={() => setSidebarOpen((p) => !p)}
                    onApriNotifiche={() => setNotificheOpen(prev => !prev)}
                    notificheSidebarAperta={notificheOpen}
                />
            </header>

            <main className="relative h-[calc(100vh-3.5rem)] bg-theme text-theme overflow-hidden">
                <div className="relative h-full flex">
                    <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        onApriProjectModal={() => setShowProjectModal(true)}
                        onApriTaskModal={() => setShowTaskModal(true)}
                        onApriClientModal={() => setShowClientModal(true)} // ✅ nuovo
                    />
                    <div className={`flex-1 transition-all ${sidebarOpen ? "ml-64" : ""} ${notificheOpen ? "mr-64" : ""}`}>
                        <div className="px-6 py-6 h-full overflow-auto hide-scrollbar">
                            <Routes>
                                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
                                <Route path="/login" element={<LoginForm />} />
                                <Route path="/register" element={<RegisterForm />} />
                                <Route path="/confirm-email" element={<ConfirmEmailWelcome />} />
                                <Route path="/home" element={<Home />} />
                                <Route
                                    path="/progetti"
                                    element={
                                        <ListaProgetti
                                            sidebarSinistraAperta={sidebarOpen}
                                            notificheSidebarAperta={notificheOpen}
                                        />
                                    }
                                />
                                <Route
                                    path="/task"
                                    element={
                                        <ListaTask
                                            sidebarSinistraAperta={sidebarOpen}
                                            notificheSidebarAperta={notificheOpen}
                                        />
                                    }
                                />
                                <Route
                                    path="/clienti"
                                    element={
                                        <ListaClienti
                                            sidebarSinistraAperta={sidebarOpen}
                                            notificheSidebarAperta={notificheOpen}
                                        />
                                    }
                                />

                                <Route path="/profilo" element={<Profilo />} />
                                <Route path="/progetti/:id" element={<DettaglioProgetto />} />
                                <Route path="/progetti/:id/calendario" element={<CalendarioProgetto />} />
                                <Route path="/progetti/:id/bacheca" element={<BachecaProgetto />} />
                            </Routes>
                        </div>
                    </div>
                    <NotificheSidebar open={notificheOpen} onClose={() => setNotificheOpen(false)} />
                </div>
            </main>

            {showProjectModal && (
                <MiniProjectCreatorModal
                    onClose={() => setShowProjectModal(false)}
                    offsetIndex={0}
                />
            )}
            {showTaskModal && (
                <MiniTaskCreatorModal
                    onClose={() => setShowTaskModal(false)}
                    offsetIndex={0}
                />
            )}
            {showClientModal && (
                <MiniClientCreatorModal
                    onClose={() => setShowClientModal(false)}
                    offsetIndex={0}
                />
            )}
        </Router>
    );
}
