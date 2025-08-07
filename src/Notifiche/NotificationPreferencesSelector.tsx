import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faCheck } from "@fortawesome/free-solid-svg-icons";

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

    const [aperto, setAperto] = useState(false);
    const toggleAperto = () => setAperto(!aperto);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUtenteId(user.id);
        });
    }, []);

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
            preferenzeUtente?.forEach((p) => {
                mappaPreferenze[p.tipo_id] = p.invia_email;
            });

            setTipi(tipiNotifiche || []);
            setPreferenze(mappaPreferenze);
            setLoading(false);
        };

        fetchDati();
    }, [utenteId]);

    const handleToggle = (tipoId: number) => {
        setPreferenze((prev) => ({
            ...prev,
            [tipoId]: !prev[tipoId],
        }));
    };

    const handleSalva = async () => {
        if (!utenteId) return;

        for (const tipo of tipi) {
            const tipoId = tipo.id;
            const invia = preferenze[tipoId] ?? false;

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
                await supabase
                    .from("notifiche_preferenze")
                    .update({
                        invia_email: invia,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id);
            } else {
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

    if (loading) return <p className="text-theme">Caricamento preferenze...</p>;
    if (!utenteId) return <p className="text-theme">Effettua l’accesso per gestire le preferenze.</p>;

    return (
        <div className="modal-container max-w-xl mx-auto rounded-xl shadow p-4 space-y-4">
            <button
                onClick={toggleAperto}
                className="w-full flex justify-between items-center text-theme font-semibold text-xl focus:outline-none"
            >
                <span>Preferenze Notifiche Email</span>
                <FontAwesomeIcon icon={aperto ? faChevronUp : faChevronDown} className="text-lg" />
            </button>

            {aperto && (
                <>
                    <ul className="space-y-2">
                        {tipi.map((tipo) => (
                            <li key={tipo.id} className="flex items-center justify-between text-theme">
                                <span>{tipo.descrizione}</span>
                                <label className="checkbox-theme-wrapper">
                                    <input
                                        type="checkbox"
                                        checked={preferenze[tipo.id] ?? false}
                                        onChange={() => handleToggle(tipo.id)}
                                        className="checkbox-theme"
                                    />
                                    <FontAwesomeIcon icon={faCheck} className="checkbox-icon" />
                                </label>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={handleSalva}
                        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Salva Preferenze
                    </button>
                </>
            )}
        </div>
    );
}
