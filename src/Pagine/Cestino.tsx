// src/components/Cestino.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

type Props = {
    tipo: "tasks" | "progetti" | "utenti" | "clienti" | "stati" | "priorita" | "ruoli"; // 👈 aggiunti
};

type Task = { id: string; nome: string; deleted_at: string | null };
type Progetto = { id: string; nome: string; deleted_at: string | null; tasks?: Task[] };
type Utente = { id: string; nome: string; cognome?: string; deleted_at: string | null };
type Cliente = { id: string; nome: string; deleted_at: string | null };
type Stato = { id: number; nome: string; colore?: string | null; deleted_at: string | null };
type Priorita = { id: number; nome: string; deleted_at: string | null };
type Ruolo = { id: number; nome: string; deleted_at: string | null };

export default function Cestino({ tipo }: Props) {
    const [loading, setLoading] = useState(false);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [ruoli, setRuoli] = useState<Ruolo[]>([]);

    useEffect(() => {
        setLoading(true);

        const fetchData = async () => {
            if (tipo === "tasks") {
                const { data, error } = await supabase
                    .from("tasks")
                    .select("id, nome, deleted_at")
                    .not("deleted_at", "is", null);
                if (!error && data) setTasks(data);
            }

            if (tipo === "progetti") {
                const { data, error } = await supabase
                    .from("progetti")
                    .select(
                        `id, nome, deleted_at,
                         tasks:progetti_task(task_id, tasks(id, nome, deleted_at))`
                    )
                    .not("deleted_at", "is", null);
                if (!error && data) {
                    const mapped = data.map((p: any) => ({
                        id: p.id,
                        nome: p.nome,
                        deleted_at: p.deleted_at,
                        tasks: (p.tasks || [])
                            .map((t: any) => t.tasks)
                            .filter((t: Task) => t.deleted_at !== null),
                    }));
                    setProgetti(mapped);
                }
            }

            if (tipo === "utenti") {
                const { data, error } = await supabase
                    .from("utenti")
                    .select("id, nome, cognome, deleted_at")
                    .not("deleted_at", "is", null);
                if (!error && data) setUtenti(data);
            }

            if (tipo === "clienti") {
                const { data, error } = await supabase
                    .from("clienti")
                    .select("id, nome, deleted_at")
                    .not("deleted_at", "is", null);
                if (!error && data) setClienti(data);
            }

            if (tipo === "stati") {
                const { data, error } = await supabase
                    .from("stati")
                    .select("id, nome, colore, deleted_at")
                    .not("deleted_at", "is", null);
                if (!error && data) setStati(data);
            }

            if (tipo === "priorita") {
                const { data, error } = await supabase
                    .from("priorita")
                    .select("id, nome, deleted_at")
                    .not("deleted_at", "is", null);
                if (!error && data) setPriorita(data);
            }

            if (tipo === "ruoli") {
                const { data, error } = await supabase
                    .from("ruoli")
                    .select("id, nome, deleted_at")
                    .not("deleted_at", "is", null);
                if (!error && data) setRuoli(data);
            }

            setLoading(false);
        };

        fetchData();
    }, [tipo]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center">
                <FontAwesomeIcon icon={faTrash} className="mr-2 text-red-600" />
                Cestino – {tipo}
            </h1>

            {loading && <p>Caricamento...</p>}

            {/* TASKS */}
            {!loading && tipo === "tasks" && (
                <ul className="space-y-2">
                    {tasks.map((t) => (
                        <li key={t.id} className="p-2 border rounded">{t.nome}</li>
                    ))}
                </ul>
            )}

            {/* PROGETTI */}
            {!loading && tipo === "progetti" && (
                <ul className="space-y-4">
                    {progetti.map((p) => (
                        <li key={p.id} className="p-3 border rounded">
                            <p className="font-semibold">{p.nome}</p>
                            {p.tasks && p.tasks.length > 0 && (
                                <ul className="ml-4 mt-2 list-disc">
                                    {p.tasks.map((t) => (
                                        <li key={t.id}>{t.nome}</li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* UTENTI */}
            {!loading && tipo === "utenti" && (
                <ul className="space-y-2">
                    {utenti.map((u) => (
                        <li key={u.id} className="p-2 border rounded">
                            {u.nome} {u.cognome}
                        </li>
                    ))}
                </ul>
            )}

            {/* CLIENTI */}
            {!loading && tipo === "clienti" && (
                <ul className="space-y-2">
                    {clienti.map((c) => (
                        <li key={c.id} className="p-2 border rounded">{c.nome}</li>
                    ))}
                </ul>
            )}

            {/* STATI */}
            {!loading && tipo === "stati" && (
                <ul className="space-y-2">
                    {stati.map((s) => (
                        <li key={s.id} className="p-2 border rounded flex items-center gap-3">
                            <span>{s.nome}</span>
                            {s.colore && (
                                <span
                                    className="inline-block w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: s.colore }}
                                ></span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* PRIORITA */}
            {!loading && tipo === "priorita" && (
                <ul className="space-y-2">
                    {priorita.map((p) => (
                        <li key={p.id} className="p-2 border rounded">{p.nome}</li>
                    ))}
                </ul>
            )}

            {/* RUOLI */}
            {!loading && tipo === "ruoli" && (
                <ul className="space-y-2">
                    {ruoli.map((r) => (
                        <li key={r.id} className="p-2 border rounded">{r.nome}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
