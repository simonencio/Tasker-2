import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faStop, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { Toast } from "toaster-js";
import RenderSottoTask from "../supporto/SottoTask";
import RenderCommento from "../supporto/RenderCommento";

// Tipi locali per evitare errori
type Assegnatario = {
    id: string;
    nome: string;
    cognome?: string | null;
};

type Stato = {
    id: number;
    nome: string;
    colore?: string | null;
};

type Priorita = {
    id: number;
    nome: string;
};

type Progetto = {
    id: string;
    nome: string;
};

type Task = {
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    fine_task?: string | null;
    created_at: string;
    modified_at: string;
    parent_id?: string | null;
    stato?: Stato | null;
    priorita?: Priorita | null;
    progetto?: Progetto | null;
    assegnatari: Assegnatario[];
};

type Commento = {
    id: string;
    utente_id: string;
    task_id: string;
    parent_id: string | null;
    descrizione: string;
    created_at: string;
    modified_at: string;
    deleted_at?: string | null;
    utente: {
        id: string;
        nome: string;
        cognome: string | null;
    };
};

export default function DettaglioTask() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [commenti, setCommenti] = useState<Commento[]>([]);
    const [sottoTasks, setSottoTasks] = useState<Task[]>([]);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
    const [, setElapsed] = useState<number>(0);
    const [durate, setDurate] = useState<Record<string, number>>({});
    const [commentiEspansi, setCommentiEspansi] = useState(false);
    const [sottoTaskEspansi, setSottoTaskEspansi] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getSession();
            setUtenteId(data.session?.user.id || null);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (!id) return;
        const caricaTask = async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select(`
                    id, nome, note, consegna, tempo_stimato, fine_task, created_at, modified_at, parent_id,
                    stato:stato_id ( id, nome, colore ),
                    priorita:priorita_id ( id, nome ),
                    progetti_task ( progetti ( id, nome ) ),
                    utenti_task ( utenti ( id, nome, cognome ) )
                `)
                .eq("id", id)
                .single();

            if (error || !data) return;

            const assegnatari = data.utenti_task.map((u: any) => u.utenti);

            const statoPulito = Array.isArray(data.stato) ? data.stato[0] : data.stato;
            const prioritaPulita = Array.isArray(data.priorita) ? data.priorita[0] : data.priorita;
            const progettoPulito = Array.isArray(data.progetti_task?.[0]?.progetti)
                ? data.progetti_task?.[0]?.progetti[0]
                : data.progetti_task?.[0]?.progetti ?? null;

            setTask({
                id: data.id,
                nome: data.nome,
                note: data.note,
                consegna: data.consegna,
                tempo_stimato: data.tempo_stimato,
                fine_task: data.fine_task,
                created_at: data.created_at,
                modified_at: data.modified_at,
                parent_id: data.parent_id,
                stato: statoPulito,
                priorita: prioritaPulita,
                progetto: progettoPulito,
                assegnatari,
            });


        };
        caricaTask();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        const caricaSottoTask = async () => {
            const { data } = await supabase
                .from("tasks")
                .select("*")
                .eq("parent_id", id);
            setSottoTasks(data || []);
        };
        caricaSottoTask();
    }, [id]);

    useEffect(() => {
        const caricaCommenti = async () => {
            const { data } = await supabase
                .from("commenti")
                .select(`
                    id, utente_id, task_id, parent_id, descrizione, created_at, modified_at, deleted_at,
                    utente:utente_id ( id, nome, cognome )
                `)
                .eq("task_id", id)
                .is("deleted_at", null);
            if (data) {
                const formattati = data.map((c: any) => ({
                    ...c,
                    utente: Array.isArray(c.utente) ? c.utente[0] : c.utente,
                }));
                setCommenti(formattati);
            }
        };
        caricaCommenti();
    }, [id]);

    useEffect(() => {
        if (!task) return;
        const caricaDurate = async () => {
            const ids = [task.id, ...sottoTasks.map(t => t.id)];
            const { data } = await supabase
                .from("time_entries")
                .select("utente_id, durata")
                .in("task_id", ids);

            const mappa: Record<string, number> = {};
            for (const r of data || []) {
                if (!r.utente_id || !r.durata) continue;
                mappa[r.utente_id] = (mappa[r.utente_id] || 0) + r.durata;
            }
            setDurate(mappa);
        };
        caricaDurate();
    }, [task, sottoTasks]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeTimer) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [activeTimer]);

    const handleStartTimer = () => {
        if (!task) return;
        setActiveTimer({ taskId: task.id, startTime: new Date() });
    };

    const handleStopTimer = async () => {
        if (!task || !utenteId || !activeTimer) return;

        const fine = new Date();
        const durata = Math.floor((fine.getTime() - activeTimer.startTime.getTime()) / 1000);

        const { error } = await supabase.from("time_entries").insert({
            utente_id: utenteId,
            progetto_id: task.progetto?.id,
            task_id: task.id,
            nome: task.nome,
            data_inizio: activeTimer.startTime.toISOString(),
            data_fine: fine.toISOString(),
            durata,
        });

        if (error) new Toast("Errore nel salvataggio", Toast.TYPE_ERROR);
        else new Toast("Tempo salvato", Toast.TYPE_DONE);

        setActiveTimer(null);
    };

    if (!task) return <div className="p-6 text-theme">Caricamento task...</div>;

    const durataUtente = (utenteId: string) => {
        const tot = durate[utenteId] || 0;
        const h = Math.floor(tot / 3600);
        const m = Math.floor((tot % 3600) / 60);
        return `${h > 0 ? `${h}h ` : ""}${m}m`;
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-4 text-theme">
            <h1 className="text-2xl font-bold">{task.nome}</h1>

            {task.fine_task && (
                <p className="flex items-center gap-2 text-green-600">
                    <FontAwesomeIcon icon={faCheckCircle} /> Completata
                </p>
            )}

            {task.consegna && <p>📅 Consegna: {new Date(task.consegna).toLocaleDateString()}</p>}
            {task.tempo_stimato && <p>⏱️ Tempo stimato: {task.tempo_stimato}</p>}
            {task.stato?.nome && <p>📊 Stato: {task.stato.nome}</p>}
            {task.priorita?.nome && <p>⏫ Priorità: {task.priorita.nome}</p>}
            {task.note && <p>🗒️ Note: {task.note}</p>}

            {task.assegnatari.length > 0 && (
                <div>
                    <p>👥 Assegnata a:</p>
                    <ul className="list-disc ml-6">
                        {task.assegnatari.map(u => (
                            <li key={u.id}>
                                {u.nome} {u.cognome || ""} – {durataUtente(u.id)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {task.assegnatari.length > 0 && (
                <button
                    onClick={activeTimer ? handleStopTimer : handleStartTimer}
                    className={`px-4 py-2 rounded text-white ${activeTimer ? "bg-red-600" : "bg-green-600"}`}
                >
                    <FontAwesomeIcon icon={activeTimer ? faStop : faPlay} className="mr-2" />
                    {activeTimer ? "Ferma timer" : "Avvia timer"}
                </button>
            )}

            {sottoTasks.length > 0 && (
                <div>
                    <p
                        onClick={() => setSottoTaskEspansi(e => !e)}
                        className="cursor-pointer font-semibold hover:underline"
                    >
                        📎 Sotto-task
                    </p>
                    {sottoTaskEspansi && (
                        <div className="mt-2 space-y-2">
                            {sottoTasks.map(st => (
                                <RenderSottoTask key={st.id} task={st} allTasks={sottoTasks} livello={1} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {commenti.length > 0 && (
                <div>
                    <p
                        onClick={() => setCommentiEspansi(e => !e)}
                        className="cursor-pointer font-semibold hover:underline"
                    >
                        💬 Commenti
                    </p>
                    {commentiEspansi && (
                        <div className="mt-2 space-y-2">
                            {commenti.filter(c => !c.parent_id).map(c => (
                                <RenderCommento key={c.id} commento={c} allCommenti={commenti} livello={1} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
