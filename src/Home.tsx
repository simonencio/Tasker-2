import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";

export default function Home() {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email ?? null);
            } else {
                navigate("/login");
            }
            setLoading(false);
        };
        fetchUser();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    if (loading) return <div className="p-6">Caricamento...</div>;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
            <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md text-center">
                <h1 className="text-2xl font-semibold mb-2">Benvenuto!</h1>
                {email && <p className="text-gray-700 mb-4">Hai effettuato l'accesso come <strong>{email}</strong></p>}

                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
