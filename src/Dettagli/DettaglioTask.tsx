// src/Dettagli/DettaglioTask.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsers,
    faPen,
    faCommentDots,
    faPlay,
    faStop,
    faTrash,
    faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

import {
    Chip,
    StatoBadge,
    AvatarChip,
    Section,
    MetaField,
} from "../supporto/ui";
import type { Task, Utente } from "../supporto/tipi";

import GenericEditorModal from "../Modifica/GenericEditorModal";
import ChatCommentiModal from "../GestioneTask/ChatCommentiModal";

import ListaDinamica from "../Liste/ListaDinamica";
import { Toast } from "toaster-js";

// Config delle sotto-task
import { tasksSubConfig } from "../Liste/config/tasksSubConfig";

/* ============================== Utils ============================== */
function formatDurata(value?: number | string | null): string {
    if (!value && value !== 0) return "—";
    if (typeof value === "number") {
        const h = Math.floor(value / 3600);
        const m = Math.floor((value % 3600) / 60);
        const s = value % 60;
        if (h > 0 && s > 0) return `${h}h ${m}m ${s}s`;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0 && s > 0) return `${m}m ${s}s`;
        if (m > 0) return `${m}m`;
        return `${s}s`;
    }
    return "—";
}

function uniqById<T extends { id?: string }>(arr: T[]): T[] {
    const map = new Map<string, T>();
    for (const x of arr) {
        const id = x?.id as string | undefined;
        if (!id) continue;
        if (!map.has(id)) map.set(id, x);
    }
    return Array.from(map.values());
}

