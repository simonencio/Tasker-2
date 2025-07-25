import { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import RegisterForm from "./RegisterForm";
import ConfirmEmailWelcome from "./ConfirmEmailWelcome";
import NotificheManualSender from "./Notifiche/NotificheManualSender";
import NotificationPreferencesSelector from "./Notifiche/NotificationPreferencesSelector";
import { supabase } from "./supporto/supabaseClient";
import "./App.css";
import LoginForm from "./LoginForm";
import Home from "./Home";
import AppLayout from "./Layout/AppLayout";
import Profilo from "./Profilo/Profilo";
import NotificheBell from "./Notifiche/NotificheBell";
import Header from "./Header/Header";
import AggiungiCliente from "./Clienti";
import ProjectMemberAssignment from "./ProjectMembersAssigner";

export default function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

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

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/confirm-email" element={<ConfirmEmailWelcome />} />
                <Route path="/login" element={<LoginForm />} />

                {/* Le rotte protette usano AppLayout */}
                <Route
                    path="/home"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <Home />
                        </AppLayout>
                    }
                />
                <Route
                    path="/notifiche-manuali"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <NotificheManualSender />
                        </AppLayout>
                    }
                />
                <Route
                    path="/preferenze-notifiche"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <NotificationPreferencesSelector />
                        </AppLayout>
                    }
                />
                <Route
                    path="/profilo"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <Profilo />
                        </AppLayout>
                    }
                />
                <Route
                    path="/clienti"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <AggiungiCliente />
                        </AppLayout>
                    }
                />

            </Routes>

            {/* ✅ Mostra il componente di assegnazione membri al progetto */}
            {loggedIn && userId && (
                <div className="fixed bottom-4 right-4 bg-white p-4 rounded shadow-lg border">
                    <ProjectMemberAssignment creatore_id={userId} />
                </div>
            )}

        </Router>
    );
}
