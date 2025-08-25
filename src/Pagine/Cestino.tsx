// src/Pagine/Cestino.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faTasks,
    faProjectDiagram,
    faUser,
    faBuilding,
    faFlag,
    faExclamationTriangle,
    faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import ListaGenerica from "../Liste/ListaGenerica";

// Tipi locali
type Task = any;
type Progetto = any;
type Utente = any;
type Cliente = any;
type Stato = { id: number; nome: string; colore?: string | null; deleted_at: string | null };
type Priorita = { id: number; nome: string; colore?: string | null; deleted_at: string | null };
type Ruolo = { id: number; nome: string; deleted_at: string | null };

export default function Cestino() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [loadingProgetti, setLoadingProgetti] = useState(true);

    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [loadingUtenti, setLoadingUtenti] = useState(true);

    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [loadingClienti, setLoadingClienti] = useState(true);

    const [stati, setStati] = useState<Stato[]>([]);
    const [loadingStati, setLoadingStati] = useState(true);

    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [loadingPriorita, setLoadingPriorita] = useState(true);

    const [ruoli, setRuoli] = useState<Ruolo[]>([]);
    const [loadingRuoli, setLoadingRuoli] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Tasks
            try {
                const { data } = await supabase
                    .from("tasks")
                    .select(`
                        id, nome, note, consegna, tempo_stimato, fine_task, deleted_at,
                        stato:stato_id ( id, nome, colore ),
                        priorita:priorita_id ( id, nome ),
                        progetti_task ( progetti ( id, nome ) ),
                        utenti_task ( utenti ( id, nome, cognome ) )
                    `)
                    .not("deleted_at", "is", null);
                setTasks(data || []);
            } finally {
                setLoadingTasks(false);
            }

            // Progetti
            try {
                const { data } = await supabase
                    .from("progetti")
                    .select(`
                        id, nome, consegna, note, tempo_stimato, deleted_at,
                        stato:stato_id ( id, nome, colore ),
                        priorita:priorita_id ( id, nome ),
                        cliente:cliente_id ( id, nome ),
                        utenti_progetti ( utenti ( id, nome, cognome ) )
                    `)
                    .not("deleted_at", "is", null);
                setProgetti(data || []);
            } finally {
                setLoadingProgetti(false);
            }

            // Utenti
            try {
                const { data } = await supabase
                    .from("utenti")
                    .select(`
                        id, nome, cognome, email, avatar_url, deleted_at,
                        ruolo:ruoli(id, nome),
                        progetti:utenti_progetti(progetti(id, nome, slug, deleted_at))
                    `)
                    .not("deleted_at", "is", null);
                setUtenti(
                    (data || []).map((u: any) => ({
                        ...u,
                        progetti: (u.progetti || [])
                            .map((up: any) => up.progetti)
                            .filter((p: any) => p && !p.deleted_at),
                    }))
                );
            } finally {
                setLoadingUtenti(false);
            }

            // Clienti
            try {
                const { data } = await supabase
                    .from("clienti")
                    .select(`
                        id, nome, email, telefono, avatar_url, note, deleted_at,
                        progetti:progetti ( id, nome, slug, deleted_at )
                    `)
                    .not("deleted_at", "is", null);
                setClienti(
                    (data || []).map((c: any) => ({
                        ...c,
                        progetti: (c.progetti || []).filter((p: any) => !p.deleted_at),
                    }))
                );
            } finally {
                setLoadingClienti(false);
            }

            // Stati
            try {
                const { data } = await supabase
                    .from("stati")
                    .select("id, nome, colore, deleted_at")
                    .not("deleted_at", "is", null);
                setStati(data || []);
            } finally {
                setLoadingStati(false);
            }

            // Priorità
            try {
                const { data } = await supabase
                    .from("priorita")
                    .select("id, nome, colore, deleted_at")
                    .not("deleted_at", "is", null);
                setPriorita(data || []);
            } finally {
                setLoadingPriorita(false);
            }

            // Ruoli
            try {
                const { data } = await supabase
                    .from("ruoli")
                    .select("id, nome, deleted_at")
                    .not("deleted_at", "is", null);
                setRuoli(data || []);
            } finally {
                setLoadingRuoli(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-8">
            {/* Tasks */}
            <ListaGenerica<Task>
                titolo={`Cestino – Tasks (${tasks.length})`}
                icona={faTasks}
                coloreIcona="text-red-600"
                tipo="tasks"
                dati={tasks}
                loading={loadingTasks}
                colonne={[
                    {
                        chiave: "nome",
                        label: "Nome",
                        className: "text-left w-full align-middle",
                        render: (t) => (
                            <div className="flex items-center gap-2">
                                {t.fine_task && <span className="text-green-600">✔</span>}
                                <span>{t.nome}</span>
                            </div>
                        ),
                    },
                    {
                        chiave: "consegna",
                        label: "Consegna",
                        className: "w-40 hidden lg:table-cell text-center",
                        render: (t) => (t.consegna ? new Date(t.consegna).toLocaleDateString() : "—"),
                    },
                    {
                        chiave: "stato",
                        label: "Stato",
                        className: "w-32 hidden lg:table-cell text-center",
                        render: (t) => t.stato?.nome ?? "—",
                    },
                    {
                        chiave: "priorita",
                        label: "Priorità",
                        className: "w-32 hidden lg:table-cell text-center",
                        render: (t) => t.priorita?.nome ?? "—",
                    },
                ]}
                renderDettaglio={(t) => (
                    <div className="space-y-1">
                        {t.progetti_task?.[0]?.progetti?.nome && (
                            <p>📁 Progetto: {t.progetti_task[0].progetti.nome}</p>
                        )}
                        {t.utenti_task?.length > 0 && (
                            <p>
                                👥 Assegnata a:{" "}
                                {t.utenti_task
                                    .map((u: any) => `${u.utenti.nome} ${u.utenti.cognome}`)
                                    .join(", ")}
                            </p>
                        )}
                        {t.tempo_stimato && <p>⏱️ Stima: {t.tempo_stimato}</p>}
                        {t.note && <p>🗒️ {t.note}</p>}
                    </div>
                )}
                modalitaCestino
            />

            {/* Progetti */}
            <ListaGenerica<Progetto>
                titolo={`Cestino – Progetti (${progetti.length})`}
                icona={faProjectDiagram}
                coloreIcona="text-purple-600"
                tipo="progetti"
                dati={progetti}
                loading={loadingProgetti}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "text-left w-full align-middle" },
                    {
                        chiave: "consegna",
                        label: "Consegna",
                        className: "w-40 hidden lg:table-cell text-center",
                        render: (p) => (p.consegna ? new Date(p.consegna).toLocaleDateString() : "—"),
                    },
                    {
                        chiave: "stato",
                        label: "Stato",
                        className: "w-32 hidden lg:table-cell text-center",
                        render: (p) => p.stato?.nome ?? "—",
                    },
                    {
                        chiave: "priorita",
                        label: "Priorità",
                        className: "w-32 hidden lg:table-cell text-center",
                        render: (p) => p.priorita?.nome ?? "—",
                    },
                ]}
                renderDettaglio={(p) => (
                    <div className="space-y-1">
                        {p.cliente?.nome && <p>👤 Cliente: {p.cliente.nome}</p>}
                        {p.utenti_progetti?.length > 0 && (
                            <p>
                                👥 Membri:{" "}
                                {p.utenti_progetti
                                    .map((up: any) => `${up.utenti.nome} ${up.utenti.cognome}`)
                                    .join(", ")}
                            </p>
                        )}
                        {p.tempo_stimato && <p>⏱️ Stima: {p.tempo_stimato}</p>}
                        {p.note && <p>🗒️ {p.note}</p>}
                    </div>
                )}
                modalitaCestino
            />

            {/* Utenti */}
            <ListaGenerica<Utente>
                titolo={`Cestino – Utenti (${utenti.length})`}
                icona={faUser}
                coloreIcona="text-blue-600"
                tipo="utenti"
                dati={utenti}
                loading={loadingUtenti}
                colonne={[
                    {
                        chiave: "nomeCompleto",
                        label: "Nome",
                        className: "text-left w-full align-middle",
                        render: (u) => `${u.nome} ${u.cognome}`,
                    },
                    {
                        chiave: "email",
                        label: "Email",
                        className: "hidden lg:table-cell text-center",
                        render: (u) => u.email ?? "—",
                    },
                    {
                        chiave: "ruolo",
                        label: "Ruolo",
                        className: "hidden lg:table-cell text-center",
                        render: (u) => u.ruolo?.nome ?? "—",
                    },
                ]}
                renderDettaglio={(u) => (
                    <div>
                        <p>Email: {u.email}</p>
                        <p>Ruolo: {u.ruolo?.nome}</p>
                        {u.progetti?.length > 0 && (
                            <p>📁 Progetti: {u.progetti.map((p: any) => p.nome).join(", ")}</p>
                        )}
                    </div>
                )}
                modalitaCestino
            />

            {/* Clienti */}
            <ListaGenerica<Cliente>
                titolo={`Cestino – Clienti (${clienti.length})`}
                icona={faBuilding}
                coloreIcona="text-green-600"
                tipo="clienti"
                dati={clienti}
                loading={loadingClienti}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "text-left w-full align-middle" },
                    {
                        chiave: "email",
                        label: "Email",
                        className: "hidden lg:table-cell text-center",
                        render: (c) => c.email ?? "—",
                    },
                    {
                        chiave: "telefono",
                        label: "Telefono",
                        className: "hidden lg:table-cell text-center",
                        render: (c) => c.telefono ?? "—",
                    },
                ]}
                renderDettaglio={(c) => (
                    <div>
                        {c.email && <p>📧 {c.email}</p>}
                        {c.telefono && <p>📞 {c.telefono}</p>}
                        {c.note && <p>🗒️ {c.note}</p>}
                        {c.progetti?.length > 0 && (
                            <p>📁 Progetti: {c.progetti.map((p: any) => p.nome).join(", ")}</p>
                        )}
                    </div>
                )}
                modalitaCestino
            />

            {/* Stati */}
            <ListaGenerica<Stato>
                titolo={`Cestino – Stati (${stati.length})`}
                icona={faFlag}
                coloreIcona="text-green-500"
                tipo="stati"
                dati={stati}
                loading={loadingStati}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "text-left w-full align-middle" },
                    {
                        chiave: "colore",
                        label: "Colore",
                        className: "hidden lg:table-cell text-center",
                        render: (s) =>
                            s.colore ? (
                                <span
                                    className="inline-block w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: s.colore }}
                                />
                            ) : (
                                "—"
                            ),
                    },
                ]}
                modalitaCestino
            />

            {/* Priorità */}
            <ListaGenerica<Priorita>
                titolo={`Cestino – Priorità (${priorita.length})`}
                icona={faExclamationTriangle}
                coloreIcona="text-yellow-600"
                tipo="priorita"
                dati={priorita}
                loading={loadingPriorita}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "text-left w-full align-middle" },
                    {
                        chiave: "colore",
                        label: "Colore",
                        className: "hidden lg:table-cell text-center",
                        render: (p) =>
                            p.colore ? (
                                <span
                                    className="inline-block w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: p.colore }}
                                />
                            ) : (
                                "—"
                            ),
                    },
                ]}
                modalitaCestino
            />

            {/* Ruoli */}
            <ListaGenerica<Ruolo>
                titolo={`Cestino – Ruoli (${ruoli.length})`}
                icona={faUserShield}
                coloreIcona="text-indigo-600"
                tipo="ruoli"
                dati={ruoli}
                loading={loadingRuoli}
                colonne={[{ chiave: "nome", label: "Nome", className: "text-left w-full align-middle" }]}
                modalitaCestino
            />
        </div>
    );
}
