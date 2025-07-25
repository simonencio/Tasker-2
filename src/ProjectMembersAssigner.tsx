// src/components/ProjectMemberAssignment.tsx
import { useEffect, useState } from "react";
import { supabase } from "./supporto/supabaseClient";
import { inviaNotifica } from "./Notifiche/notificheUtils";

type Utente = {
    id: string;
    nome: string;
    cognome: string;
};

type Progetto = {
    id: string;
    nome: string;
};

export default function ProjectMemberAssignment({ creatore_id }: { creatore_id?: string }) {
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [utenteId, setUtenteId] = useState("");
    const [progettoId, setProgettoId] = useState("");

    useEffect(() => {
        // Carica utenti
        supabase
            .from("utenti")
            .select("id, nome, cognome")
            .then(({ data }) => {
                if (data) setUtenti(data);
            });

        // Carica progetti
        supabase
            .from("progetti")
            .select("id, nome")
            .then(({ data }) => {
                if (data) setProgetti(data);
            });
    }, []);

    const handleAssegna = async () => {
        if (!utenteId || !progettoId) return;

        // Inserisce relazione
        const { error } = await supabase
            .from("utenti_progetti")
            .insert({ progetto_id: progettoId, utente_id: utenteId });

        if (error) {
            console.error("Errore inserimento utenti_progetti:", error);
            return;
        }

        const nomeProgetto = progetti.find((p) => p.id === progettoId)?.nome || "(Progetto)";
        await inviaNotifica(
            "PROGETTO_ASSEGNATO",
            [utenteId],
            `Sei stato assegnato al progetto "${nomeProgetto}"`,
            creatore_id,
            { progetto_id: progettoId }
        );

        setUtenteId("");
        setProgettoId("");
    };

    return (
        <div className="p-4 border rounded shadow bg-white w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Assegna utente a progetto</h3>

            <label className="block mb-1 text-sm font-medium">Progetto</label>
            <select
                value={progettoId}
                onChange={(e) => setProgettoId(e.target.value)}
                className="border p-2 rounded w-full mb-3"
            >
                <option value="">-- Seleziona progetto --</option>
                {progetti.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.nome}
                    </option>
                ))}
            </select>

            <label className="block mb-1 text-sm font-medium">Utente</label>
            <select
                value={utenteId}
                onChange={(e) => setUtenteId(e.target.value)}
                className="border p-2 rounded w-full mb-4"
            >
                <option value="">-- Seleziona utente --</option>
                {utenti.map((u) => (
                    <option key={u.id} value={u.id}>
                        {u.nome} {u.cognome}
                    </option>
                ))}
            </select>

            <button
                onClick={handleAssegna}
                disabled={!utenteId || !progettoId}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
                Assegna
            </button>
        </div>
    );
}
