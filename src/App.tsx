import { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import RegisterForm from "./RegisterForm";
import ConfirmEmailWelcome from "./ConfirmEmailWelcome";

import { supabase } from "./supporto/supabaseClient";
import "./App.css";
import LoginForm from "./LoginForm";
import Home from "./Home";
import AppLayout from "./Layout/AppLayout";
import Profilo from "./Profilo/Profilo";
import Progetti from "./Progetto";
import Task from "./Task";


export default function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [, setUserId] = useState<string | null>(null);

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
                    path="/progetti"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <Progetti />
                        </AppLayout>
                    }
                />

                <Route
                    path="/task"
                    element={
                        <AppLayout loggedIn={loggedIn}>
                            <Task />
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


            </Routes>

         

        </Router>
    );
}