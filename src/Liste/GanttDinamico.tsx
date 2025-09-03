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
    arrayMove,
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
/* Tipi */
type GanttItem = {
    id: string;
    name: string;
    start: Date;
    end: Date;
    isTask: boolean;
    coloreClass: string;
    isCompletato: boolean;
    assegnatari?: { id: string; nome: string; avatar_url?: string | null }[];
    __raw: any;
};

type ViewMode = "day" | "week" | "month";

/* ------------------------------------------------------------------ */
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
/* Riga ordinabile */
function SortableRow({
    item,
    left,
    width,
    onSelect,
}: {
    item: GanttItem;
    left: string;
    width: string;
    onSelect: (item: GanttItem) => void;
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
                style={{ left, width, opacity: item.isCompletato ? 0.65 : 1 }}
                title={`${item.name}: ${moment(item.start).format("DD/MM/YYYY")} → ${moment(item.end).format("DD/MM/YYYY")}`}
                onClick={() => onSelect(item)}
            >
                <span className="truncate">{item.name}</span>
                <div className="flex ml-auto -space-x-2">
                    {item.assegnatari?.slice(0, 3).map((u) => (
                        <img
                            key={u.id}
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
/* Componente principale */
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

    const { items, loading, filtro, setFiltro } = useResourceData(cfg, { modalitaCestino });

    /* stato */
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const storageKey = `gantt-order-${tipo}`;
    const [orderedIds, setOrderedIds] = useState<string[]>([]);

    /* sensors dichiarati qui, non in JSX! */
    const sensors = useSensors(useSensor(PointerSensor));

    /* effetto iniziale per ordine salvato */
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) setOrderedIds(JSON.parse(saved));
    }, [storageKey]);

    /* filtro lato client */
    const filteredItems = useMemo(() => {
        return items.filter((it: any) => {
            if (filtro.soloCompletate) return !!it.fine_task;
            if (filtro.soloNonCompletate) return !it.fine_task;
            if (filtro.soloCompletati) return !!it.fine_progetto;
            if (filtro.soloNonCompletati) return !it.fine_progetto;
            return true;
        });
    }, [items, filtro]);

    /* prepara dati gantt */
    const ganttItems: GanttItem[] = useMemo(() => {
        return filteredItems.map((item: any, idx: number) => {
            const startISO = item.inizio_gantt || item.created_at || new Date().toISOString();
            const endISO =
                item.fine_gantt ||
                item.fine_task ||
                item.fine_progetto ||
                item.consegna ||
                moment(startISO).add(7, "days").toISOString();

            const isTask = tipo === "tasks" || item.fine_task !== undefined;
            const isCompletato = isTask ? !!item.fine_task : !!item.fine_progetto;
            const coloreClass = TASK_COLORS[idx % TASK_COLORS.length];

            return {
                id: String(item.id),
                name: item.nome,
                start: new Date(startISO),
                end: new Date(endISO),
                isTask,
                isCompletato,
                coloreClass,
                assegnatari: item.utenti_task
                    ? item.utenti_task.map((ut: any) => ({
                        id: ut.utente?.id,
                        nome: [ut.utente?.nome, ut.utente?.cognome].filter(Boolean).join(" "),
                        avatar_url: ut.utente?.avatar_url,
                    }))
                    : [],
                __raw: item,
            };
        });
    }, [filteredItems, tipo]);

    /* ordering */
    const orderedItems = useMemo(() => {
        if (orderedIds.length === 0) return ganttItems;
        const map = new Map(ganttItems.map((g) => [g.id, g]));
        return orderedIds.map((id) => map.get(id)).filter(Boolean) as GanttItem[];
    }, [ganttItems, orderedIds]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = orderedItems.findIndex((i) => i.id === active.id);
            const newIndex = orderedItems.findIndex((i) => i.id === over?.id);
            const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
            setOrderedIds(newOrder.map((i) => i.id));
            localStorage.setItem(storageKey, JSON.stringify(newOrder.map((i) => i.id)));
        }
    };

    /* range */
    const minDate = useMemo(() => {
        return ganttItems.length
            ? moment.min(ganttItems.map((g) => moment(g.start))).toDate()
            : new Date();
    }, [ganttItems]);

    const maxDate = useMemo(() => {
        return ganttItems.length
            ? moment.max(ganttItems.map((g) => moment(g.end))).toDate()
            : moment().add(1, "month").toDate();
    }, [ganttItems]);

    const totalDays = moment(maxDate).diff(moment(minDate), "days") + 1;

    /* ticks timeline */
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

    /* calcolo posizione barre */
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
                onChange={setFiltro}
                dati={cfg.useHeaderFilters ? items : undefined}
                paramKey={paramKey}
                modalitaCestino={modalitaCestino}
            />

            {/* controlli zoom */}
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
                        {orderedItems.map((item) => (
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
                        {/* header timeline */}
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
                            {/* riga superiore */}
                            <div className="flex border-b border-theme">
                                {timelineTicks.map((d, i) => {
                                    const label =
                                        viewMode === "day" || viewMode === "week"
                                            ? moment(d).format("MMM YYYY")
                                            : moment(d).format("YYYY");

                                    const sameAsPrev =
                                        i > 0 &&
                                        label ===
                                        (viewMode === "day" || viewMode === "week"
                                            ? moment(timelineTicks[i - 1]).format("MMM YYYY")
                                            : moment(timelineTicks[i - 1]).format("YYYY"));

                                    if (sameAsPrev) return null;

                                    let span = 1;
                                    for (let j = i + 1; j < timelineTicks.length; j++) {
                                        const nextLabel =
                                            viewMode === "day" || viewMode === "week"
                                                ? moment(timelineTicks[j]).format("MMM YYYY")
                                                : moment(timelineTicks[j]).format("YYYY");
                                        if (nextLabel === label) span++;
                                        else break;
                                    }

                                    return (
                                        <div
                                            key={i}
                                            className="text-xs font-semibold text-center border-r border-theme flex-shrink-0"
                                            style={{
                                                width:
                                                    viewMode === "day"
                                                        ? `${MIN_DAY_WIDTH * span}px`
                                                        : viewMode === "week"
                                                            ? `${(MIN_DAY_WIDTH * 7) * span}px`
                                                            : `${(MIN_DAY_WIDTH * 30) * span}px`,
                                            }}
                                        >
                                            {label}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* riga inferiore */}
                            <div className="flex">
                                {timelineTicks.map((d, i) => {
                                    const isWeekend = viewMode === "day" && (moment(d).day() === 0 || moment(d).day() === 6);
                                    return (
                                        <div
                                            key={i}
                                            className={`text-xs text-center border-r border-theme flex-shrink-0 ${isWeekend ? "bg-weekend" : ""}`}
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
                                                ? moment(d).format("DD")
                                                : viewMode === "week"
                                                    ? `${moment(d).format("DD/MM")} – ${moment(d).add(6, "days").format("DD/MM")}`
                                                    : moment(d).format("MMM")}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* righe items */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={orderedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
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

                                    {orderedItems.map((item) => {
                                        const { left, width } = getBarStyle(item);
                                        return <SortableRow key={item.id} item={item} left={left} width={width} onSelect={handleSelect} />;
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
