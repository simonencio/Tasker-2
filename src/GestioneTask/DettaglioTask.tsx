// src/GestioneTask/DettaglioTask.tsx
import { useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlay,
    faStop,
    faCheckCircle,
    faPen,
    faTrash,
    faCommentDots,
    faUsers
} from "@fortawesome/free-solid-svg-icons";
import { Toast } from "toaster-js";
import ChatCommentiModal from "./ChatCommentiModal";
import type { Commento } from "./tipi";
import {
    Chip,
    StatoBadge,
    AvatarChip,
    Section,
    MetaField
} from "../supporto/ui";
import GenericEditorModal from "../Modifica/GenericEditorModal";

/* ============================== Tipi ============================== */
type Assegnatario = { id: string; nome: string; cognome?: string | null; avatar_url?: string | null };
type Stato = { id: number; nome: string; colore?: string | null };
type Priorita = Pick<Stato, "id" | "nome">;
type Progetto = { id: string; nome: string };
type Task = {
    id: string;
    slug?: string | null;
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

/* ============================== Utils ============================== */
const formatDurata = (value?: number | string | null): string => {
    if (!value && value !== 0) return "—";
    if (typeof value === "number") {
        const h = Math.floor(value / 3600),
            m = Math.floor((value % 3600) / 60),
            s = value % 60;
        if (h > 0 && s > 0) return `${h}h ${m}m ${s}s`;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0 && s > 0) return `${m}m ${s}s`;
        if (m > 0) return `${m}m`;
        return `${s}s`;
    }
    if (typeof value === "string" && value.includes(":")) {
        const [hh, mm, ss] = value.split(":").map(v => parseInt(v, 10) || 0);
        if (hh > 0 && ss > 0) return `${hh}h ${mm}m ${ss}s`;
        if (hh > 0) return `${hh}h ${mm}m`;
        if (mm > 0 && ss > 0) return `${mm}m ${ss}s`;
        if (mm > 0) return `${mm}m`;
        return `${ss}s`;
    }
    return "—";
};

