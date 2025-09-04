// 📅 src/Pagine/Calendario.tsx
import {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useLayoutEffect,
    startTransition,
    memo,
    type JSX,
} from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { it } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTasks, faCheckCircle, faCircle, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

/* ----------------------------- Tipi ----------------------------- */
type Task = {
    id: string;
    nome: string;
    note?: string | null;
    consegna: string | null;
    inizio_task?: string | null;
    fine_task: string | null;
    parent_id?: string | null;
    deleted_at?: string | null;
    stato?: { nome: string; colore?: string | null } | null;
    priorita?: { nome: string; colore?: string | null } | null;
    utenti_task?: { utente: { id: string; nome: string | null; cognome: string | null; avatar_url: string | null } }[];
};
type TaskCal = Task & { progetto_nome?: string | null };

/* --------------------- Helpers & palette ------------------------ */
const MAX_VISIBLE = 6;
const isoDay = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
const toDateOnly = (d: Date) => isoDay(d);
const clamp = <T,>(xs: T[], n: number, open: boolean) =>
    ({ visible: open ? xs : xs.slice(0, n), hidden: Math.max(xs.length - (open ? xs.length : n), 0) });

const hueHash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
const projectAccent = (name?: string | null) => {
    if (!name) return { rail: "hsl(210 15% 50%)", chipBg: "rgba(0,0,0,0.04)", chipFg: "hsl(210 15% 35%)" };
    const h = hueHash(name) % 360;
    return { rail: `hsl(${h} 65% 52%)`, chipBg: `color-mix(in oklab, white 85%, hsl(${h} 80% 50%))`, chipFg: `hsl(${h} 45% 38%)` };
};
const statusColor = (c?: string | null) => c || "hsl(210 12% 55%)";

/* ---------------------- Persistenza preferenze ------------------- */
const CAL_BASEDATE_GLOBAL = "cal:settimana:lastBaseDate";
const CAL_PREFS_KEY = (meId: string | null, projectId: string | null) =>
    `calendario:settimana:v1:${meId ?? "anon"}:${projectId ?? "all"}`;

type CalPrefs = { baseDate: string; openMap: Record<string, boolean> };
const readISODate = (v?: string | null) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const loadPrefs = (meId: string | null, projectId: string | null): CalPrefs | null => {
    try { const raw = localStorage.getItem(CAL_PREFS_KEY(meId, projectId)); return raw ? (JSON.parse(raw) as CalPrefs) : null; } catch { return null; }
};
const savePrefs = (meId: string | null, projectId: string | null, prefs: CalPrefs) => {
    try { localStorage.setItem(CAL_PREFS_KEY(meId, projectId), JSON.stringify(prefs)); } catch { }
};

/* ---------------------- Normalizzazione join -------------------- */
type RowFromDb = {
    id: string;
    nome: string;
    note?: any;
    consegna?: any;
    inizio_task?: any;
    fine_task?: any;
    parent_id?: any;
    deleted_at?: any;
    stato?: { nome: string; colore?: string | null } | { nome: string; colore?: string | null }[] | null;
    priorita?: { nome: string; colore?: string | null } | { nome: string; colore?: string | null }[] | null;
    utenti_task?: { utente: { id: string; nome: string | null; cognome: string | null; avatar_url: string | null } }[] | null;
    link?: { progetti_id: string; progetti?: { id: string; nome: string } | null }[] | null;
};

const pickOne = <T,>(v: T | T[] | null | undefined): T | null => {
    if (Array.isArray(v)) return v[0] ?? null;
    return (v ?? null) as T | null;
};

