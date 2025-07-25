import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supporto/supabaseClient";


export default function Home() {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const oggi = new Date();
    const oggiStr = oggi.toLocaleDateString("it-IT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.user_metadata?.nome || user.email || null);
            } else {
                navigate("/login");
            }
            setLoading(false);
        };
        fetchUser();
    }, [navigate]);

    

    if (loading) return <div className="p-6">Caricamento...</div>;

    return (
        
            <div className="p-6 max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-1">
                    <p className="text-sm text-gray-500">{oggiStr}</p>
                    <h1 className="text-3xl font-bold">Buongiorno, {email} 👋</h1>
                </div>
            </div>
        
    );
}