/* ============================== Componente ============================== */
export default function DettaglioTask() {
    const { slug, id } = useParams<{ slug?: string; id?: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [sottoTasks, setSottoTasks] = useState<Task[]>([]);
    const [durateTask, setDurateTask] = useState<Record<string, number>>({});
    const [durateTaskUtente, setDurateTaskUtente] = useState<Record<string, number>>({});
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
    const [espansi, setEspansi] = useState<Set<string>>(new Set());

    const [taskDaModificare, setTaskDaModificare] = useState<string | null>(null);
    const [taskChatCommenti, setTaskChatCommenti] = useState<Task | null>(null);
    const [commentiChat, setCommentiChat] = useState<Commento[]>([]);
    const [utentiProgetto, setUtentiProgetto] = useState<Assegnatario[]>([]);

    /* ------------------------ Sessione ------------------------ */
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            setUtenteId(data.session?.user.id || null);
        })();
    }, []);
    useEffect(() => {
        if (!taskChatCommenti) return;

        (async () => {
            const { data, error } = await supabase
                .from("commenti")
                .select(`
        id,
        parent_id,
        descrizione,
        created_at,
        utente:utente_id(id, nome, cognome, avatar_url),
        destinatari:commenti_destinatari(utente_id(id, nome, cognome, avatar_url))
      `)
                .eq("task_id", taskChatCommenti.id)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Errore caricamento commenti:", error);
                setCommentiChat([]);
            } else {
                const normalizzati: Commento[] = (data || []).map((c: any) => ({
                    id: c.id,
                    parent_id: c.parent_id,
                    descrizione: c.descrizione,
                    created_at: c.created_at,
                    utente: Array.isArray(c.utente) ? c.utente[0] : c.utente, // ✅ prendi il singolo utente
                    destinatari: (c.destinatari || []).map((d: any) =>
                        Array.isArray(d.utente_id) ? d.utente_id[0] : d.utente_id
                    ),
                }));
                setCommentiChat(normalizzati);
            }
        })();
    }, [taskChatCommenti]);


    /* ------------------------ Fetch task/sottotask ------------------------ */
    useEffect(() => {
        const key = slug || id;
        if (!key) return;
        (async () => {
            const baseSelect = `
        id,slug,nome,note,consegna,tempo_stimato,fine_task,created_at,modified_at,parent_id,
        stato:stato_id(id,nome,colore),
        priorita:priorita_id(id,nome),
        progetti_task(progetti(id,nome)),
        utenti_task(utenti(id,nome,cognome,avatar_url))
      `;
            const query = supabase.from("tasks").select(baseSelect).limit(1);
            const { data, error } = slug
                ? await query.eq("slug", slug).maybeSingle()
                : await query.eq("id", id as string).maybeSingle();
            if (error || !data) return;

            const progettoPulito =
                Array.isArray(data.progetti_task?.[0]?.progetti)
                    ? data.progetti_task?.[0]?.progetti[0]
                    : data.progetti_task?.[0]?.progetti ?? null;

            const taskPulita: Task = {
                id: data.id,
                slug: data.slug ?? null,
                nome: data.nome,
                note: data.note,
                consegna: data.consegna,
                tempo_stimato: data.tempo_stimato,
                fine_task: data.fine_task,
                created_at: data.created_at,
                modified_at: data.modified_at,
                parent_id: data.parent_id,
                stato: Array.isArray(data.stato) ? data.stato[0] : data.stato,
                priorita: Array.isArray(data.priorita) ? data.priorita[0] : data.priorita,
                progetto: progettoPulito,
                assegnatari: (data.utenti_task || []).map((u: any) => u.utenti),
            };
            setTask(taskPulita);

            if (progettoPulito?.id) {
                const { data: membri, error: errM } = await supabase
                    .from("utenti_progetti")
                    .select(`utenti(id,nome,cognome,avatar_url)`)
                    .eq("progetto_id", progettoPulito.id);
                setUtentiProgetto(!errM && Array.isArray(membri) ? membri.map((r: any) => r.utenti).filter(Boolean) : []);
            } else {
                setUtentiProgetto([]);
            }

            const s = await supabase
                .from("tasks")
                .select(`
          id,slug,nome,note,consegna,tempo_stimato,fine_task,created_at,modified_at,parent_id,
          stato:stato_id(id,nome,colore),
          priorita:priorita_id(id,nome),
          utenti_task(utenti(id,nome,cognome,avatar_url))
        `)
                .is("deleted_at", null);

            setSottoTasks(
                s.error || !s.data
                    ? []
                    : s.data.map((t: any) => ({
                        id: t.id,
                        slug: t.slug ?? null,
                        nome: t.nome ?? "—",
                        note: t.note,
                        consegna: t.consegna,
                        tempo_stimato: t.tempo_stimato,
                        fine_task: t.fine_task,
                        created_at: t.created_at,
                        modified_at: t.modified_at,
                        parent_id: t.parent_id,
                        stato: Array.isArray(t.stato) ? t.stato[0] : t.stato,
                        priorita: Array.isArray(t.priorita) ? t.priorita[0] : t.priorita,
                        progetto: null,
                        assegnatari: t.utenti_task?.map((u: any) => u.utenti) ?? [],
                    }))
            );
        })();
    }, [slug, id]);

    /* ------------------------ Durate ------------------------ */
    useEffect(() => {
        if (!task) return;
        (async () => {
            const ids = [task.id, ...sottoTasks.map(t => t.id)];
            const { data, error } = await supabase
                .from("time_entries")
                .select("task_id, utente_id, durata")
                .in("task_id", ids);
            if (error || !data) return;

            const m: Record<string, number> = {};
            const mappaUtenti: Record<string, number> = {};
            for (const r of data) {
                if (r.task_id && r.durata) {
                    m[r.task_id] = (m[r.task_id] || 0) + r.durata;
                }
                if (r.utente_id && r.durata) {
                    mappaUtenti[r.utente_id] = (mappaUtenti[r.utente_id] || 0) + r.durata;
                }
            }
            setDurateTask(m);
            setDurateTaskUtente(mappaUtenti);
        })();
    }, [task, sottoTasks]);

    const figliDiretti = (parentId: string) => sottoTasks.filter(t => t.parent_id === parentId);
    const getDurataTotaleTask = (taskId: string): number =>
        (durateTask[taskId] || 0) + figliDiretti(taskId).reduce((tot, f) => tot + getDurataTotaleTask(f.id), 0);

    /* ------------------------ Timer ------------------------ */
    const handleStartTimer = (t: Task) => setActiveTimer({ taskId: t.id, startTime: new Date() });
    const handleStopTimer = async (t: Task) => {
        if (!t || !utenteId || !activeTimer) return;
        if (!t.progetto?.id) {
            new Toast("Questa task non è collegata a nessun progetto", Toast.TYPE_ERROR, Toast.TIME_SHORT);
            setActiveTimer(null);
            return;
        }
        const fine = new Date();
        const durata = Math.floor((fine.getTime() - activeTimer.startTime.getTime()) / 1000);
        const { error } = await supabase.from("time_entries").insert({
            utente_id: utenteId,
            progetto_id: t.progetto.id,
            task_id: t.id,
            nome: t.nome,
            data_inizio: activeTimer.startTime.toISOString(),
            data_fine: fine.toISOString(),
            durata
        });
        new Toast(error ? "Errore nel salvataggio" : "Tempo salvato", error ? Toast.TYPE_ERROR : Toast.TYPE_DONE);
        setActiveTimer(null);
    };

    /* ------------------------ Sotto-task ------------------------ */
    const toggleEspansione = (taskId: string) =>
        setEspansi(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                const chiudi = (id: string) => {
                    next.delete(id);
                    figliDiretti(id).forEach(f => chiudi(f.id));
                };
                chiudi(taskId);
            } else next.add(taskId);
            return next;
        });

    const renderSottoTaskTabella = (parentId: string | null, livello = 0): JSX.Element[] => {
        const figli = sottoTasks.filter(t => t.parent_id === parentId);
        if (!figli.length) return [];
        return figli.flatMap(t => {
            const isOpen = espansi.has(t.id);
            const completata = !!t.fine_task;
            const durata = getDurataTotaleTask(t.id);
            const pad = livello * 16;
            const rows: JSX.Element[] = [];

            rows.push(
                <div
                    key={t.id}
                    className="flex items-center px-4 py-3 text-[15px] text-theme border-t border-theme/30 hover-bg-theme"
                    style={{ paddingLeft: pad }}
                    onClick={() => toggleEspansione(t.id)}
                >
                    <div className="w-10 shrink-0 flex justify-center items-center">
                        {completata && <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" title="Completata" />}
                    </div>
                    <div className="flex-1 font-medium truncate">{t.nome}</div>
                    <div className="w-28 flex justify-end items-center gap-3" onClick={e => e.stopPropagation()}>
                        <button className="icon-color hover:text-blue-600" title="Modifica" onClick={() => setTaskDaModificare(t.id)}>
                            <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                            className={`icon-color ${activeTimer?.taskId === t.id ? "hover:text-red-600" : "hover:text-green-600"}`}
                            title={activeTimer?.taskId === t.id ? "Ferma timer" : "Avvia timer"}
                            onClick={() =>
                                activeTimer?.taskId === t.id
                                    ? handleStopTimer({ ...t, progetto: task?.progetto })
                                    : handleStartTimer({ ...t, progetto: task?.progetto })
                            }
                        >
                            <FontAwesomeIcon icon={activeTimer?.taskId === t.id ? faStop : faPlay} />
                        </button>
                        <button
                            className="icon-color text-blue-600 hover:text-blue-500"
                            title="Apri commenti"
                            onClick={() => setTaskChatCommenti(t)}
                        >
                            <FontAwesomeIcon icon={faCommentDots} />
                        </button>
                        <button className="icon-color text-gray-400 cursor-not-allowed" title="Elimina (non implementato)">
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>
                </div>
            );

            if (isOpen) {
                rows.push(
                    <div
                        key={`${t.id}-d`}
                        className="card-theme border-b border-theme/20 px-4 py-3 text-[15px]"
                        style={{ paddingLeft: pad + 32 }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div><strong>Note:</strong> {t.note || "—"}</div>
                            <div><strong>Priorità:</strong> {t.priorita?.nome || "—"}</div>
                            <div><strong>Tempo totale:</strong> {formatDurata(durata)}</div>
                        </div>
                    </div>
                );
                rows.push(...renderSottoTaskTabella(t.id, livello + 1));
            }
            return rows;
        });
    };

    /* ------------------------ Render principale ------------------------ */
    if (!task) return <div className="p-6 text-theme">Caricamento task...</div>;
    const completata = !!task.fine_task;
    const totaleRicorsivo = getDurataTotaleTask(task.id);

    return (
        <div className="p-6 max-w-6xl mx-auto text-theme space-y-6">
            {/* Header */}
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-3">
                {completata && (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-600/10">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" title="Completata" />
                    </span>
                )}
                {task.nome}
            </h1>

            {/* Meta card */}
            <div className="rounded-xl border border-theme/20 card-theme p-5 text-[15px] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetaField label="Stato"><StatoBadge nome={task.stato?.nome} colore={task.stato?.colore} /></MetaField>
                    <MetaField label="Priorità"><Chip>{task.priorita?.nome ?? "—"}</Chip></MetaField>
                    <MetaField label="Consegna"><Chip>{task.consegna ? new Date(task.consegna).toLocaleDateString() : "—"}</Chip></MetaField>
                    <MetaField label="Progetto"><Chip>{task.progetto?.nome ?? "—"}</Chip></MetaField>
                    <MetaField label="Tempo stimato"><Chip>{formatDurata(task.tempo_stimato)}</Chip></MetaField>
                    <MetaField label="Tempo registrato (totale)"><Chip>{formatDurata(totaleRicorsivo)}</Chip></MetaField>
                </div>

                {task.assegnatari.length > 0 && (
                    <Section icon={faUsers} title="Assegnatari">
                        <div className="flex flex-wrap gap-2 gap-y-3">
                            {task.assegnatari.map(u => <AvatarChip key={u.id} utente={u} />)}
                        </div>
                    </Section>
                )}

                {Object.keys(durateTaskUtente).length > 0 && (
                    <Section title="🕒 Tempo registrato per utente">
                        <ul className="list-disc ml-5 space-y-1">
                            {task.assegnatari.map(u => {
                                const durata = durateTaskUtente[u.id] || 0;
                                return (
                                    <li key={u.id} className="break-words">
                                        {u.nome} {u.cognome || ""}: {formatDurata(durata)}
                                    </li>
                                );
                            })}
                        </ul>
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
                        onClick={() => setTaskDaModificare(task.id)}
                        className="px-3 py-2 rounded-xl card-theme hover-bg-theme text-[15px] flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPen} /> Modifica
                    </button>
                    <button
                        onClick={() =>
                            activeTimer?.taskId === task.id
                                ? handleStopTimer(task)
                                : handleStartTimer(task)
                        }
                        className={`px-3 py-2 rounded-xl text-[15px] flex items-center gap-2 ${activeTimer?.taskId === task.id
                            ? "bg-red-600 text-white hover:bg-red-500"
                            : "bg-green-600 text-white hover:bg-green-500"
                            }`}
                    >
                        <FontAwesomeIcon icon={activeTimer?.taskId === task.id ? faStop : faPlay} />
                        {activeTimer?.taskId === task.id ? "Ferma Timer" : "Avvia Timer"}
                    </button>
                    <button
                        onClick={() => setTaskChatCommenti(task)}
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

            {/* Sotto-task */}
            <div className="rounded-xl border border-theme/20 card-theme overflow-hidden">
                <div className="px-4 py-2 font-semibold bg-black/[.04] dark:bg-white/[.06]">Sotto-task</div>
                {renderSottoTaskTabella(task.id)}
            </div>

            {/* Modali */}
            {taskDaModificare && (
                <GenericEditorModal
                    table="tasks"
                    id={taskDaModificare}
                    onClose={() => setTaskDaModificare(null)}
                />
            )}
            {taskChatCommenti && (
                <ChatCommentiModal
                    commenti={commentiChat}
                    utenteId={utenteId || ""}
                    taskId={taskChatCommenti.id}
                    utentiProgetto={utentiProgetto}
                    onClose={() => setTaskChatCommenti(null)}
                    onNuovoCommento={(c: Commento) => setCommentiChat(prev => [...prev, c])}
                />
            )}
        </div>
    );
}
