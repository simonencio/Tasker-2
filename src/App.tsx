// src/App.tsx
import { useEffect, useState, useCallback } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
    useParams,
    useSearchParams, // ⬅️ nuovo
} from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";
import "./App.css";
import BachecaDinamica from "./Liste/BachecaDinamica";

import RegisterForm from "./Pagine/RegisterForm";
import ConfirmEmailWelcome from "./Pagine/ConfirmEmailWelcome";
import LoginForm from "./Pagine/LoginForm";
import Home from "./Pagine/Home";
import Profilo from "./Profilo/Profilo";

import DettaglioProgetto from "./GestioneProgetto/DettaglioProgetto";
import CalendarioProgetto from "./GestioneProgetto/CalendarioProgetto";
import BachecaProgetto from "./GestioneProgetto/BachecaProgetto";

import ResetPassword from "./Pagine/ResetPassword";
import Header from "./Header/Header";
import Sidebar from "./Sidebar/Sidebar";
import NotificheSidebar from "./Notifiche/NotificheSidebar";

import MiniProjectCreatorModal from "./Creazione/MiniProjectCreatorModal";
import MiniTaskCreatorModal from "./Creazione/MiniTaskCreatorModal";
import MiniClientCreatorModal from "./Creazione/MiniClientCreatorModal";
import MiniUserCreatorModal from "./Creazione/MiniUserCreatorModal";
import MiniStatoCreatorModal from "./Creazione/MiniStatoCreatorModal";
import MiniPrioritaCreatorModal from "./Creazione/MiniPrioritaCreatorModal";
import MiniRuoloCreatorModal from "./Creazione/MiniRuoloCreatorModal";

import DettaglioTask from "./GestioneTask/DettaglioTask";
import Cestino from "./Pagine/Cestino";

// ✅ scheletri lista/card
import ListaDinamica from "./Liste/ListaDinamica";
import CardDinamiche from "./Liste/CardDinamiche"; // ⬅️ nuovo
import type { ResourceKey } from "./Liste/resourceConfigs"; // ⬅️ nuovo

type ModalType = "project" | "task" | "client" | "user" | "stato" | "priorita" | "ruolo";

/** Redirect legacy /tasks/:id -> /tasks/:slug */
function RedirectTaskById() {
    const { id } = useParams();
    const [slug, setSlug] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!id) return;
            const { data, error } = await supabase.from("tasks").select("slug").eq("id", id).maybeSingle();
            if (!alive) return;
            if (error) {
                console.error(error);
                setNotFound(true);
                return;
            }
            if (!data?.slug) {
                setNotFound(true);
                return;
            }
            setSlug(data.slug);
        })();
        return () => {
            alive = false;
        };
    }, [id]);

    if (slug) return <Navigate to={`/tasks/${slug}`} replace />;
    if (notFound) return <Navigate to="/task" replace />;
    return null;
}

/** ⬇️ Wrapper riutilizzabile con dropdown lista/card */
function ResourceRoute({ tipo, paramKey = "view" }: { tipo: ResourceKey; paramKey?: string }) {
    const [params, setParams] = useSearchParams();
    const view = params.get(paramKey) === "cards"
        ? "cards"
        : params.get(paramKey) === "board"
            ? "board"
            : "list";

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const next = new URLSearchParams(params);
        next.set(paramKey, e.target.value);
        setParams(next, { replace: true });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <label className="mr-2 text-sm opacity-80">Visualizzazione:</label>
                <select value={view} onChange={onChange} className="input-style">
                    <option value="list">Lista</option>
                    <option value="cards">Card</option>
                    <option value="board">Bacheca</option>
                </select>
            </div>

            {view === "cards" ? (
                <CardDinamiche tipo={tipo} />
            ) : view === "board" ? (
                <BachecaDinamica tipo={tipo} />
            ) : (
                <ListaDinamica tipo={tipo} />
            )}
        </div>
    );
}



