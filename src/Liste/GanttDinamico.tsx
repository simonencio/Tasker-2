// 📅 src/Liste/GanttDinamico.tsx
import { useMemo, useState, useCallback, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolder,
    faTasks,
    faCheckCircle,
    faChevronLeft,
    faChevronRight,
    faCalendarDay,
    faChevronDown,
    faChevronRight as faChevronRightSmall,
    faUser,
    faSitemap,
} from "@fortawesome/free-solid-svg-icons";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

import IntestazioneLista from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type { ResourceConfig } from "./typesLista";
import { useResourceData } from "./useResourceData";
import { supabase } from "../supporto/supabaseClient";

/* ------------------------------------------------------------------ */
/** Tipi compatti lato UI */
type SimpleUser = { id: string; nome: string; avatar_url?: string | null };
type SimpleProject = { id: string; nome: string; slug?: string };

type GanttItem = {
    id: string;
    name: string;
    start: Date;
    end: Date;
    isTask: boolean;
    coloreClass: string;
    isCompletato: boolean;
    assegnatari: SimpleUser[];
    progetti: SimpleProject[];
    hasRealDates: boolean;
    children?: GanttItem[];
    parentId?: string | null;
    level: number;
    childCount: number;
    __raw: any;
};

/* ----------------------- Costanti UI/Densità (più grandi) --------- */
const ROW_HEIGHT = 68;           // +12px vs 56
const SIDEBAR_PCT = 0.28;        // un filo più ampia per testo leggibile
const INDENT_PER_LEVEL = 14;     // indent più evidente
const HEADER_BAR_H = 40;         // altezza header giorni (prima 30/32)
const HEADER_TITLE_H = 44;       // altezza riga titolo mese (prima 32)
const BAR_HEIGHT_CLASS = "h-9";  // barre timeline più alte (prima h-7)
const BAR_TEXT_CLASS = "text-[13px] md:text-sm font-semibold"; // testo dentro barre
const ROW_TEXT_MAIN = "text-[14px] md:text-[15px] font-semibold";
const ROW_TEXT_META = "text-[12px] md:text-[13px]";
const DAY_LABEL_TEXT = "text-[12px] md:text-sm font-semibold";
const DAY_BADGE_TEXT = "text-[11px] md:text-[12px]";
const AVATAR_SIZE = "w-5 h-5";   // prima 4x4

const TASK_COLORS = [
    "gantt-bar-blue",
    "gantt-bar-green",
    "gantt-bar-violet",
    "gantt-bar-orange",
    "gantt-bar-pink",
    "gantt-bar-teal",
];

/* ---------------------- UI helpers ---------------------- */
function AvatarStack({ users }: { users: SimpleUser[] }) {
    if (!users?.length) return null;
    const show = users.slice(0, 3);
    return (
        <div className="inline-flex items-center -space-x-1.5">
            {show.map((u) => (
                <img
                    key={u.id}
                    src={u.avatar_url || "/default-avatar.png"}
                    className={`${AVATAR_SIZE} rounded-full border border-white`}
                    title={u.nome}
                    alt={u.nome}
                    loading="lazy"
                />
            ))}
            {users.length > 3 && (
                <span className="ml-1 text-[11px] md:text-[12px] font-medium opacity-80">
                    +{users.length - 3}
                </span>
            )}
        </div>
    );
}

function ProjBadge({ p }: { p: SimpleProject }) {
    return (
        <span
            className={`inline-flex items-center rounded px-1.5 py-[2px] ${DAY_BADGE_TEXT} border border-theme/50 badge-translucent`}
            title={`Progetto: ${p.nome}`}
        >
            {p.nome}
        </span>
    );
}

function Chevron({ open }: { open: boolean }) {
    return (
        <FontAwesomeIcon
            icon={open ? faChevronDown : faChevronRightSmall}
            className="text-sm opacity-70"
        />
    );
}

