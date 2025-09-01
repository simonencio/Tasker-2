// src/Progetti/DettaglioProgetto.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUserCheck,
    faUsers,
    faCheckCircle,
    faStop,
    faPlay,
    faTasks,
    faPen,
    faCommentDots
} from "@fortawesome/free-solid-svg-icons";

import { isUtenteAdmin } from "../supporto/ruolo";
import ToggleMie from "../GestioneProgetto/ToggleMie";
import RenderSottoTask from "../supporto/SottoTask";
import RenderCommento from "../supporto/RenderCommento";

import {
    Chip,
    StatoBadge,
    AvatarChip,
    Section,
    MetaField
} from "../supporto/ui";

import type { Task, Utente, Progetto, Commento } from "../supporto/tipi";
import GenericEditorModal from "../Modifica/GenericEditorModal";

/* ============================== Tipi ============================== */
type TaskConSlug = Task & { slug: string };

/* ============================== Utils ============================== */
function formatDurata(value?: number | string | null): string {
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
}

/* ============================== Component ============================== */
export default function DettaglioProgetto() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [progetto, setProgetto] = useState<Progetto | null>(null);
    const progettoId = progetto?.id ?? null;

    const [taskList, setTaskList] = useState<TaskConSlug[]>([]);
    const [loading, setLoading] = useState(true);
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [modaleAperta, setModaleAperta] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [taskAperta, setTaskAperta] = useState<Record<string, boolean>>({});
    const [taskDaModificare, setTaskDaModificare] = useState<string | null>(null);
    const [membri, setMembri] = useState<Utente[]>([]);
    const [durateUtenteProgetto, setDurateUtenteProgetto] = useState<{ utente: Utente; durata: number }[]>([]);
    const [commenti, setCommenti] = useState<Commento[]>([]);
    const [commentiEspansi, setCommentiEspansi] = useState<Set<string>>(new Set());
    const [durateTaskUtente, setDurateTaskUtente] = useState<Record<string, Record<string, number>>>({});
    const [activeTimer, setActiveTimer] = useState<{ taskId: string; startTime: Date } | null>(null);
    const [, setElapsed] = useState<number>(0);

    const toggleCommentiEspansi = (taskId: string) => {
        setCommentiEspansi(prev => {
            const nuovo = new Set(prev);
            nuovo.has(taskId) ? nuovo.delete(taskId) : nuovo.add(taskId);
            return nuovo;
        });
    };

    /* ------------------------ Init ------------------------ */
    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then(res => {
            if (mounted) {
                setIsAdmin(res);
                if (!res) setSoloMieTask(true);
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    /* ------------------------ Progetto ------------------------ */
    useEffect(() => {
        const fetchProgetto = async () => {
            if (!slug) return;
            const { data } = await supabase
                .from("progetti")
                .select(`
                    id, nome, slug, note, consegna, tempo_stimato,
                    cliente:clienti(id, nome),
                    stato:stati(id, nome, colore),
                    priorita(id, nome)
                `)
                .eq("slug", slug)
                .single<Progetto>();
            if (data) setProgetto({ ...data, membri });
            setLoading(false);
        };
        fetchProgetto();
    }, [slug]);

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession();
            setUtenteLoggatoId(session?.session?.user.id || null);
        };
        fetchUtente();
    }, []);

    /* ------------------------ Membri ------------------------ */
    useEffect(() => {
        const fetchMembri = async () => {
            if (!progettoId) return;
            const { data } = await supabase
                .from("utenti_progetti")
                .select("utenti:utente_id ( id, nome, cognome, avatar_url )")
                .eq("progetto_id", progettoId);
            const utenti: Utente[] = (data || []).map((r: any) => r.utenti);
            setMembri(utenti);
            setProgetto(p => (p ? { ...p, membri: utenti } as Progetto : p));
        };
        fetchMembri();
    }, [progettoId]);

    /* ------------------------ Durate Progetto ------------------------ */
    useEffect(() => {
        const fetchDurate = async () => {
            if (!progettoId) return;
            const { data } = await supabase
                .from("time_entries")
                .select("utente_id, durata, utenti:utente_id ( id, nome, cognome, avatar_url )")
                .eq("progetto_id", progettoId);
            const mappa: Record<string, { utente: Utente; durata: number }> = {};
            for (const row of data || []) {
                const utente = Array.isArray(row.utenti) ? row.utenti[0] : row.utenti;
                if (!utente) continue;
                if (!mappa[utente.id]) mappa[utente.id] = { utente, durata: 0 };
                mappa[utente.id].durata += row.durata || 0;
            }
            setDurateUtenteProgetto(Object.values(mappa));
        };
        fetchDurate();
    }, [progettoId]);

    /* ------------------------ Tasks Progetto ------------------------ */
    useEffect(() => {
        const fetchTasks = async () => {
            if (!progettoId) return;
            const { data } = await supabase
                .from("progetti_task")
                .select(`
                    task:task_id (
                        id, slug, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
                        stato:stato_id (id, nome, colore),
                        priorita:priorita_id (id, nome),
                        utenti_task ( utenti ( id, nome, cognome ) )
                    )
                `)
                .eq("progetti_id", progettoId);

            if (data) {
                const tasksPulite: TaskConSlug[] = data.map((r: any) => ({
                    id: r.task.id,
                    slug: r.task.slug,
                    nome: r.task.nome,
                    note: r.task.note,
                    consegna: r.task.consegna,
                    tempo_stimato: r.task.tempo_stimato,
                    created_at: r.task.created_at,
                    modified_at: r.task.modified_at,
                    fine_task: r.task.fine_task,
                    parent_id: r.task.parent_id,
                    stato: r.task.stato,
                    priorita: r.task.priorita,
                    progetto: { id: progettoId!, nome: progetto?.nome || "", slug: progetto?.slug || slug || "" },
                    assegnatari: r.task.utenti_task?.map((u: any) => u.utenti) ?? [],
                    utenti_task: r.task.utenti_task ?? []
                }));
                setTaskList(tasksPulite);
            }
        };
        fetchTasks();
    }, [progettoId, progetto?.nome]);

    /* ------------------------ Commenti ------------------------ */
    useEffect(() => {
        const caricaCommenti = async () => {
            const { data } = await supabase
                .from("commenti")
                .select(`
                    id, utente_id, task_id, parent_id, descrizione, created_at, modified_at, deleted_at,
                    utente:utente_id (id, nome, cognome)
                `)
                .is("deleted_at", null);
            const commentiPuliti: Commento[] = (data || []).map((c: any) => ({
                ...c,
                utente: Array.isArray(c.utente) ? c.utente[0] : c.utente
            }));
            setCommenti(commentiPuliti);
        };
        caricaCommenti();
    }, []);

    /* ------------------------ Timer UI ------------------------ */
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeTimer) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000));
            }, 1000);
        } else setElapsed(0);
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTimer]);

    const handleStartTimer = (taskId: string) =>
        setActiveTimer({ taskId, startTime: new Date() });

    const handleStopTimer = async (task: Task) => {
        if (!activeTimer || !utenteLoggatoId) return setActiveTimer(null);
        const endTime = new Date();
        const durata = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000);
        await supabase.from("time_entries").insert({
            utente_id: utenteLoggatoId,
            progetto_id: progettoId,
            task_id: task.id,
            nome: task.nome,
            data_inizio: activeTimer.startTime.toISOString(),
            data_fine: endTime.toISOString(),
            durata
        });
        setActiveTimer(null);
    };

    /* ------------------------ Helpers ------------------------ */
    const sottoTask = (taskId: string) => taskList.filter(t => t.parent_id === taskId);
    const trovaTutteLeFiglie = (taskId: string): string[] => {
        const figliDiretti = taskList.filter(t => t.parent_id === taskId);
        const ids = figliDiretti.map(f => f.id);
        return ids.flatMap(id => [id, ...trovaTutteLeFiglie(id)]);
    };

    const caricaDurateTaskUtente = async (task: Task) => {
        if (!task.id || !task.assegnatari.length) return;
        const tutteTaskId = [task.id, ...trovaTutteLeFiglie(task.id)];
        const { data } = await supabase
            .from("time_entries")
            .select("utente_id, durata")
            .in("task_id", tutteTaskId);
        const mappa: Record<string, number> = {};
        for (const r of data || []) {
            if (!r.utente_id || !r.durata) continue;
            mappa[r.utente_id] = (mappa[r.utente_id] || 0) + r.durata;
        }
        setDurateTaskUtente(prev => ({ ...prev, [task.id]: mappa }));
    };

    const totaleProgettoSec = useMemo(
        () => durateUtenteProgetto.reduce((acc, r) => acc + (r.durata || 0), 0),
        [durateUtenteProgetto]
    );

    /* ------------------------ Render ------------------------ */
    if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
    if (!progetto || !progettoId) return <div className="p-6 text-theme">Progetto non trovato</div>;

    return (
        <div className="min-h-screen bg-theme text-theme">



            <div className="p-6 max-w-6xl mx-auto w-full">
                {/* titolo */}
                <h1 className="text-2xl font-bold mb-4 text-theme flex flex-row items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-row items-center gap-2">
                        📁 {progetto.nome}
                        <button
                            onClick={() => setModaleAperta(true)}
                            className="text-yellow-500 hover:text-yellow-600 transition"
                        >
                            <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                        </button>
                    </div>
                    {isAdmin && <ToggleMie soloMieTask={soloMieTask} setSoloMieTask={setSoloMieTask} />}
                </h1>

                {/* metacard progetto */}
                <div className="rounded-xl border border-theme/20 card-theme p-5 text-[15px] space-y-4">
                    {/* campi principali */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MetaField label="Cliente"><Chip>{progetto.cliente?.nome ?? "—"}</Chip></MetaField>
                        <MetaField label="Consegna"><Chip>{progetto.consegna ? new Date(progetto.consegna).toLocaleDateString() : "—"}</Chip></MetaField>
                        <MetaField label="Stato"><StatoBadge nome={progetto.stato?.nome} colore={progetto.stato?.colore as any} /></MetaField>
                        <MetaField label="Priorità"><Chip>{progetto.priorita?.nome ?? "—"}</Chip></MetaField>
                        <MetaField label="Tempo stimato"><Chip>{formatDurata(progetto.tempo_stimato)}</Chip></MetaField>
                        <MetaField label="Tempo registrato"><Chip>{formatDurata(totaleProgettoSec)}</Chip></MetaField>
                    </div>

                    {/* membri */}
                    {membri.length > 0 && (
                        <Section icon={faUsers} title="Membri">
                            <div className="flex flex-wrap gap-2 gap-y-3">
                                {membri.map(m => <AvatarChip key={m.id} utente={m} />)}
                            </div>
                        </Section>
                    )}

                    {/* tempo utente */}
                    {durateUtenteProgetto.length > 0 && (
                        <Section title="🕒 Tempo registrato per utente">
                            <ul className="list-disc ml-5 space-y-1">
                                {durateUtenteProgetto.map(({ utente, durata }) => (
                                    <li key={utente.id}>{utente.nome} {utente.cognome || ""}: {formatDurata(durata)}</li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {/* note */}
                    {progetto.note && (
                        <Section title="Note">
                            <div className="leading-relaxed">{progetto.note}</div>
                        </Section>
                    )}

                    {/* azioni */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => setModaleAperta(true)} className="px-3 py-2 rounded-xl card-theme hover-bg-theme text-[15px] flex items-center gap-2">
                            <FontAwesomeIcon icon={faPen} /> Modifica
                        </button>
                        <button onClick={() => console.log("Commenti progetto")} className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-[15px] flex items-center gap-2">
                            <FontAwesomeIcon icon={faCommentDots} /> Commenti
                        </button>
                    </div>
                </div>

                {/* tabella task */}
                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-6xl mx-auto mt-8">
                    {/* header tabella */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold border-b border-theme/20">
                        <div className="w-10 shrink-0" />
                        <div className="flex-1">Nome</div>
                        <div className="w-40">Consegna</div>
                        <div className="w-32">Stato</div>
                        <div className="w-32">Priorità</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>
                    {/* righe */}
                    {taskList
                        .filter(t => !t.parent_id && (!soloMieTask || t.assegnatari.some(u => u.id === utenteLoggatoId)))
                        .map(task => {
                            const isAssegnata = task.assegnatari.some(u => u.id === utenteLoggatoId);
                            const isCompletata = !!task.fine_task;
                            const isOpen = taskAperta[task.id];
                            const children = sottoTask(task.id);
                            return (
                                <div key={task.id} className="border-t border-theme/20 hover-bg-theme">
                                    <div
                                        className="flex items-center px-4 py-3 text-sm cursor-pointer"
                                        onClick={() => {
                                            setTaskAperta(p => ({ ...p, [task.id]: !p[task.id] }));
                                            if (!isOpen) caricaDurateTaskUtente(task);
                                        }}
                                    >
                                        <div className="w-8 shrink-0 flex flex-col items-center gap-1">
                                            {isAssegnata && <FontAwesomeIcon icon={faUserCheck} className="w-4 h-4 text-blue-600" />}
                                            {isCompletata && <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />}
                                        </div>
                                        <div className="flex-1 font-medium truncate">{task.nome}</div>
                                        <div className="hidden lg:block w-40">{task.consegna ? new Date(task.consegna).toLocaleDateString() : "—"}</div>
                                        <div className="hidden lg:block w-32">{task.stato?.nome ?? "—"}</div>
                                        <div className="hidden lg:block w-32">{task.priorita?.nome ?? "—"}</div>
                                        <div className="w-20 flex justify-end gap-3">
                                            {task.assegnatari.length > 0 && (
                                                <button onClick={e => { e.stopPropagation(); activeTimer?.taskId === task.id ? handleStopTimer(task) : handleStartTimer(task.id); }}>
                                                    <FontAwesomeIcon icon={activeTimer?.taskId === task.id ? faStop : faPlay} className="icon-color" />
                                                </button>
                                            )}
                                            <button onClick={e => { e.stopPropagation(); setTaskDaModificare(task.id); }}>
                                                <FontAwesomeIcon icon={faPen} className="icon-color" />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); navigate(`/tasks/${task.slug}`); }}>
                                                <FontAwesomeIcon icon={faTasks} className="icon-color" />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); setTaskAperta(p => ({ ...p, [task.id]: !p[task.id] })); }}>
                                                {isOpen ? "−" : "+"}
                                            </button>
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="px-6 pb-4 text-sm space-y-2 card-theme border-t border-theme/20">
                                            {task.tempo_stimato && <p>⏱️ {formatDurata(task.tempo_stimato)}</p>}
                                            {task.assegnatari.length > 0 && <p>👥 {task.assegnatari.map(u => u.nome).join(", ")}</p>}
                                            {task.note && <p>🗒️ {task.note}</p>}
                                            {durateTaskUtente[task.id] && (
                                                <ul className="list-disc ml-5 space-y-1">
                                                    {task.assegnatari.map(u => (
                                                        <li key={u.id}>{u.nome} {u.cognome}: {formatDurata(durateTaskUtente[task.id]?.[u.id] || 0)}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {children.length > 0 && (
                                                <div>
                                                    <div className="cursor-pointer hover-bg-theme">📎 Sotto-task</div>
                                                    {children.map(sotto => <RenderSottoTask key={sotto.id} task={sotto} allTasks={taskList} livello={1} />)}
                                                </div>
                                            )}
                                            {commenti.some(c => c.task_id === task.id && !c.parent_id) && (
                                                <div>
                                                    <div onClick={() => toggleCommentiEspansi(task.id)} className="cursor-pointer hover-bg-theme">💬 Commenti</div>
                                                    {commentiEspansi.has(task.id) && commenti.filter(c => c.task_id === task.id && !c.parent_id).map(c => <RenderCommento key={c.id} commento={c} allCommenti={commenti} livello={1} />)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {modaleAperta && progettoId && (
                <GenericEditorModal
                    table="progetti"
                    id={progettoId}
                    onClose={() => setModaleAperta(false)}
                />
            )}
            {taskDaModificare && (
                <GenericEditorModal
                    table="tasks"
                    id={taskDaModificare}
                    onClose={() => setTaskDaModificare(null)}
                />
            )}
        </div>
    );
}
