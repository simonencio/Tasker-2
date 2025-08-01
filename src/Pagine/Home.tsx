import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";

export default function Home() {
    const [nome, setNome] = useState<string | null>(null);
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
        const fetchUserInfo = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (!user || authError) {
                navigate("/login");
                return;
            }

            // ✅ Recupera `nome` e `email` dalla tabella `utenti`
            const { data } = await supabase
                .from("utenti")
                .select("nome, email")
                .eq("id", user.id)
                .maybeSingle();

            if (data) {
                setNome(data.nome ?? null);  // 👈 evita undefined
                setEmail(data.email ?? null);
            } else {
                setNome(null);
                setEmail(null);
            }

            setLoading(false);
        };

        fetchUserInfo();
    }, [navigate]);

    if (loading) return <div className="p-6"></div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-1">
                <p className="text-sm">{oggiStr}</p>
                <h1 className="text-3xl font-bold">
                    Buongiorno, {nome || email || "utente"} 👋
                </h1>
            </div>
        </div>
    );
}
