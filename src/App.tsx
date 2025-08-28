// src/App.tsx
import { useEffect, useState, useCallback } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
    useParams,
    useSearchParams,
} from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";
import "./App.css";

import RegisterForm from "./Pagine/RegisterForm";
import ConfirmEmailWelcome from "./Pagine/ConfirmEmailWelcome";
import LoginForm from "./Pagine/LoginForm";
import Home from "./Pagine/Home";
import Profilo from "./Profilo/Profilo";
// ⬇️ aggiungi
import { ToastBridge, TimerOverlay } from "./Liste/resourceConfigs";


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

// Viste
import ListaDinamica from "./Liste/ListaDinamica";
import CardDinamiche from "./Liste/CardDinamiche";
import BachecaDinamica from "./Liste/BachecaDinamica";

import type { ResourceKey } from "./Liste/resourceConfigs";
import { getPreferredView, type Vista } from "./Liste/viewPrefs";

type ModalType = "project" | "tasks" | "client" | "user" | "stato" | "priorita" | "ruolo";

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
            if (error || !data?.slug) {
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
    if (notFound) return <Navigate to="/tasks" replace />;
    return null;
}

/** Route che decide la vista in base a ?{paramKey}= (fallback su localStorage) e la PROPAGA alle viste */
function ResourceRoute({ tipo, paramKey = "view" }: { tipo: ResourceKey; paramKey?: string }) {
    const [params] = useSearchParams();

    const view: Vista = (() => {
        const v = params.get(paramKey);
        if (v === "list" || v === "cards" || v === "board") return v;
        return getPreferredView(tipo, "list");
    })();

    if (view === "cards") return <CardDinamiche tipo={tipo} paramKey={paramKey} />;
    if (view === "board") return <BachecaDinamica tipo={tipo} paramKey={paramKey} />;
    return <ListaDinamica tipo={tipo} paramKey={paramKey} />;
}

function AppContent() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificheOpen, setNotificheOpen] = useState(false);
    const [activeModals, setActiveModals] = useState<ModalType[]>([]);
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);

    const publicRoutes = ["/login", "/register", "/confirm-email", "/reset-password/"];
    const isPublic = location.pathname.startsWith("/reset-password/") || publicRoutes.includes(location.pathname);

    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

    useEffect(() => {
        const apply = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setLoggedIn(!!user);
            setUserId(user?.id ?? null);
        };
        apply();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            const newUser = session?.user ?? null;
            setLoggedIn(!!newUser);
            setUserId(newUser?.id ?? null);
        });
        return () => authListener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
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
        setActiveModals(prev => (prev.length > max ? prev.slice(prev.length - max) : prev));
    }, [windowWidth, getMaxModals]);

    const toggleSidebar = () => {
        setSidebarOpen(prev => {
            if (!prev) setNotificheOpen(false);
            return !prev;
        });
    };
    const toggleNotifiche = () => {
        setNotificheOpen(prev => {
            if (!prev) setSidebarOpen(false);
            return !prev;
        });
    };

    const openModal = (type: ModalType) => {
        setActiveModals(prev => {
            if (prev.includes(type)) return prev;
            const max = getMaxModals();
            const updated = [...prev, type];
            return updated.length > max ? updated.slice(updated.length - max) : updated;
        });
    };
    const closeModal = (type: ModalType) => setActiveModals(prev => prev.filter(m => m !== type));
    const getOffset = (type: ModalType) => activeModals.indexOf(type);

    // esponi apertura "mini create" a risorse
    useEffect(() => {
        (window as any).__openMiniCreate = (kind: "stato" | "priorita" | "ruolo") => {
            if (kind === "stato") openModal("stato");
            else if (kind === "priorita") openModal("priorita");
            else if (kind === "ruolo") openModal("ruolo");
            (window as any).__openMiniTask = () => openModal("tasks");
            (window as any).__openMiniProject = () => openModal("project");
            (window as any).__toggleNotifiche = () => toggleNotifiche();
        };
        return () => {
            try {
                delete (window as any).__openMiniCreate;
                delete (window as any).__openMiniTask;
                delete (window as any).__openMiniProject;
                delete (window as any).__toggleNotifiche;
            } catch { }
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
                        <div className="fixed top-16 left-0 z-40 w-full md:w-64 h-[calc(100vh-4rem)] bg-theme shadow-xl">
                            <Sidebar
                                isOpen={sidebarOpen}
                                onClose={() => setSidebarOpen(false)}
                                onApriProjectModal={() => openModal("project")}
                                onApriTaskModal={() => openModal("tasks")}
                                onApriClientModal={() => openModal("client")}
                                onApriUserModal={() => openModal("user")}
                            />
                        </div>
                    )}

                    {notificheOpen && (
                        <div className="fixed top-16 right-0 z-40 w-full md:w-64 h-[calc(100vh-4rem)] bg-theme shadow-xl">
                            <NotificheSidebar open={notificheOpen} onClose={() => setNotificheOpen(false)} userId={userId} />
                        </div>
                    )}

                    <div className="w-full relative z-10">
                        <div className="px-6 py-6 h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
                            <Routes>
                                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
                                <Route path="/home" element={<Home />} />

                                {/* UNA SOLA route per risorsa: vista decisa da ?view= e fallback su preferenza */}
                                <Route path="/progetti" element={<ResourceRoute tipo="progetti" />} />
                                <Route path="/tasks" element={<ResourceRoute tipo="tasks" />} />
                                <Route path="/clienti" element={<ResourceRoute tipo="clienti" />} />
                                <Route path="/utenti" element={<ResourceRoute tipo="utenti" />} />

                                {/* ALTRE LISTE — ognuna con IL PROPRIO paramKey (indipendenti) */}
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

                                {/* Progetti */}
                                <Route path="/progetti/:slug" element={<DettaglioProgetto />} />
                                <Route path="/calendario" element={<CalendarioProgetto />} />
                                <Route path="/progetti/:slug/bacheca" element={<BachecaProgetto />} />

                                {/* Tasks */}
                                <Route path="/tasks/:slug" element={<DettaglioTask />} />
                                <Route path="/tasks/id/:id" element={<RedirectTaskById />} />
                                <Route path="/tasks/:id([0-9a-fA-F-]{36})" element={<RedirectTaskById />} />

                                <Route path="/cestino" element={<Cestino />} />
                            </Routes>
                        </div>
                    </div>
                </main>
            )}

            {/* Modali con offset */}
            {activeModals.includes("project") && (
                <MiniProjectCreatorModal onClose={() => closeModal("project")} offsetIndex={getOffset("project")} />
            )}
            {activeModals.includes("tasks") && (
                <MiniTaskCreatorModal onClose={() => closeModal("tasks")} offsetIndex={getOffset("tasks")} />
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
            <ToastBridge />  {/* toasts globali */}
            <TimerOverlay /> {/* overlay timer persistente */}
            <AppContent />
        </Router>
    );
}