/* ---------------------------------- */
/** TIMELINE row (DnD) */
const TimelineSortableRow = memo(function TimelineSortableRow({
    item,
    startCol,
    endCol,
    onSelect,
    gridTemplateColumns,
    zebra,
}: {
    item: GanttItem;
    startCol: number;
    endCol: number;
    onSelect: (item: GanttItem) => void;
    gridTemplateColumns: string;
    zebra: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: item.id });
    const styleDnD = { transform: CSS.Transform.toString(transform), transition };
    const innerIndentPx = Math.min(item.level * INDENT_PER_LEVEL, 56);

    return (
        <div
            ref={setNodeRef}
            style={{ ...styleDnD, height: ROW_HEIGHT }}
            className={`relative border-b border-theme cursor-grab active:cursor-grabbing select-none ${zebra ? "bg-black/[0.02] dark:bg-white/[0.04]" : ""
                }`}
            {...attributes}
            {...listeners}
            onDoubleClick={() => onSelect(item)}
            title="Trascina su/giù per riordinare"
        >
            <div className="grid h-full items-center" style={{ gridTemplateColumns }}>
                <div
                    className={`${BAR_HEIGHT_CLASS} rounded-md transition-transform duration-150 hover:scale-[1.01] shadow-sm flex items-center gap-2 px-2 md:px-3 ${BAR_TEXT_CLASS} text-white overflow-hidden ${item.coloreClass}`}
                    style={{
                        gridColumn: `${startCol} / ${endCol}`,
                        opacity: item.isCompletato ? 0.68 : 1,
                        border: item.hasRealDates
                            ? (document.documentElement.classList.contains('dark')
                                ? "2px solid rgba(255,255,255,.7)"
                                : "2px solid white")
                            : undefined,

                        cursor: "pointer",
                        paddingLeft: 8 + innerIndentPx,
                    }}
                    onClick={() => onSelect(item)}
                    title={`${item.name}: ${moment(item.start).format("DD/MM/YYYY")} → ${moment(item.end).format("DD/MM/YYYY")}`}
                >
                    <span className="truncate">{item.name}</span>
                    {item.isTask && <AvatarStack users={item.assegnatari} />}
                    {item.childCount > 0 && (
                        <span className="ml-1 inline-flex items-center gap-1 text-[11px] md:text-[12px] opacity-95">
                            <FontAwesomeIcon icon={faSitemap} className="text-[12px]" />
                            {item.childCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

/* ---------------------------------- */
/** SIDEBAR row (più grande/leggibile) */
function ActivityRow({
    item,
    isCollapsed,
    onToggle,
    onOpen,
    zebra,
    userId,
}: {
    item: GanttItem;
    isCollapsed: boolean;
    onToggle: (id: string) => void;
    onOpen: (item: GanttItem) => void;
    zebra: boolean;
    userId: string | null;
}) {
    const hasChildren = item.isTask
        ? (item.children?.length ?? 0) > 0 || item.childCount > 0
        : item.childCount > 0;

    const indent = item.level * INDENT_PER_LEVEL;

    const isMine = !!userId && item.assegnatari.some((u) => u.id === userId);

    return (
        <div
            className={`group cursor-pointer border-b border-theme px-3 md:px-4 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors ${zebra ? "bg-black/[0.02] dark:bg-white/[0.04]" : ""
                }`}
            style={{ height: ROW_HEIGHT }}
            onClick={() => onOpen(item)}
        >
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4 min-w-0">
                {/* CONTROLLI */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="shrink-0" style={{ width: indent }} onClick={(e) => e.stopPropagation()} />
                    {hasChildren ? (
                        <button
                            className="shrink-0 rounded hover:bg-black/5 px-1.5"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(item.id);
                            }}
                            title={isCollapsed ? "Espandi figli" : "Comprimi figli"}
                        >
                            <Chevron open={!isCollapsed} />
                        </button>
                    ) : (
                        <span className="shrink-0 w-4" />
                    )}
                    <FontAwesomeIcon
                        icon={item.isTask ? faTasks : faFolder}
                        className={`${item.isTask ? "text-blue-500" : "text-purple-500"} text-base md:text-lg`}
                    />
                </div>

                {/* CONTENUTO */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`truncate ${ROW_TEXT_MAIN}`}>{item.name}</span>
                        {item.childCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[12px] md:text-[13px] opacity-90">
                                <FontAwesomeIcon icon={faSitemap} />
                                {item.childCount}
                            </span>
                        )}
                        {item.isCompletato && (
                            <FontAwesomeIcon
                                icon={faCheckCircle}
                                className="text-[14px] md:text-[16px] text-emerald-600"
                                title="Completato"
                            />
                        )}
                    </div>
                    <div className={`mt-1 ${ROW_TEXT_META} text-gray-600 dark:text-gray-300 flex items-center gap-2`}>
                        {moment(item.start).format("DD/MM")} → {moment(item.end).format("DD/MM")}
                        {item.isTask && item.progetti?.[0] && <ProjBadge p={item.progetti[0]} />}
                    </div>
                </div>

                {/* META DESTRA */}
                <div className="flex items-center gap-2 md:gap-3">
                    <AvatarStack users={item.assegnatari} />
                    {isMine && (
                        <FontAwesomeIcon
                            icon={faUser}
                            className="text-[12px] md:text-[13px] opacity-70"
                            title="Assegnata a te"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

/* ---------------------------------- */
export default function GanttDinamico<T extends { id: string | number }>({
    tipo,
    modalitaCestino = false,
    paramKey = "view",
}: {
    tipo: ResourceKey;
    modalitaCestino?: boolean;
    paramKey?: string;
}) {
    const navigate = useNavigate();
    const cfgAny = resourceConfigs[tipo] as any;
    if (!cfgAny) return <p className="text-red-600">Config non trovata per tipo: {tipo}</p>;
    const cfg = cfgAny as ResourceConfig<T>;

    const { items, loading } = useResourceData(cfg, { modalitaCestino });

    /* --- Stato barra titolo / mese --- */
    const [selectedMonth, setSelectedMonth] = useState<Date>(moment().startOf("month").toDate());
    const monthStart = useMemo(() => moment(selectedMonth).startOf("month"), [selectedMonth]);
    const monthEnd = useMemo(() => moment(selectedMonth).endOf("month"), [selectedMonth]);

    // Vista metà mese: 0 = 1–15, 1 = 16–fine
    const [halfIdx, setHalfIdx] = useState<0 | 1>(0);

    /* --- Collassamento gerarchia --- */
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    /* --- Utente corrente --- */
    const [userId, setUserId] = useState<string | null>(null);
    useEffect(() => {
        let ok = true;
        (async () => {
            try {
                const { data } = await supabase.auth.getUser();
                if (ok) setUserId(data.user?.id ?? null);
            } catch {
                if (ok) setUserId(null);
            }
        })();
        return () => {
            ok = false;
        };
    }, []);

    /* --- DnD --- */
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    /* --- Overrides date --- */
    const [overrides] = useState<Record<string, { start: Date; end: Date; hasRealDates?: boolean }>>(
        {}
    );

    /* --- Mapping helper: utenti/task/progetti --- */
    const toUsersForTask = (raw: any): SimpleUser[] => {
        const fromUT =
            raw?.utenti_task?.map((ut: any) => ut.utente) ||
            raw?.utenti ||
            raw?.assegnatari ||
            [];
        return (fromUT || []).map((u: any) => ({
            id: u.id,
            nome: [u.nome, u.cognome].filter(Boolean).join(" "),
            avatar_url: u.avatar_url,
        }));
    };

    const toUsersForProject = (raw: any): SimpleUser[] => {
        const fromUP = raw?.utenti_progetti?.map((up: any) => up.utente) || raw?.utenti || [];
        return (fromUP || []).map((u: any) => ({
            id: u.id,
            nome: [u.nome, u.cognome].filter(Boolean).join(" "),
            avatar_url: u.avatar_url,
        }));
    };

    const toProjects = (raw: any): SimpleProject[] => {
        if (Array.isArray(raw?.progetti))
            return raw.progetti.map((p: any) => ({ id: p.id, nome: p.nome, slug: p.slug }));
        if (raw?.progetto)
            return [{ id: raw.progetto.id, nome: raw.progetto.nome, slug: raw.progetto.slug }];
        if (Array.isArray(raw?.progetti_task)) {
            return raw.progetti_task
                .map((pt: any) => pt.progetto || pt.progetti || pt.project)
                .filter(Boolean)
                .map((p: any) => ({ id: p.id, nome: p.nome, slug: p.slug }));
        }
        return [];
    };

    /* --- Calcolo date --- */
    const calcolaDate = useCallback(
        (item: any, isTask: boolean): { start: Date; end: Date; hasReal: boolean } => {
            if (isTask) {
                if (item.inizio_task && item.fine_task) {
                    return { start: new Date(item.inizio_task), end: new Date(item.fine_task), hasReal: true };
                }
                if (item.consegna) {
                    return {
                        start: new Date(item.created_at || new Date().toISOString()),
                        end: new Date(item.consegna),
                        hasReal: false,
                    };
                }
                const start = new Date(item.created_at || new Date().toISOString());
                return { start, end: moment(start).add(3, "days").toDate(), hasReal: false };
            } else {
                if (item.inizio_progetto && item.fine_progetto) {
                    return { start: new Date(item.inizio_progetto), end: new Date(item.fine_progetto), hasReal: true };
                }
                if (item.consegna) {
                    return {
                        start: new Date(item.created_at || new Date().toISOString()),
                        end: new Date(item.consegna),
                        hasReal: false,
                    };
                }
                const start = new Date(item.created_at || new Date().toISOString());
                return { start, end: moment(start).add(7, "days").toDate(), hasReal: false };
            }
        },
        []
    );

    /* --- Costruzione items Gantt --- */
    const ganttItems: GanttItem[] = useMemo(() => {
        const map = new Map<string, GanttItem>();
        const roots: GanttItem[] = [];

        items.forEach((raw: any, idx: number) => {
            const isTask = tipo === "tasks";
            const base = calcolaDate(raw, isTask);
            const ov = overrides[raw.id];
            const start = ov?.start ?? base.start;
            const end = ov?.end ?? base.end;
            const hasReal = ov?.hasRealDates ?? base.hasReal;
            const coloreClass = TASK_COLORS[idx % TASK_COLORS.length];

            const taskChildrenCount = (raw.children?.length ?? 0) + (raw.subtasks?.length ?? 0);
            const projTaskCount =
                (Array.isArray(raw.progetti_task) ? raw.progetti_task.length : 0) ||
                (Array.isArray(raw.tasks) ? raw.tasks.length : 0);

            const gi: GanttItem = {
                id: String(raw.id),
                name: raw.nome,
                start,
                end,
                isTask,
                isCompletato: isTask ? !!raw.fine_task : !!raw.fine_progetto,
                coloreClass,
                hasRealDates: hasReal,
                assegnatari: isTask ? toUsersForTask(raw) : toUsersForProject(raw),
                progetti: isTask ? toProjects(raw) : [],
                parentId: isTask ? raw.parent_id ?? null : null,
                children: [],
                level: 0,
                childCount: isTask ? taskChildrenCount : projTaskCount,
                __raw: raw,
            };
            map.set(gi.id, gi);
        });

        // collega gerarchia SOLO per tasks via parent_id
        map.forEach((gi) => {
            if (gi.isTask && gi.parentId && map.has(gi.parentId)) {
                map.get(gi.parentId)!.children!.push(gi);
            }
        });

        const setLevel = (node: GanttItem, lvl: number) => {
            node.level = lvl;
            node.children?.forEach((c) => setLevel(c, lvl + 1));
        };

        map.forEach((gi) => {
            if (!gi.isTask) {
                roots.push(gi);
            } else {
                if (!gi.parentId || !map.has(gi.parentId)) {
                    roots.push(gi);
                    setLevel(gi, 0);
                }
            }
        });

        roots.forEach((r) => setLevel(r, r.level || 0));
        return roots;
    }, [items, tipo, overrides, calcolaDate]);

    /* --- Flatten --- */
    const flattenItems = useCallback(
        (arr: GanttItem[]): GanttItem[] => arr.flatMap((it) => [it, ...flattenItems(it.children || [])]),
        []
    );
    const flatItems = useMemo(() => flattenItems(ganttItems), [ganttItems, flattenItems]);

    /* --- Filtro mese intero (base) --- */
    const monthItems = useMemo(() => {
        const start = monthStart.toDate();
        const end = monthEnd.toDate();
        return flatItems.filter((it) => it.end >= start && it.start <= end);
    }, [flatItems, monthStart, monthEnd]);

    /* ------------------ Mezza mese: giorni visibili ------------------ */
    const allDays = useMemo(() => {
        const arr: Date[] = [];
        let cur = monthStart.clone();
        while (cur.isSameOrBefore(monthEnd, "day")) {
            arr.push(cur.toDate());
            cur.add(1, "day");
        }
        return arr;
    }, [monthStart, monthEnd]);

    const firstHalfStartIdx = 0;
    const firstHalfEndIdx = Math.min(14, allDays.length - 1);
    const secondHalfStartIdx = Math.min(15, allDays.length - 1);
    const secondHalfEndIdx = allDays.length - 1;

    const halfStartIdx = halfIdx === 0 ? firstHalfStartIdx : secondHalfStartIdx;
    const halfEndIdx = halfIdx === 0 ? firstHalfEndIdx : secondHalfEndIdx;

    const visibleDays = useMemo(
        () => allDays.slice(halfStartIdx, halfEndIdx + 1),
        [allDays, halfStartIdx, halfEndIdx]
    );

    const isWeekend = (d: Date) => {
        const wd = moment(d).day();
        return wd === 0 || wd === 6;
    };

    const dayWeights = useMemo(() => visibleDays.map(() => 1), [visibleDays]);

    const gridTemplateColumns = useMemo(
        () => dayWeights.map((w) => `${w}fr`).join(" "),
        [dayWeights]
    );

    const visibleStart = visibleDays[0];
    const visibleEnd = visibleDays[visibleDays.length - 1];

    const dateToIndex = useCallback(
        (date: Date) => {
            if (moment(date).isBefore(visibleStart, "day")) return 0;
            if (moment(date).isAfter(visibleEnd, "day")) return visibleDays.length - 1;
            return moment(date).startOf("day").diff(moment(visibleStart).startOf("day"), "days");
        },
        [visibleStart, visibleEnd, visibleDays.length]
    );

    const getGridCols = useCallback(
        (item: GanttItem) => {
            const sIdx = dateToIndex(item.start);
            const eIdx = Math.max(sIdx, dateToIndex(item.end));
            const startCol = Math.max(1, Math.min(sIdx + 1, visibleDays.length + 1));
            const endCol = Math.max(startCol + 1, Math.min(eIdx + 2, visibleDays.length + 1));
            return { startCol, endCol };
        },
        [dateToIndex, visibleDays.length]
    );

    const todayIdx = useMemo(() => {
        const today = moment().startOf("day");
        if (!today.isBetween(visibleStart, visibleEnd, "day", "[]")) return null;
        return today.diff(moment(visibleStart), "days");
    }, [visibleStart, visibleEnd]);

    // Items limitati alla metà visibile
    const windowItems = useMemo(
        () => monthItems.filter((it) => it.end >= visibleStart && it.start <= visibleEnd),
        [monthItems, visibleStart, visibleEnd]
    );
    const windowItemsById = useMemo(
        () => new Map(windowItems.map((m) => [m.id, m])),
        [windowItems]
    );

    /* --- Ordinamento persistente --- */
    const [orderedItems, setOrderedItems] = useState<string[]>([]);
    const lastSavedOrderRef = useRef<string>("");
    const [userKeyReady, setUserKeyReady] = useState(false);
    const orderKey = useMemo(() => `ganttOrder:${tipo}:${userId ?? "anon"}`, [tipo, userId]);

    const arraysEqual = (a: string[], b: string[]) =>
        a.length === b.length && a.every((v, i) => v === b[i]);

    const allFlatIds = useMemo(() => windowItems.map((i) => i.id), [windowItems]);

    useEffect(() => {
        let desired = allFlatIds;
        try {
            const raw = localStorage.getItem(orderKey);
            if (raw) {
                const saved: string[] = JSON.parse(raw);
                const filtered = saved.filter((id) => allFlatIds.includes(id));
                const missing = allFlatIds.filter((id) => !filtered.includes(id));
                desired = [...filtered, ...missing];
            }
        } catch {
            desired = allFlatIds;
        }
        setOrderedItems((prev) => (arraysEqual(prev, desired) ? prev : desired));
        setUserKeyReady(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderKey, allFlatIds.join("|")]);

    useEffect(() => {
        if (!userKeyReady) return;
        const json = JSON.stringify(orderedItems);
        if (json !== lastSavedOrderRef.current) {
            try {
                localStorage.setItem(orderKey, json);
            } catch { }
            lastSavedOrderRef.current = json;
        }
    }, [orderedItems, orderKey, userKeyReady]);

    /* --- Visibili + collassati sulla window --- */
    const windowSet = useMemo(() => new Set(windowItems.map((m) => m.id)), [windowItems]);

    const visibleOrderedIds = useMemo(() => {
        const inOrder = orderedItems.filter((id) => windowSet.has(id));
        const missing = windowItems.map((m) => m.id).filter((id) => !inOrder.includes(id));
        const base = [...inOrder, ...missing];

        const hidden = new Set<string>();
        base.forEach((id) => {
            const it = windowItemsById.get(id);
            if (!it) return;
            if (it.isTask) {
                let p = it.parentId ? windowItemsById.get(it.parentId) : null;
                while (p) {
                    if (collapsed.has(p.id)) {
                        hidden.add(id);
                        break;
                    }
                    p = p.parentId ? windowItemsById.get(p.parentId) : null;
                }
            }
        });

        return base.filter((id) => !hidden.has(id));
    }, [orderedItems, windowItems, windowItemsById, collapsed, windowSet]);

    /* --- Navigazione metà/mesi --- */
    const gotoPrevHalf = () => {
        if (halfIdx === 1) setHalfIdx(0);
        else {
            setSelectedMonth(moment(selectedMonth).subtract(1, "month").toDate());
            setHalfIdx(1);
        }
    };
    const gotoNextHalf = () => {
        if (halfIdx === 0) setHalfIdx(1);
        else {
            setSelectedMonth(moment(selectedMonth).add(1, "month").toDate());
            setHalfIdx(0);
        }
    };
    const gotoToday = () => {
        const m = moment().startOf("month").toDate();
        setSelectedMonth(m);
        const day = moment().date();
        setHalfIdx(day <= 15 ? 0 : 1);
    };

    /* --- Selezione riga --- */
    const handleSelect = (item: GanttItem) => {
        navigate(
            item.isTask
                ? `/tasks/${item.__raw.slug ?? item.id}`
                : `/progetti/${item.__raw.slug ?? item.id}`
        );
    };

    /* --- DnD end --- */
    const onTimelineDragEnd = useCallback(({ active, over }: DragEndEvent) => {
        if (!over) return;
        if (active.id === over.id) return;
        setOrderedItems((prev) => {
            const oldIndex = prev.indexOf(active.id as string);
            const newIndex = prev.indexOf(over.id as string);
            if (oldIndex === -1 || newIndex === -1) return prev;
            const next = arrayMove(prev, oldIndex, newIndex);
            return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
        });
    }, []);

    const toggleCollapse = (id: string) => {
        setCollapsed((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    /* ------------------------------------------------------------------ */
    return (
        // ROOT – nessuna scrollbar locale
        <div className="w-full min-h-screen flex flex-col overflow-x-hidden">
            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <IntestazioneLista
                    tipo={tipo}
                    titolo={(resourceConfigs as any)[tipo]?.titolo}
                    icona={(resourceConfigs as any)[tipo]?.icona}
                    coloreIcona={(resourceConfigs as any)[tipo]?.coloreIcona}
                    onChange={() => { }}
                    dati={(resourceConfigs as any)[tipo]?.useHeaderFilters ? items : undefined}
                    paramKey={paramKey}
                    modalitaCestino={modalitaCestino}
                />

                {/* Toolbar */}
                <div className="mt-4 mb-5 flex w-full justify-center">
                    <div className="inline-flex items-center gap-3 rounded-xl border border-theme bg-theme-70 backdrop-blur px-3 md:px-4 py-2.5 shadow-sm">
                        <button
                            onClick={gotoPrevHalf}
                            className="inline-flex items-center gap-2 rounded-lg border border-theme bg-theme-70 px-3 md:px-4 py-2 text-sm md:text-base text-theme hover-bg-theme"
                            title="Vai alla metà precedente"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                            <span className="hidden sm:inline">Prec. metà</span>
                        </button>

                        <div className="rounded-lg bg-theme-80 px-4 md:px-5 py-2 text-sm md:text-base font-bold tracking-wide">
                            {moment(selectedMonth).format("MMMM YYYY")} • {halfIdx === 0 ? "1–15" : `16–${moment(selectedMonth).daysInMonth()}`}
                        </div>

                        <button
                            onClick={gotoNextHalf}
                            className="inline-flex items-center gap-2 rounded-lg border border-theme bg-theme-70 px-3 md:px-4 py-2 text-sm md:text-base text-theme hover-bg-theme"
                            title="Vai alla metà successiva"
                        >
                            <span className="hidden sm:inline">Succ. metà</span>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>

                        <div className="mx-1 hidden h-6 w-px bg-white/20 dark:bg-white/10 sm:block" />

                        <button
                            onClick={gotoToday}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 md:px-4 py-2 text-sm md:text-base font-medium text-white hover:bg-blue-700"
                            title="Vai a oggi"
                        >
                            <FontAwesomeIcon icon={faCalendarDay} />
                            <span className="hidden sm:inline">Oggi</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="py-10 text-center text-lg text-theme">Caricamento…</p>
            ) : (
                <div className="w-full flex justify-center">
                    <div className="card-theme w-full lg:w-5/6 flex flex-col overflow-hidden">
                        {/* HEADER STICKY */}
                        <div className="sticky top-0 z-10 bg-theme-80 backdrop-blur border-b border-theme">
                            <div className="flex w-full">
                                <div
                                    className="border-r border-theme px-4 py-2 text-sm md:text-base font-semibold"
                                    style={{ width: `${Math.round(SIDEBAR_PCT * 100)}%` }}
                                >
                                    Attività
                                </div>
                                <div className="flex-1">
                                    <div className="w-full border-b border-theme flex" style={{ height: HEADER_TITLE_H }}>
                                        <div className="w-full flex items-center justify-center px-4 text-sm md:text-base font-bold tracking-wide">
                                            {moment(selectedMonth).format("MMMM YYYY")} • {halfIdx === 0 ? "1–15" : `16–${moment(selectedMonth).daysInMonth()}`}
                                        </div>
                                    </div>
                                    <div
                                        className="grid"
                                        style={{
                                            height: HEADER_BAR_H,
                                            gridTemplateColumns: gridTemplateColumns,
                                        }}
                                    >
                                        {visibleDays.map((d, i) => {
                                            const weekend = isWeekend(d);
                                            const isToday = todayIdx === i;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex items-center justify-center border-r border-theme ${DAY_LABEL_TEXT} ${weekend ? "bg-gantt-weekend text-theme" : "text-theme"
                                                        } ${isToday ? "bg-gantt-today text-gantt-today font-extrabold" : ""}`}
                                                    title={moment(d).format("dddd DD MMMM YYYY")}
                                                >
                                                    <span className="tracking-tight uppercase">
                                                        {moment(d).format("dd")} {moment(d).format("DD")}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CORPO */}
                        <div className="overflow-visible pb-16">

                            <div className="flex w-full">
                                {/* SIDEBAR ATTIVITÀ */}
                                <div
                                    className="border-r border-theme overflow-hidden"
                                    style={{ width: `${Math.round(SIDEBAR_PCT * 100)}%` }}
                                >
                                    {visibleOrderedIds.map((id, idx) => {
                                        const item = windowItemsById.get(id);
                                        if (!item) return null;
                                        const zebra = idx % 2 === 1;
                                        const isCollapsed = collapsed.has(item.id);
                                        return (
                                            <ActivityRow
                                                key={item.id}
                                                item={item}
                                                isCollapsed={isCollapsed}
                                                onToggle={toggleCollapse}
                                                onOpen={handleSelect}
                                                zebra={zebra}
                                                userId={userId}
                                            />
                                        );
                                    })}
                                </div>

                                {/* TIMELINE */}
                                <div className="relative flex-1 overflow-hidden">
                                    {/* background griglia giorni */}
                                    <div className="pointer-events-none absolute inset-0">
                                        <div className="grid h-full" style={{ gridTemplateColumns }}>
                                            {visibleDays.map((d, i) => {
                                                const weekend = isWeekend(d);
                                                const isToday = todayIdx === i;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`border-r border-theme ${isToday ? "bg-gantt-today" : weekend ? "bg-gantt-weekend" : ""}`}

                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* righe + dnd */}
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        autoScroll={false}
                                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                                        onDragEnd={onTimelineDragEnd}
                                    >
                                        <SortableContext items={visibleOrderedIds} strategy={verticalListSortingStrategy}>
                                            <div className="relative">
                                                {visibleOrderedIds.map((id, idx) => {
                                                    const item = windowItemsById.get(id);
                                                    if (!item) return null;
                                                    const { startCol, endCol } = getGridCols(item);
                                                    const zebra = idx % 2 === 1;
                                                    return (
                                                        <TimelineSortableRow
                                                            key={item.id}
                                                            item={item}
                                                            startCol={startCol}
                                                            endCol={endCol}
                                                            onSelect={handleSelect}
                                                            gridTemplateColumns={gridTemplateColumns}
                                                            zebra={zebra}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