const normalizeRow = (r: RowFromDb): TaskCal => {
    const stato = pickOne(r.stato);
    const priorita = pickOne(r.priorita);
    const link = pickOne(r.link);
    return {
        id: r.id,
        nome: r.nome,
        note: r.note ?? null,
        consegna: r.consegna ?? null,
        inizio_task: r.inizio_task ?? null,
        fine_task: r.fine_task ?? null,
        parent_id: r.parent_id ?? null,
        deleted_at: r.deleted_at ?? null,
        stato: stato ? { nome: stato.nome, colore: stato.colore ?? null } : null,
        priorita: priorita ? { nome: priorita.nome, colore: priorita.colore ?? null } : null,
        utenti_task: (r.utenti_task ?? []).map(u => ({ utente: u.utente })),
        progetto_nome: link?.progetti?.nome ?? null,
    };
};

/* ---------------------- Cache & Signature ----------------------- */
const TASKS_CACHE = new Map<string, TaskCal[]>();
const cacheKey = (projectId: string | null) => projectId ?? "all";

// firma stabile per capire se una task è cambiata davvero
const signatureOf = (t: Partial<TaskCal>) =>
    JSON.stringify({
        id: t.id,
        nome: t.nome,
        note: t.note ?? null,
        consegna: t.consegna ?? null,
        inizio_task: t.inizio_task ?? null,
        fine_task: t.fine_task ?? null,
        parent_id: t.parent_id ?? null,
        deleted_at: t.deleted_at ?? null,
        progetto_nome: t.progetto_nome ?? null,
        stato: t.stato ? { n: t.stato.nome, c: t.stato.colore ?? null } : null,
        priorita: t.priorita ? { n: t.priorita.nome, c: t.priorita.colore ?? null } : null,
        utenti: (t.utenti_task ?? []).map(x => x.utente.id).sort(),
    });

