import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";

type NotificaTipo = {
    id: number;
    codice: string;
    descrizione: string;
};

export default function NotificationPreferencesSelector() {
    const [tipi, setTipi] = useState<NotificaTipo[]>([]);
    const [preferenze, setPreferenze] = useState<Record<number, boolean>>({});
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Recupera utente loggato
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUtenteId(user.id);
        });
    }, []);

    // Carica tipi + preferenze
    useEffect(() => {
        if (!utenteId) return;

        const fetchDati = async () => {
            setLoading(true);

            const { data: tipiNotifiche } = await supabase
                .from("notifiche_tipi")
                .select("id, codice, descrizione")
                .eq("attiva", true);

            const { data: preferenzeUtente } = await supabase
                .from("notifiche_preferenze")
                .select("id, tipo_id, invia_email")
                .eq("utente_id", utenteId);

            const mappaPreferenze: Record<number, boolean> = {};
            preferenzeUtente?.forEach(p => {
                mappaPreferenze[p.tipo_id] = p.invia_email;
            });

            setTipi(tipiNotifiche || []);
            setPreferenze(mappaPreferenze);
            setLoading(false);
        };

        fetchDati();
    }, [utenteId]);

    const handleToggle = (tipoId: number) => {
        setPreferenze(prev => ({
            ...prev,
            [tipoId]: !prev[tipoId]
        }));
    };

    const handleSalva = async () => {
        if (!utenteId) return;

        for (const tipo of tipi) {
            const tipoId = tipo.id;
            const invia = preferenze[tipoId] ?? false;

            // Verifica se esiste già una preferenza per questo utente e tipo
            const { data: existing, error } = await supabase
                .from("notifiche_preferenze")
                .select("id")
                .eq("utente_id", utenteId)
                .eq("tipo_id", tipoId)
                .maybeSingle();
            if (error) {
                console.error(`Errore durante il recupero preferenza tipo ${tipoId}:`, error.message);
            }
            if (existing?.id) {
                // Fai UPDATE
                await supabase
                    .from("notifiche_preferenze")
                    .update({
                        invia_email: invia,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id);
            } else {
                // Fai INSERT
                await supabase
                    .from("notifiche_preferenze")
                    .insert({
                        utente_id: utenteId,
                        tipo_id: tipoId,
                        invia_email: invia,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
            }
        }

        alert("Preferenze salvate ✅");
    };

    if (loading) return <p>Caricamento preferenze...</p>;
    if (!utenteId) return <p>Effettua l’accesso per gestire le preferenze.</p>;

    return (
        <div className="p-4 max-w-xl mx-auto bg-white rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold">Preferenze Notifiche Email</h2>
            <ul className="space-y-2">
                {tipi.map(tipo => (
                    <li key={tipo.id} className="flex items-center justify-between">
                        <span>{tipo.descrizione}</span>
                        <input
                            type="checkbox"
                            checked={preferenze[tipo.id] ?? false}
                            onChange={() => handleToggle(tipo.id)}
                            className="w-5 h-5"
                        />
                    </li>
                ))}
            </ul>
            <button
                onClick={handleSalva}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Salva Preferenze
            </button>
        </div>
    );
}