function AppContent() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificheOpen, setNotificheOpen] = useState(false);
    const [activeModals, setActiveModals] = useState<ModalType[]>([]);
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);

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
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const getMaxModals = useCallback(() => {
        if (windowWidth <= 640) return 1;
        if (windowWidth <= 1024) return 2;
        if (windowWidth <= 1440) return 3;
        if (windowWidth <= 1920) return 4;
        if (windowWidth >= 2560) return 6;
        return 5;
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
            if (updated.length > max) return updated.slice(updated.length - max);
            return updated;
        });
    };

    const closeModal = (type: ModalType) => {
        setActiveModals((prev) => prev.filter((m) => m !== type));
    };

    const getOffset = (type: ModalType) => activeModals.indexOf(type);

    // ✅ esponi hook globale per aprire modali "create" da resourceConfigs
    useEffect(() => {
        (window as any).__openMiniCreate = (kind: "stato" | "priorita" | "ruolo") => {
            if (kind === "stato") openModal("stato");
            else if (kind === "priorita") openModal("priorita");
            else if (kind === "ruolo") openModal("ruolo");
        };
        return () => {
            try {
                delete (window as any).__openMiniCreate;
            } catch {
                (window as any).__openMiniCreate = undefined;
            }
        };
    }, []);

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
                        <div className="fixed top-16 left-0 z-40 w-full sm:w-full md:w-64 h-[calc(100vh-4rem)] bg-theme shadow-xl">
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
                        <div className="fixed top-16 right-0 z-40 w-full sm:w-full md:w-64 h-[calc(100vh-4rem)] bg-theme shadow-xl">
                            <NotificheSidebar open={notificheOpen} onClose={() => setNotificheOpen(false)} userId={userId} />
                        </div>
                    )}

                    <div className="w-full relative z-10">
                        <div className="px-6 py-6 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
                            <Routes>
                                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
                                <Route path="/home" element={<Home />} />

                                {/* ✅ route risorsa con switch Lista/Card */}
                                <Route path="/progetti" element={<ResourceRoute tipo="progetti" />} />
                                <Route path="/task" element={<ResourceRoute tipo="tasks" />} />
                                <Route path="/clienti" element={<ResourceRoute tipo="clienti" />} />
                                <Route path="/utenti" element={<ResourceRoute tipo="utenti" />} />

                                {/* Aggregato “Altre liste” con switch Lista/Card per ogni risorsa */}
                                <Route
                                    path="/altre-liste"
                                    element={
                                        <div className="space-y-8">
                                            <ResourceRoute tipo="stati" paramKey="view_stati" />
                                            <ResourceRoute tipo="ruoli" paramKey="view_ruoli" />
                                            <ResourceRoute tipo="priorita" paramKey="view_priorita" />
                                            <ResourceRoute tipo="time_entries" paramKey="view_time_entries" />
                                        </div>
                                    }
                                />



                                <Route path="/profilo" element={<Profilo />} />

                                <Route path="/progetti/:slug" element={<DettaglioProgetto />} />
                                <Route path="/progetti/:slug/calendario" element={<CalendarioProgetto />} />
                                <Route path="/progetti/:slug/bacheca" element={<BachecaProgetto />} />

                                <Route path="/tasks/:slug" element={<DettaglioTask />} />
                                <Route path="/tasks/id/:id" element={<RedirectTaskById />} />
                                <Route path="/tasks/:id([0-9a-fA-F-]{36})" element={<RedirectTaskById />} />

                                <Route path="/cestino" element={<Cestino />} />
                            </Routes>
                        </div>
                    </div>
                </main>
            )}

            {/* tutte le modali con offsetIndex */}
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
            {activeModals.includes("stato") && (
                <MiniStatoCreatorModal onClose={() => closeModal("stato")} offsetIndex={getOffset("stato")} />
            )}
            {activeModals.includes("priorita") && (
                <MiniPrioritaCreatorModal onClose={() => closeModal("priorita")} offsetIndex={getOffset("priorita")} />
            )}
            {activeModals.includes("ruolo") && (
                <MiniRuoloCreatorModal onClose={() => closeModal("ruolo")} offsetIndex={getOffset("ruolo")} />
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