/* ---------------------- Data & Realtime hook -------------------- */
function useCalendarData(projectId: string | null) {
    // Boot immediato da cache per evitare flash/“refresh”
    const [taskList, setTaskList] = useState<TaskCal[]>(() => TASKS_CACHE.get(cacheKey(projectId)) ?? []);
    const recentRef = useRef<Map<string, number>>(new Map());
    const pausedUntilRef = useRef<number>(0);
    const sigRef = useRef<Map<string, string>>(new Map()); // id -> firma attuale

    const pauseRealtime = (ms = 800) => { const until = Date.now() + ms; pausedUntilRef.current = Math.max(pausedUntilRef.current, until); };
    const isPaused = () => Date.now() < pausedUntilRef.current;

    const markRecent = (ids: string[], ms = 6000) => {
        const now = Date.now();
        ids.forEach(id => recentRef.current.set(id, now + ms));
    };
    const isRecent = (id?: string | null) => {
        if (!id) return false;
        const until = recentRef.current.get(id);
        if (!until) return false;
        if (Date.now() > until) { recentRef.current.delete(id); return false; }
        return true;
    };

    const writeCache = useCallback((rows: TaskCal[]) => {
        TASKS_CACHE.set(cacheKey(projectId), rows);
    }, [projectId]);

    const initialLoad = useCallback(async () => {
        const key = cacheKey(projectId);
        const cached = TASKS_CACHE.get(key);
        if (cached) {
            // precompila le firme senza toccare lo state (niente “refresh”)
            const m = new Map<string, string>();
            cached.forEach(t => m.set(t.id, signatureOf(t)));
            sigRef.current = m;
            return;
        }
        let q = supabase.from("tasks").select(`
      id, nome, note, consegna, inizio_task, fine_task, parent_id, deleted_at,
      stato:stati ( nome, colore ),
      priorita ( nome, colore ),
      utenti_task:utenti_task ( utente:utenti ( id, nome, cognome, avatar_url ) ),
      link:progetti_task!left ( progetti_id, progetti ( id, nome ) )
    `).is("deleted_at", null);
        if (projectId) q = q.eq("link.progetti_id", projectId);
        const { data, error } = await q;
        if (error) { console.error(error); return; }
        const next = (data as unknown as RowFromDb[]).map(normalizeRow);

        const sigs = new Map<string, string>();
        next.forEach(t => sigs.set(t.id, signatureOf(t)));
        sigRef.current = sigs;

        // setState solo se è davvero diverso (qui parte da [] quando niente cache)
        setTaskList(next);
        writeCache(next);
    }, [projectId, writeCache]);

    useEffect(() => { initialLoad(); }, [initialLoad]);

    /* ---- Upsert locale incrementale (NO array nuovo se nulla cambia) ---- */
    const upsertLocal = useCallback((row: Partial<TaskCal> & { id: string; __insertHint__?: boolean }) => {
        const incomingSig = signatureOf(row);

        startTransition(() => {
            setTaskList(prev => {
                let changed = false;
                let found = false;

                const next = prev.map(t => {
                    if (t.id !== row.id) return t;
                    found = true;

                    const merged: TaskCal = {
                        ...t,
                        ...row,
                        progetto_nome: (row as any).progetto_nome ?? t.progetto_nome ?? null,
                        stato: row.stato !== undefined ? row.stato : t.stato ?? null,
                        priorita: row.priorita !== undefined ? row.priorita : t.priorita ?? null,
                        utenti_task: row.utenti_task !== undefined ? row.utenti_task : t.utenti_task ?? [],
                    };

                    const newSig = signatureOf(merged);
                    const oldSig = sigRef.current.get(t.id);
                    if (newSig === oldSig) return t; // identico → riuso oggetto
                    sigRef.current.set(t.id, newSig);
                    changed = true;
                    return merged;
                });

                if (!found && row.__insertHint__) {
                    sigRef.current.set(row.id, incomingSig);
                    // Inseriamo in testa senza ricreare tutto
                    writeCache([row as TaskCal, ...prev]);
                    return [row as TaskCal, ...prev];
                }

                if (!changed) return prev; // IMPORTANTISSIMO
                writeCache(next as TaskCal[]);
                return next as TaskCal[];
            });
        });
    }, [writeCache]);

    /* ---- Hydrate 1 task (join) con short-circuit su firma ---- */
    const hydrateTimers = useRef<Map<string, number>>(new Map());
    const hydrateTask = useCallback(async (id: string) => {
        const existing = hydrateTimers.current.get(id);
        if (existing) window.clearTimeout(existing);
        const t = window.setTimeout(async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select(`
          id, nome, note, consegna, inizio_task, fine_task, parent_id, deleted_at,
          stato:stati ( nome, colore ),
          priorita ( nome, colore ),
          utenti_task:utenti_task ( utente:utenti ( id, nome, cognome, avatar_url ) ),
          link:progetti_task!left ( progetti_id, progetti ( id, nome ) )
        `)
                .eq("id", id)
                .maybeSingle();

            if (!error && data) {
                const full = normalizeRow(data as unknown as RowFromDb);
                const newSig = signatureOf(full);
                const oldSig = sigRef.current.get(full.id);
                if (newSig !== oldSig) {
                    sigRef.current.set(full.id, newSig);
                    upsertLocal(full);
                }
            }
            hydrateTimers.current.delete(id);
        }, 140);
        hydrateTimers.current.set(id, t);
    }, [upsertLocal]);

    /* ---- Event bridge per modali/editor (upsert immediato) ---- */
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as Partial<TaskCal> & { id: string };
            if (!detail?.id) return;
            upsertLocal({ ...detail, __insertHint__: true });
            // ignora eco realtime per un po'
            recentRef.current.set(detail.id, Date.now() + 6000);
            hydrateTask(detail.id);
        };
        window.addEventListener("tasks:upsert", handler as EventListener);
        return () => window.removeEventListener("tasks:upsert", handler as EventListener);
    }, [upsertLocal, hydrateTask]);

    /* ---- Realtime: patch mirata + hydrate; eco ignorato ---- */
    useEffect(() => {
        const ch = supabase
            .channel(`rt:tasks:${cacheKey(projectId)}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload: any) => {
                if (isPaused()) return;
                const id: string | undefined = payload?.new?.id ?? payload?.old?.id;
                if (!id) return;
                if (isRecent(id)) return;

                const type = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
                if (type === "DELETE") {
                    startTransition(() => {
                        setTaskList(prev => {
                            const idx = prev.findIndex(t => t.id === id);
                            if (idx === -1) return prev;
                            const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
                            sigRef.current.delete(id);
                            writeCache(next);
                            return next;
                        });
                    });
                    return;
                }

                // upsert “light”
                const row = payload.new as Partial<TaskCal>;
                upsertLocal({
                    id: row.id!,
                    nome: row.nome!,
                    note: row.note ?? null,
                    consegna: row.consegna ?? null,
                    inizio_task: row.inizio_task ?? null,
                    fine_task: row.fine_task ?? null,
                    parent_id: row.parent_id ?? null,
                    deleted_at: row.deleted_at ?? null,
                });
                hydrateTask(id);
            })
            .subscribe();

        return () => { supabase.removeChannel(ch); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]); // upsertLocal/hydrateTask sono stabili e non servono qui

    return {
        taskList,
        setTaskList,
        markRecent,
        pauseRealtime,
        writeCache,
    };
}

/* ------------------------- UI atoms ----------------------------- */
const AvatarRow = ({ t }: { t: TaskCal }) => {
    const list = (t.utenti_task || []).map(u => u.utente).filter(Boolean);
    if (!list.length) return null;
    return (
        <span className="ml-auto flex -space-x-1">
            {list.slice(0, 3).map(a => (
                <img
                    key={a!.id}
                    alt=""
                    src={a!.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(`${a!.nome ?? ""} ${a!.cognome ?? ""}`)}`}
                    className="w-5 h-5 rounded-full border border-theme"
                />
            ))}
            {list.length > 3 && <span className="text-[10px] px-1.5 rounded bg-white/50 dark:bg:white/10">{`+${list.length - 3}`}</span>}
        </span>
    );
};
const Dot = ({ color }: { color?: string | null }) => (
    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusColor(color) }} />
);

