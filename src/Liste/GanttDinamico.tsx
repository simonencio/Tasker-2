// src/Liste/GanttDinamico.tsx
import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faTasks, faCheckCircle } from "@fortawesome/free-solid-svg-icons";

import {
    DndContext,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import IntestazioneLista from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type { ResourceConfig } from "./typesLista";
import { useResourceData } from "./useResourceData";

/* ------------------------------------------------------------------ */
type GanttItem = {
    id: string;
    name: string;
    start: Date;
    end: Date;
    isTask: boolean;
    coloreClass: string;
    isCompletato: boolean;
    assegnatari?: { id: string; nome: string; avatar_url?: string | null }[];
    hasRealDates: boolean;
    children?: GanttItem[];
    parentId?: string | null;
    __raw: any;
};

type ViewMode = "day" | "week" | "month";

const ROW_HEIGHT = 56;
const MIN_DAY_WIDTH = 70;

const TASK_COLORS = [
    "gantt-bar-blue",
    "gantt-bar-green",
    "gantt-bar-violet",
    "gantt-bar-orange",
    "gantt-bar-pink",
    "gantt-bar-teal",
];

/* ------------------------------------------------------------------ */
function SortableRow({
    item,
    left,
    width,
    onSelect,
    level = 0,
}: {
    item: GanttItem;
    left: string;
    width: string;
    onSelect: (item: GanttItem) => void;
    level?: number;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, height: ROW_HEIGHT }}
            className="relative border-b border-theme"
            {...attributes}
            {...listeners}
        >
            <div
                className={`absolute top-2 left-0 h-9 rounded-md cursor-pointer transition-transform duration-150 hover:scale-105 shadow-sm flex items-center px-2 text-xs font-medium text-white overflow-hidden ${item.coloreClass}`}
                style={{
                    left,
                    width,
                    opacity: item.isCompletato ? 0.65 : 1,
                    border: item.hasRealDates ? "2px solid white" : undefined,
                }}
                title={`${item.name}: ${moment(item.start).format("DD/MM/YYYY")} → ${moment(item.end).format(
                    "DD/MM/YYYY"
                )}`}
                onClick={() => onSelect(item)}
            >
                <span className="truncate">{`${"— ".repeat(level)}${item.name}`}</span>
                <div className="flex ml-auto -space-x-2">
                    {item.assegnatari?.slice(0, 3).map((u, idx) => (
                        <img
                            key={`${item.id}-${u.id}-${idx}`}
                            src={u.avatar_url || "/default-avatar.png"}
                            className="w-5 h-5 rounded-full border border-white"
                            title={u.nome}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
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

    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const sensors = useSensors(useSensor(PointerSensor));

    /* utility: calcola start/end coerenti */
    function calcolaDate(item: any): { start: Date; end: Date; hasReal: boolean } {
        if (item.inizio_task && item.fine_task) {
            return { start: new Date(item.inizio_task), end: new Date(item.fine_task), hasReal: true };
        } else if (item.consegna) {
            return {
                start: new Date(item.created_at || new Date().toISOString()),
                end: new Date(item.consegna),
                hasReal: false,
            };
        } else {
            const start = new Date(item.created_at || new Date().toISOString());
            return { start, end: moment(start).add(7, "days").toDate(), hasReal: false };
        }
    }

    /* costruisce la gerarchia */
    function buildHierarchy(list: any[]): GanttItem[] {
        const map = new Map<string, GanttItem>();
        const roots: GanttItem[] = [];

        list.forEach((item: any, idx: number) => {
            const { start, end, hasReal } = calcolaDate(item);
            const coloreClass = TASK_COLORS[idx % TASK_COLORS.length];
            const gi: GanttItem = {
                id: String(item.id),
                name: item.nome,
                start,
                end,
                isTask: tipo === "tasks",
                isCompletato: tipo === "tasks" ? !!item.fine_task : !!item.fine_progetto,
                coloreClass,
                hasRealDates: hasReal,
                assegnatari: item.assegnatari
                    ? item.assegnatari.map((ut: any) => ({
                        id: ut.id,
                        nome: [ut.nome, ut.cognome].filter(Boolean).join(" "),
                        avatar_url: ut.avatar_url,
                    }))
                    : [],
                parentId: item.parent_id,
                children: [],
                __raw: item,
            };
            map.set(gi.id, gi);
        });

        map.forEach((gi) => {
            if (gi.parentId && map.has(gi.parentId)) {
                map.get(gi.parentId)!.children!.push(gi);
            } else {
                roots.push(gi);
            }
        });

        return roots;
    }

    /* prepara dati gantt */
    const ganttItems: GanttItem[] = useMemo(() => {
        return buildHierarchy(items);
    }, [items, tipo]);

    /* flatten per rendering */
    const flattenItems = (items: GanttItem[], level = 0): (GanttItem & { level: number })[] =>
        items.flatMap((it) => [{ ...it, level }, ...flattenItems(it.children || [], level + 1)]);
    const flatItems = flattenItems(ganttItems);

    useEffect(() => {
        console.log("Items dal DB:", items);
        console.log("Gantt gerarchico:", ganttItems);
        console.log("Flat items:", flatItems);
    }, [items, ganttItems, flatItems]);

    const handleDragEnd = (event: DragEndEvent) => {
        // per ora non facciamo ordinamento
        console.log("DragEnd:", event);
    };

    const minDate = useMemo(() => {
        return flatItems.length
            ? moment.min(flatItems.map((g) => moment(g.start))).toDate()
            : new Date();
    }, [flatItems]);

    const maxDate = useMemo(() => {
        return flatItems.length
            ? moment.max(flatItems.map((g) => moment(g.end))).toDate()
            : moment().add(1, "month").toDate();
    }, [flatItems]);

    const totalDays = moment(maxDate).diff(moment(minDate), "days") + 1;

    const timelineTicks = useMemo(() => {
        const ticks: Date[] = [];
        let cur = moment(minDate).startOf(viewMode);
        const end = moment(maxDate).endOf(viewMode);

        if (viewMode === "day") {
            while (cur.isSameOrBefore(end)) {
                ticks.push(cur.toDate());
                cur.add(1, "day");
            }
        } else if (viewMode === "week") {
            while (cur.isSameOrBefore(end)) {
                ticks.push(cur.toDate());
                cur.add(1, "week");
            }
        } else {
            while (cur.isSameOrBefore(end)) {
                ticks.push(cur.toDate());
                cur.add(1, "month");
            }
        }
        return ticks;
    }, [minDate, maxDate, viewMode]);

    const getBarStyle = useCallback(
        (item: GanttItem) => {
            const startOffset = moment(item.start).diff(moment(minDate), "days");
            const endOffset = moment(item.end).diff(moment(minDate), "days") + 1;
            const left = (startOffset / totalDays) * 100;
            const width = ((endOffset - startOffset) / totalDays) * 100;
            return { left: `${left}%`, width: `${width}%` };
        },
        [minDate, totalDays]
    );

    const handleSelect = (item: GanttItem) => {
        navigate(item.isTask ? `/tasks/${item.__raw.slug ?? item.id}` : `/progetti/${item.__raw.slug ?? item.id}`);
    };

    /* ------------------------------------------------------------------ */
    return (
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <IntestazioneLista
                tipo={tipo}
                titolo={cfg.titolo}
                icona={cfg.icona}
                coloreIcona={cfg.coloreIcona}
                onChange={() => { }}
                dati={cfg.useHeaderFilters ? items : undefined}
                paramKey={paramKey}
                modalitaCestino={modalitaCestino}
            />

            <div className="flex justify-center gap-2 mb-4">
                {(["day", "week", "month"] as ViewMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setViewMode(m)}
                        className={`px-3 py-1.5 text-sm rounded-lg border border-theme transition ${viewMode === m
                            ? "bg-blue-600 text-white border-blue-600 shadow"
                            : "bg-theme text-theme hover-bg-theme"
                            }`}
                    >
                        {m.toUpperCase()}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-center text-theme py-8">Caricamento…</p>
            ) : (
                <div className="card-theme flex hide-scrollbar" style={{ height: 650 }}>
                    {/* lista sinistra */}
                    <div className="w-80 border-r border-theme overflow-y-auto hide-scrollbar">
                        <div className="font-semibold text-sm px-4 py-2 border-b border-theme">Attività</div>
                        {flatItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-bg-theme"
                                onClick={() => handleSelect(item)}
                            >
                                <FontAwesomeIcon
                                    icon={item.isTask ? faTasks : faFolder}
                                    className={item.isTask ? "text-blue-500" : "text-purple-500"}
                                />
                                <div className="flex-1 truncate">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        {"— ".repeat(item.level)}
                                        {item.name}
                                        {item.isCompletato && (
                                            <FontAwesomeIcon icon={faCheckCircle} className="icon-success text-xs" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {moment(item.start).format("DD/MM")} → {moment(item.end).format("DD/MM")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* timeline */}
                    <div className="flex-1 relative overflow-x-auto ">
                        <div
                            className="sticky top-0 z-10 border-b border-theme bg-theme"
                            style={{
                                minWidth:
                                    viewMode === "day"
                                        ? `${timelineTicks.length * MIN_DAY_WIDTH}px`
                                        : viewMode === "week"
                                            ? `${timelineTicks.length * (MIN_DAY_WIDTH * 7)}px`
                                            : `${timelineTicks.length * (MIN_DAY_WIDTH * 30)}px`,
                            }}
                        >
                            {/* intestazioni timeline */}
                            <div className="flex border-b border-theme">
                                {timelineTicks.map((d, i) => (
                                    <div
                                        key={i}
                                        className="text-xs font-semibold text-center border-r border-theme flex-shrink-0"
                                        style={{
                                            width:
                                                viewMode === "day"
                                                    ? `${MIN_DAY_WIDTH}px`
                                                    : viewMode === "week"
                                                        ? `${MIN_DAY_WIDTH * 7}px`
                                                        : `${MIN_DAY_WIDTH * 30}px`,
                                        }}
                                    >
                                        {viewMode === "day"
                                            ? moment(d).format("DD/MM")
                                            : viewMode === "week"
                                                ? `Sett. ${moment(d).week()}`
                                                : moment(d).format("MMM YYYY")}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={flatItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                <div
                                    className="relative"
                                    style={{
                                        minWidth:
                                            viewMode === "day"
                                                ? `${timelineTicks.length * MIN_DAY_WIDTH}px`
                                                : viewMode === "week"
                                                    ? `${timelineTicks.length * (MIN_DAY_WIDTH * 7)}px`
                                                    : `${timelineTicks.length * (MIN_DAY_WIDTH * 30)}px`,
                                    }}
                                >
                                    {/* griglia */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="flex h-full">
                                            {timelineTicks.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="border-r border-theme flex-shrink-0"
                                                    style={{
                                                        width:
                                                            viewMode === "day"
                                                                ? `${MIN_DAY_WIDTH}px`
                                                                : viewMode === "week"
                                                                    ? `${MIN_DAY_WIDTH * 7}px`
                                                                    : `${MIN_DAY_WIDTH * 30}px`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {flatItems.map((item) => {
                                        const { left, width } = getBarStyle(item);
                                        return (
                                            <SortableRow
                                                key={item.id}
                                                item={item}
                                                left={left}
                                                width={width}
                                                level={item.level}
                                                onSelect={handleSelect}
                                            />
                                        );
                                    })}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            )}
        </div>
    );
}