/* ============================== Componente ============================== */
export default function DettaglioTask() {
    const { slug } = useParams<{ slug: string }>();

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [modaleAperta, setModaleAperta] = useState(false);
    const [commentiAperti, setCommentiAperti] = useState(false);

    const [totaleTaskSec, setTotaleTaskSec] = useState(0);
    const [utentiProgetto, setUtentiProgetto] = useState<Utente[]>([]);

    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [activeTimer, setActiveTimer] =
        useState<{ taskId: string; startTime: Date } | null>(null);

    /* ------------------------ Sessione ------------------------ */
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            setUtenteId(data.session?.user.id || null);
        })();
    }, []);

    /* ------------------------ Fetch task ------------------------ */
    const fetchTask = useCallback(async () => {
        if (!slug) return;

        const { data, error } = await supabase
            .from("tasks")
            .select(`
                id, nome, slug, note, consegna, tempo_stimato, fine_task,
                stato:stato_id(id, nome, colore),
                priorita:priorita_id(id, nome),
                parent_id,
                progetti_task(progetti(id, nome, slug)),
                utenti_task(utenti(id, nome, cognome, avatar_url))
            `)
            .eq("slug", slug)
            .single();

        if (error || !data) {
            setLoading(false);
            return;
        }

        const progetto = Array.isArray(data.progetti_task?.[0]?.progetti)
            ? data.progetti_task?.[0]?.progetti[0]
            : data.progetti_task?.[0]?.progetti ?? null;

        const assegnatariRaw = (data.utenti_task || [])
            .map((r: any) => r?.utenti)
            .filter(Boolean);

        const taskPulita: Task = {
            id: data.id,
            nome: data.nome,
            slug: data.slug,
            note: data.note,
            consegna: data.consegna,
            tempo_stimato: data.tempo_stimato,
            fine_task: data.fine_task,
            stato: Array.isArray(data.stato) ? data.stato[0] : data.stato,
            priorita: Array.isArray(data.priorita) ? data.priorita[0] : data.priorita,
            progetto,
            parent_id: data.parent_id,
            assegnatari: uniqById(assegnatariRaw),
        };

        setTask(taskPulita);
        setLoading(false);

        if (progetto?.id) {
            const { data: membri } = await supabase
                .from("utenti_progetti")
                .select("utenti(id, nome, cognome, avatar_url)")
                .eq("progetto_id", progetto.id);

            setUtentiProgetto(
                uniqById((membri || []).map((r: any) => r.utenti).filter(Boolean))
            );
        }

        if (data.id) {
            const { data: durate } = await supabase
                .from("time_entries")
                .select("durata")
                .eq("task_id", data.id);

            const totale = (durate || []).reduce(
                (acc, r) => acc + (r.durata || 0),
                0
            );
            setTotaleTaskSec(totale);
        }
    }, [slug]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    /* ------------------------ Timer ------------------------ */
    const handleStartTimer = (t: Task) => {
        if (activeTimer) {
            handleStopTimer(t, activeTimer);
        }
        setActiveTimer({ taskId: t.id, startTime: new Date() });
    };

    const handleStopTimer = async (
        t: Task,
        timerData: { taskId: string; startTime: Date }
    ) => {
        if (!utenteId || !t) return;

        const fine = new Date();
        const durata = Math.floor(
            (fine.getTime() - timerData.startTime.getTime()) / 1000
        );

        const progettoId = t.progetto?.id;
        if (!progettoId) {
            new Toast(
                "Questa task non è collegata a nessun progetto",
                Toast.TYPE_ERROR,
                Toast.TIME_SHORT
            );
            return;
        }

        const { error } = await supabase.from("time_entries").insert({
            utente_id: utenteId,
            progetto_id: progettoId,
            task_id: t.id,
            nome: t.nome,
            data_inizio: timerData.startTime.toISOString(),
            data_fine: fine.toISOString(),
            durata,
        });

        new Toast(
            error ? "Errore nel salvataggio" : "Tempo salvato",
            error ? Toast.TYPE_ERROR : Toast.TYPE_DONE
        );

        setActiveTimer(null);
        fetchTask(); // 👈 aggiorna subito il dettaglio dopo stop timer
    };

    /* ------------------------ Render ------------------------ */
    if (loading) return <div className="p-6 text-theme">Caricamento task...</div>;
    if (!task) return <div className="p-6 text-theme">Task non trovata</div>;

    const completata = !!task.fine_task;

    return (
        <div className="min-h-screen bg-theme text-theme">
            <div className="p-6 max-w-6xl mx-auto w-full">
                {/* Titolo */}
                <h1 className="text-2xl font-bold mb-4 text-theme flex flex-row items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-row items-center gap-2">
                        {completata && (
                            <FontAwesomeIcon
                                icon={faCheckCircle}
                                className="text-green-600 w-5 h-5"
                            />
                        )}
                        {task.nome}
                        <button
                            onClick={() => setModaleAperta(true)}
                            className="text-yellow-500 hover:text-yellow-600 transition"
                        >
                            <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                        </button>
                    </div>
                </h1>

                {/* Metacard task */}
                <div className="rounded-xl border border-theme/20 card-theme p-5 text-[15px] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MetaField label="Progetto">
                            <Chip>{task.progetto?.nome ?? "—"}</Chip>
                        </MetaField>
                        <MetaField label="Consegna">
                            <Chip>
                                {task.consegna
                                    ? new Date(task.consegna).toLocaleDateString()
                                    : "—"}
                            </Chip>
                        </MetaField>
                        <MetaField label="Stato">
                            <StatoBadge
                                nome={task.stato?.nome}
                                colore={task.stato?.colore as any}
                            />
                        </MetaField>
                        <MetaField label="Priorità">
                            <Chip>{task.priorita?.nome ?? "—"}</Chip>
                        </MetaField>
                        <MetaField label="Tempo stimato">
                            <Chip>{formatDurata(task.tempo_stimato)}</Chip>
                        </MetaField>
                        <MetaField label="Tempo registrato">
                            <Chip>{formatDurata(totaleTaskSec)}</Chip>
                        </MetaField>
                    </div>

                    {task.assegnatari.length > 0 && (
                        <Section icon={faUsers} title="Assegnatari">
                            <div className="flex flex-wrap gap-2 gap-y-3">
                                {uniqById(task.assegnatari).map((u) => (
                                    <AvatarChip key={u.id} utente={u} />
                                ))}
                            </div>
                        </Section>
                    )}

                    {task.note && (
                        <Section title="Note">
                            <div className="leading-relaxed">{task.note}</div>
                        </Section>
                    )}

                    {/* Azioni */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={() => setModaleAperta(true)}
                            className="px-3 py-2 rounded-xl card-theme hover-bg-theme text-[15px] flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faPen} /> Modifica
                        </button>
                        <button
                            onClick={() =>
                                activeTimer?.taskId === task.id
                                    ? handleStopTimer(task, activeTimer)
                                    : handleStartTimer(task)
                            }
                            className={`px-3 py-2 rounded-xl text-[15px] flex items-center gap-2 ${activeTimer?.taskId === task.id
                                ? "bg-red-600 text-white hover:bg-red-500"
                                : "bg-green-600 text-white hover:bg-green-500"
                                }`}
                        >
                            <FontAwesomeIcon
                                icon={activeTimer?.taskId === task.id ? faStop : faPlay}
                            />
                            {activeTimer?.taskId === task.id ? "Ferma Timer" : "Avvia Timer"}
                        </button>
                        <button
                            onClick={() => setCommentiAperti(true)}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-[15px] flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faCommentDots} /> Commenti
                        </button>
                        <button
                            className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 text-[15px] flex items-center gap-2 cursor-not-allowed"
                            title="Elimina (non implementato)"
                        >
                            <FontAwesomeIcon icon={faTrash} /> Elimina
                        </button>
                    </div>
                </div>

                {/* Lista dinamica sotto-task */}
                <div className="mt-8">
                    <ListaDinamica
                        tipo="tasks_sub"
                        minimalHeader
                        configOverride={tasksSubConfig}
                        paramKey={task.id}
                    />
                </div>
            </div>

            {/* Modali */}
            {modaleAperta && (
                <GenericEditorModal
                    table="tasks"
                    id={task.id}
                    onClose={() => setModaleAperta(false)}
                    onSaved={fetchTask}
                />
            )}

            {commentiAperti && (
                <ChatCommentiModal
                    commenti={[]} // caricati dalla modale
                    utenteId={utenteId || ""}
                    taskId={task.id}
                    utentiProgetto={utentiProgetto}
                    onClose={() => setCommentiAperti(false)}
                    onNuovoCommento={() => { }}
                />
            )}
        </div>
    );
}
