import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { inviaNotifica } from "./notificheUtils";

type NotificaTipo = {
    id: number;
    codice: string;
    descrizione: string;
};

type Utente = {
    id: string;
    nome: string;
    cognome: string;
};

type Progetto = {
    id: string;
    nome: string;
};

type Task = {
    id: string;
    nome: string;
};

type ProgettoTaskRel = {
    progetti_id: string;
    task_id: string;
};

export default function NotificheManualSender() {
    const [tipi, setTipi] = useState<NotificaTipo[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [progettoTaskRel, setProgettoTaskRel] = useState<ProgettoTaskRel[]>([]);

    const [tipoCodice, setTipoCodice] = useState("");
    const [destinatari, setDestinatari] = useState<string[]>([]);
    const [messaggio, setMessaggio] = useState("");
    const [progettoId, setProgettoId] = useState("");
    const [taskId, setTaskId] = useState("");
    const [status, setStatus] = useState("");

    const includeProgetto = tipoCodice.startsWith("PROGETTO_") || tipoCodice.startsWith("TASK_");
    const includeTask = tipoCodice.startsWith("TASK_");

    const filteredTasks = tasks.filter((t) =>
        progettoTaskRel.some((rel) => rel.progetti_id === progettoId && rel.task_id === t.id)
    );

    useEffect(() => {
        supabase.from("notifiche_tipi").select("*").then(({ data, error }) => {
            if (data) setTipi(data);
            if (error) console.error("Errore tipi notifiche:", error);
        });

        supabase.from("utenti").select("id, nome, cognome").then(({ data, error }) => {
            if (data) setUtenti(data);
            if (error) console.error("Errore utenti:", error);
        });

        supabase.from("progetti").select("id, nome").then(({ data, error }) => {
            if (data) setProgetti(data);
            if (error) console.error("Errore progetti:", error);
        });

        supabase.from("tasks").select("id, nome").then(({ data, error }) => {
            if (data) setTasks(data);
            if (error) console.error("Errore tasks:", error);
        });

        supabase.from("progetti_task").select("progetti_id, task_id").then(({ data, error }) => {
            if (data) setProgettoTaskRel(data);
            if (error) console.error("Errore relazioni progetti-task:", error);
        });
    }, []);

    const handleInvia = async () => {
        if (!tipoCodice || destinatari.length === 0 || !messaggio) {
            setStatus("⚠️ Inserisci tutti i campi obbligatori.");
            return;
        }

        try {
            await inviaNotifica(tipoCodice, destinatari, messaggio, undefined, {
                progetto_id: includeProgetto ? progettoId || undefined : undefined,
                task_id: includeTask ? taskId || undefined : undefined,
            });
            setStatus("✅ Notifica inviata!");
        } catch (err) {
            console.error(err);
            setStatus("❌ Errore durante l'invio.");
        }
    };

    return (
        <div className="p-4 max-w-xl mx-auto bg-white shadow rounded border mt-6">
            <h2 className="text-xl font-bold mb-4">📨 Invio Notifica Manuale</h2>

            <label className="block text-sm font-semibold mb-1">Tipo di Notifica</label>
            <select
                className="w-full border p-2 rounded mb-4"
                value={tipoCodice}
                onChange={(e) => {
                    setTipoCodice(e.target.value);
                    setProgettoId("");
                    setTaskId("");
                }}
            >
                <option value="">-- Seleziona --</option>
                {tipi.map((t) => (
                    <option key={t.codice} value={t.codice}>
                        {t.codice} – {t.descrizione}
                    </option>
                ))}
            </select>

            <label className="block text-sm font-semibold mb-1">Destinatari</label>
            <div className="flex gap-2 mb-2">
                <select
                    className="w-full border p-2 rounded"
                    value=""
                    onChange={(e) => {
                        const selectedId = e.target.value;
                        if (selectedId && !destinatari.includes(selectedId)) {
                            setDestinatari([...destinatari, selectedId]);
                        }
                    }}
                >
                    <option value="">-- Seleziona --</option>
                    {utenti
                        .filter((u) => !destinatari.includes(u.id))
                        .map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.nome} {u.cognome}
                            </option>
                        ))}
                </select>
            </div>

            {destinatari.length > 0 && (
                <ul className="mb-4 space-y-1">
                    {destinatari.map((id) => {
                        const utente = utenti.find((u) => u.id === id);
                        if (!utente) return null;
                        return (
                            <li key={id} className="flex justify-between items-center bg-gray-100 border rounded px-3 py-2">
                                <span className="text-sm">{utente.nome} {utente.cognome}</span>
                                <button
                                    onClick={() => setDestinatari(destinatari.filter((uid) => uid !== id))}
                                    className="text-red-500 text-xs hover:underline"
                                >
                                    ❌ Rimuovi
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <label className="block text-sm font-semibold mb-1">Messaggio</label>
            <textarea
                className="w-full border p-2 rounded mb-4"
                rows={3}
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
            />

            {includeProgetto && (
                <>
                    <label className="block text-sm font-semibold mb-1">Progetto</label>
                    <select
                        className="w-full border p-2 rounded mb-4"
                        value={progettoId}
                        onChange={(e) => {
                            setProgettoId(e.target.value);
                            setTaskId("");
                        }}
                    >
                        <option value="">-- Seleziona Progetto --</option>
                        {progetti.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.nome}
                            </option>
                        ))}
                    </select>
                </>
            )}

            {includeTask && progettoId && (
                <>
                    <label className="block text-sm font-semibold mb-1">Task</label>
                    <select
                        className="w-full border p-2 rounded mb-4"
                        value={taskId}
                        onChange={(e) => setTaskId(e.target.value)}
                    >
                        <option value="">-- Seleziona Task --</option>
                        {filteredTasks.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.nome}
                            </option>
                        ))}
                    </select>
                </>
            )}

            <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={handleInvia}
            >
                Invia Notifica
            </button>

            {status && <p className="mt-4 text-sm">{status}</p>}
        </div>
    );
}