/* ------------------------------- Main --------------------------- */
export default function Calendario() {
    const { id: routeId, slug } = useParams<{ id?: string; slug?: string }>();
    const [projectId, setProjectId] = useState<string | null>(routeId ?? null);

    const [meId, setMeId] = useState<string | null>(null);
    useEffect(() => { supabase.auth.getSession().then(({ data }) => setMeId(data?.session?.user.id ?? null)); }, []);
    useEffect(() => {
        if (!projectId && slug) {
            supabase.from("progetti").select("id").eq("slug", slug).maybeSingle()
                .then(({ data }) => data?.id && setProjectId(data.id));
        }
    }, [slug, projectId]);

    const {
        taskList,
        setTaskList,
        markRecent,
        pauseRealtime,
        writeCache,
    } = useCalendarData(projectId);

    /* -------------------- baseDate STICKY (anti-reset) ------------- */
    const initialBaseDateValue: Date =
        readISODate(localStorage.getItem(CAL_BASEDATE_GLOBAL)) ?? new Date();

    const [baseDate, _setBaseDate] = useState<Date>(initialBaseDateValue);
    const baseDateRef = useRef<Date>(initialBaseDateValue);

    const setBaseDate = useCallback((d: Date) => {
        baseDateRef.current = d;
        _setBaseDate(d);
        try { localStorage.setItem(CAL_BASEDATE_GLOBAL, isoDay(d)); } catch { }
    }, []);

    useLayoutEffect(() => {
        if (baseDate.getTime() !== baseDateRef.current.getTime()) {
            _setBaseDate(baseDateRef.current);
        }
    }, [baseDate]);

    // openMap persistente
    const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

    // Carico preferenze namespaced (una sola volta)
    const loadedPrefsRef = useRef(false);
    useEffect(() => {
        if (loadedPrefsRef.current) return;
        const prefs = loadPrefs(meId, projectId);
        if (prefs) {
            const stored = readISODate(localStorage.getItem(CAL_BASEDATE_GLOBAL));
            const d = readISODate(prefs.baseDate);
            if (!stored && d) { baseDateRef.current = d; _setBaseDate(d); }
            setOpenMap(prefs.openMap ?? {});
        }
        loadedPrefsRef.current = true;
    }, [meId, projectId]);

    // Salvataggio preferenze
    const saveTimerRef = useRef<number | null>(null);
    useEffect(() => {
        if (!loadedPrefsRef.current) return;
        const toSave: CalPrefs = { baseDate: isoDay(baseDate), openMap };
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            savePrefs(meId, projectId, toSave);
            try { localStorage.setItem(CAL_BASEDATE_GLOBAL, toSave.baseDate); } catch { }
            saveTimerRef.current = null;
        }, 120);
        return () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); };
    }, [baseDate, openMap, meId, projectId]);

    /* -------------------- Settimana corrente ----------------------- */
    const days = useMemo(() => {
        const s = startOfWeek(baseDate, { weekStartsOn: 1 });
        const e = endOfWeek(baseDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: s, end: e });
    }, [baseDate]);

    /* ---------------------- Mappe e util --------------------------- */
    const byId = useMemo(() => new Map(taskList.map(t => [t.id, t] as const)), [taskList]);
    const kidsByParent = useMemo(() => {
        const m: Record<string, TaskCal[]> = {};
        taskList.forEach(t => { if (t.parent_id) (m[t.parent_id] ||= []).push(t); });
        return m;
    }, [taskList]);

    const findRootId = useCallback((id: string): string => {
        let cur = byId.get(id);
        while (cur?.parent_id) cur = byId.get(cur.parent_id);
        return cur?.id ?? id;
    }, [byId]);

    const collectDescendants = useCallback((rootId: string): string[] => {
        const result: string[] = [];
        const stack = [rootId];
        while (stack.length) {
            const pid = stack.pop()!;
            const kids = kidsByParent[pid] || [];
            for (const k of kids) {
                result.push(k.id);
                if (kidsByParent[k.id]?.length) stack.push(k.id);
            }
        }
        return result;
    }, [kidsByParent]);

    // solo task assegnate a me — finché meId è null mostro tutto (niente “vuoto→pieno”)
    const onlyMine = useCallback((t: TaskCal) => {
        if (!meId) return true;
        return (t.utenti_task?.some(u => u.utente?.id === meId)) ?? false;
    }, [meId]);

    const tasksForDay = useCallback((d: Date) =>
        taskList.filter(t => t.consegna && isoDay(t.consegna) === isoDay(d) && onlyMine(t)),
        [taskList, onlyMine]
    );

    /* -------------------- Drag & Drop (di gruppo) ------------------ */
    type DragPayload = { rootId: string; ids: string[] };
    const dragRef = useRef<DragPayload | null>(null);

    const onDragStartGroup = (taskId: string, e?: React.DragEvent) => {
        const rootId = findRootId(taskId);
        const groupIds = [rootId, ...collectDescendants(rootId)];
        dragRef.current = { rootId, ids: groupIds };
        pauseRealtime(900);
        if (e?.dataTransfer) { e.dataTransfer.setData("text/plain", taskId); e.dataTransfer.effectAllowed = "move"; }
    };

    const onDropTo = async (day: Date) => {
        const payload = dragRef.current; dragRef.current = null;
        pauseRealtime(1000);
        if (!payload || payload.ids.length === 0) return;

        const newDate = toDateOnly(day);
        const allSame = payload.ids.every(id => isoDay(byId.get(id)?.consegna ?? "") === newDate);
        if (allSame) return;

        // Patch locale ottimistica senza ricreare array se non cambia niente
        startTransition(() => {
            setTaskList(prev => {
                let changed = false;
                const next = prev.map(t => {
                    if (!payload.ids.includes(t.id)) return t;
                    if (t.consegna === newDate) return t;
                    changed = true;
                    return { ...t, consegna: newDate };
                });
                if (!changed) return prev;
                writeCache(next as TaskCal[]);
                return next as TaskCal[];
            });
        });
        markRecent(payload.ids, 6000);

        const { error } = await supabase.from("tasks").update({ consegna: newDate }).in("id", payload.ids);
        if (error) console.error("Errore DnD update gruppo:", error);
    };

    /* --------------------------- Toggle done ----------------------- */
    const [updating, setUpdating] = useState<Set<string>>(new Set());
    const toggleDone = async (t: TaskCal) => {
        if (updating.has(t.id)) return;
        setUpdating(s => new Set(s).add(t.id));
        pauseRealtime(600);

        const done = !t.fine_task, now = new Date().toISOString();

        startTransition(() => {
            setTaskList(prev => {
                let changed = false;
                const next = prev.map(x => {
                    if (x.id !== t.id) return x;
                    const merged = { ...x, fine_task: done ? now : null };
                    if (signatureOf(merged) === signatureOf(x)) return x;
                    changed = true;
                    return merged;
                });
                if (!changed) return prev;
                writeCache(next as TaskCal[]);
                return next as TaskCal[];
            });
        });
        markRecent([t.id], 6000);

        const { error } = await supabase.from("tasks").update({ fine_task: done ? now : null }).eq("id", t.id);
        if (error) {
            console.error("Errore toggle:", error);
            startTransition(() => {
                setTaskList(prev => {
                    const next = prev.map(x => x.id === t.id ? { ...x, fine_task: t.fine_task } : x);
                    writeCache(next as TaskCal[]);
                    return next as TaskCal[];
                });
            });
        }
        setUpdating(s => { const n = new Set(s); n.delete(t.id); return n; });
    };

    /* --------------------------- GroupCard ------------------------- */
    type Group = { parent?: TaskCal; parentRef?: TaskCal | null; children: TaskCal[] };
    const AvatarRowMemo = memo(AvatarRow);

    const GroupCard = memo(function GroupCard({ g, accent }: { g: Group; accent: ReturnType<typeof projectAccent> }) {
        const headerTask = g.parent ?? g.parentRef ?? null;
        const draggableId = g.parent?.id ?? g.parentRef?.id ?? (g.children[0]?.id ?? "");
        return (
            <div className="card-theme border border-theme" draggable onDragStart={(e) => onDragStartGroup(draggableId, e)} title={headerTask?.nome || "Attività"}>
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ background: accent.rail }} />
                    <div className="pl-3 pr-2 pt-2 pb-2.5">
                        {headerTask && (
                            <div className="flex items-start gap-2">
                                {g.parent ? (
                                    <button
                                        type="button"
                                        onClick={() => toggleDone(g.parent!)}
                                        disabled={updating.has(g.parent!.id)}
                                        className={`mt-[2px] shrink-0 rounded-full p-1 hover-bg-theme ${updating.has(g.parent!.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                                        aria-label={g.parent!.fine_task ? "Segna come incompleta" : "Segna come completata"}
                                    >
                                        {g.parent!.fine_task
                                            ? <FontAwesomeIcon icon={faCheckCircle} className="w-4.5 h-4.5 icon-success" />
                                            : <FontAwesomeIcon icon={faCircle} className="w-4.5 h-4.5 icon-color" />}
                                    </button>
                                ) : (
                                    <div className="mt-[6px] w-3 h-3 rounded-full" style={{ background: accent.rail, opacity: 0.6 }} />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className={`text-[15px] font-semibold leading-5 ${g.parent?.fine_task ? "line-through opacity-80" : ""}`}>{headerTask?.nome ?? "Attività"}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py={[2] as any} text-[11px] font-medium" style={{ background: accent.chipBg, color: accent.chipFg }}
                                            title={headerTask?.progetto_nome ? `Progetto: ${headerTask?.progetto_nome}` : "Senza progetto"}>
                                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: accent.rail }} />
                                            {headerTask?.progetto_nome ?? "Senza progetto"}
                                        </span>
                                        {headerTask?.stato?.nome && <span className="inline-flex items-center gap-1 text-[11px] opacity-80"><Dot color={headerTask.stato.colore} /><span>{headerTask.stato.nome}</span></span>}
                                        {headerTask?.priorita?.nome && <span className="inline-flex items-center gap-1 text-[11px] opacity-80"><Dot color={headerTask.priorita.colore} /><span>Priorità {headerTask.priorita.nome}</span></span>}
                                    </div>
                                </div>
                                {headerTask && <AvatarRowMemo t={headerTask} />}
                            </div>
                        )}
                        {g.children.length > 0 && (
                            <div className="mt-2 pl-4">
                                <div className="relative">
                                    <div className="absolute left-[4px] top-1 bottom-1 w-[1px] bg-black/10 dark:bg-white/10" />
                                    <div className="flex flex-col gap-1.5">
                                        {g.children.map(child => (
                                            <div key={child.id} className="flex items-start gap-2">
                                                <div className="mt-[6px] w-2 h-2 rounded-full" style={{ background: accent.rail }} />
                                                <div className={`flex-1 rounded-lg border border-theme card-theme p-2 ${child.fine_task ? "opacity-70 line-through" : ""}`} draggable onDragStart={(e) => onDragStartGroup(child.id, e)} title={child.note || child.nome}>
                                                    <div className="flex items-start gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleDone(child)}
                                                            disabled={updating.has(child.id)}
                                                            className={`mt-[2px] shrink-0 rounded-full p-1 hover-bg-theme ${updating.has(child.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                                                            aria-label={child.fine_task ? "Segna come incompleta" : "Segna come completata"}
                                                        >
                                                            {child.fine_task
                                                                ? <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 icon-success" />
                                                                : <FontAwesomeIcon icon={faCircle} className="w-4 h-4 icon-color" />}
                                                        </button>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[13px] font-medium leading-5">{child.nome}</div>
                                                            {child.note && <div className="mt-0.5 text-[12px] opacity-75 line-clamp-2">{child.note}</div>}
                                                        </div>
                                                        <AvatarRowMemo t={child} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {g.parent?.note && <div className="mt-2 text-[12px] opacity-75">{g.parent.note}</div>}
                    </div>
                </div>
            </div>
        );
    });

    /* ----------------------------- Day column ---------------------- */
    const DayCol = memo(function DayCol({ day, idx }: { day: Date; idx: number }) {
        const dayTasks = tasksForDay(day);
        const has = dayTasks.length > 0;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

        const flexClass = isWeekend && !has ? "flex-[0.45]" : "flex-1";
        const minW = isWeekend && !has ? "min-w-[88px]" : "min-w-[150px]";

        const parentsToday = dayTasks.filter(t => !t.parent_id);
        const subsToday = dayTasks.filter(t => t.parent_id);
        const groupsMap = new Map<string, { parent?: TaskCal; parentRef?: TaskCal | null; children: TaskCal[] }>();

        parentsToday.forEach(p => groupsMap.set(p.id, { parent: p, children: [] }));
        subsToday.forEach(s => {
            const p = s.parent_id ? byId.get(s.parent_id) : null;
            if (!p) return;
            const key = p.id;
            if (groupsMap.has(key)) groupsMap.get(key)!.children.push(s);
            else groupsMap.set(key, { parentRef: p, children: [s] });
        });

        const groups = Array.from(groupsMap.values()).sort((a, b) => {
            const an = (a.parent ?? a.parentRef)?.nome ?? "";
            const bn = (b.parent ?? b.parentRef)?.nome ?? "";
            const aw = a.parent ? 0 : 1, bw = b.parent ? 0 : 1;
            return aw - bw || an.localeCompare(bn);
        });

        const items: JSX.Element[] = groups.map((g, i) => {
            const projName = (g.parent ?? g.parentRef ?? g.children[0])?.progetto_nome;
            const accent = projectAccent(projName);
            return <GroupCard key={(g.parent?.id ?? g.parentRef?.id ?? `ghost-${i}`)} g={g} accent={accent} />;
        });

        if (!items.length) items.push(<div key="empty" className="text-sm italic opacity-60">Nessuna attività</div>);

        const k = isoDay(day);
        const open = !!openMap[k];
        const { visible, hidden } = clamp(items, MAX_VISIBLE, open);

        let stripClass = "";
        if (has) {
            const hasOpen = dayTasks.some(t => !t.fine_task);
            if (day < new Date() && hasOpen) stripClass = "cal-strip cal-danger";
            else if (isToday(day)) stripClass = hasOpen ? "cal-strip cal-warn" : "cal-strip cal-ok";
            else stripClass = "cal-strip cal-ok";
        }

        const msg = has
            ? (day < new Date()
                ? (dayTasks.some(t => !t.fine_task) ? "Task in ritardo" : "Tutte completate")
                : (isToday(day)
                    ? (dayTasks.some(t => !t.fine_task) ? "Task di oggi" : "Nessun task pendente")
                    : (dayTasks.some(t => !t.fine_task) ? "Task in programma" : "Tutte completate")))
            : "";

        return (
            <div
                key={k}
                data-day-idx={idx}
                tabIndex={0}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => onDropTo(day)}
                className={`${flexClass} ${minW} transition-[flex] duration-300 ease-out flex flex-col border-l border-theme overflow-hidden focus:outline-none`}
            >
                <div className={`px-3 py-2 sticky top-0 z-10 bg-theme ${stripClass} ${isToday(day) ? "ring-1 ring-blue-400/40" : ""}`}>
                    <div className="flex items-baseline justify-between">
                        <div className="text-sm font-bold">
                            {format(day, "EEE d MMM", { locale: it }).replace(/^./, c => c.toUpperCase())}
                        </div>
                        <div className="text-xs opacity-70">{dayTasks.length} {dayTasks.length === 1 ? "item" : "items"}</div>
                    </div>
                    {has && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                            <FontAwesomeIcon icon={faTasks} className="w-3 h-3 icon-color" />
                            <span className="status-text cal-msg-text">{msg}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 p-3 overflow-auto hide-scrollbar">
                    {visible}
                    {hidden > 0 && !open && (
                        <button
                            type="button"
                            onClick={() => setOpenMap(s => ({ ...s, [k]: true }))}
                            className="text-[12px] mt-1 underline opacity-80 hover:opacity-100 text-left"
                        >
                            +{hidden} altri
                        </button>
                    )}
                </div>
            </div>
        );
    });

    /* --------------------------- Header ---------------------------- */
    return (
        <div className="min-h-screen bg-theme text-theme flex flex-col">
            <div className="p-4 flex items-center gap-3 border-b border-theme">
                <h1 className="text-2xl font-extrabold tracking-tight">📅 Calendario</h1>

                <div className="ml-auto flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setBaseDate(new Date(baseDate.getTime() - 7 * 86400000))}
                        className="px-2.5 py-1.5 rounded hover-bg-theme"
                        aria-label="Settimana precedente"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} className="icon-color" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setBaseDate(new Date())}
                        className="text-sm font-semibold px-3.5 py-1.5 rounded-md bg-button-oggi"
                        title="Vai alla settimana corrente"
                    >
                        Oggi
                    </button>

                    <button
                        type="button"
                        onClick={() => setBaseDate(new Date(baseDate.getTime() + 7 * 86400000))}
                        className="px-2.5 py-1.5 rounded hover-bg-theme"
                        aria-label="Settimana successiva"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="icon-color" />
                    </button>
                </div>
            </div>

            <div role="grid" className="flex-1 overflow-hidden flex">
                {days.map((d, i) => <DayCol key={isoDay(d)} day={d} idx={i} />)}
            </div>
        </div>
    );
}
