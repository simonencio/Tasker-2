import { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    Link,
} from "react-router-dom";
import RegisterForm from "./RegisterForm";
import ConfirmEmailWelcome from "./ConfirmEmailWelcome";
import NotificheSidebar from "./Notifiche/NotificheSidebar";
import NotificheManualSender from "./Notifiche/NotificheManualSender";
import NotificationPreferencesSelector from "./Notifiche/NotificationPreferencesSelector";
import { supabase } from "./supporto/supabaseClient";
import "./App.css";
import LoginForm from "./LoginForm";
import Home from "./Home";

export default function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setLoggedIn(!!user);
        };
        checkAuth();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoggedIn(!!session?.user);
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    return (
        <Router>
            {loggedIn && (
                <>
                    {/* 🔔 Pulsante notifiche */}
                    <div className="fixed top-4 right-4 z-50">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="bg-blue-600 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center shadow hover:bg-blue-700"
                            title="Apri notifiche"
                        >
                            N
                        </button>
                    </div>
                    <NotificheSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                    {/* 📌 Menu navigazione (solo da loggati) */}
                    <nav className="bg-gray-100 p-4 flex gap-4 shadow border-b mt-14">
                        <Link to="/home" className="text-blue-600 hover:underline">🏠 Home</Link>
                        <Link to="/notifiche-manuali" className="text-blue-600 hover:underline">📨 Notifiche Manuali</Link>
                        <Link to="/preferenze-notifiche" className="text-blue-600 hover:underline">📬 Preferenze Notifiche</Link>
                        <Link to="/register" className="text-blue-600 hover:underline">Registrati</Link>
                        <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
                    </nav>
                </>
            )}

            <Routes>
                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/confirm-email" element={<ConfirmEmailWelcome />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/home" element={<Home />} />
                <Route path="/notifiche-manuali" element={<NotificheManualSender />} />
                <Route path="/preferenze-notifiche" element={<NotificationPreferencesSelector />} />
            </Routes>
        </Router>
    );
}
