// src/Liste/BachecaDinamica.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { format, isToday, isTomorrow, isBefore, startOfDay, addDays } from "date-fns";
import { it } from "date-fns/locale";

import IntestazioneLista, { type FiltroIntestazione } from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey, type ResourceConfig } from "./resourceConfigs";

type Props = {
    tipo: ResourceKey;
    defaultGroupBy?: string;
    className?: string;
    emptyLabel?: string;
};

type KanbanColumn = { key: string; label: string };

type GroupByDef = {
    label?: string;
    staticColumns?: { key: string; label: string }[];
    getKey?: (item: any) => string;
    getLabel?: (key: string, item?: any) => string;
    getStaticColumns?: () => { key: string; label: string }[];
};

export default function BachecaDinamica({
    tipo,
    defaultGroupBy,
    className = "",
    emptyLabel = "Nessun elemento",
}: Props) {
    const cfg = resourceConfigs[tipo] as ResourceConfig<any> & {
        groupBy?: Record<string, GroupByDef>;
    };

    const navigate = useNavigate();

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroIntestazione>({});

    // groupBy senza dropdown (fisso: primo disponibile o builtin tasks)
    const [groupByKey, setGroupByKey] = useState<string | null>(null);

    // drag orizzontale
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeftStart = useRef(0);
    const [dragEnabled, setDragEnabled] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUtenteId(user?.id ?? null);
        });
    }, []);

    const hasConfigGroupBy = !!cfg?.groupBy && Object.keys(cfg.groupBy!).length > 0;

    // built-in per tasks se non c’è groupBy custom
    const builtinTaskGroupBy = useMemo<Record<string, GroupByDef> | null>(() => {
        if (tipo !== "tasks" || hasConfigGroupBy) return null;
        return {
            stato: {
                label: "Stato",
                getKey: (t) => String(t?.stato?.id ?? "Nessuno"),
                getLabel: (_k, t) => t?.stato?.nome ?? "Nessuno",
            },
            assegnatario: {
                label: "Assegnatario",
                getKey: (t) => {
                    const names = (t?.assegnatari ?? []).map((u: any) => u?.nome).filter(Boolean);
                    return names.length ? names[0] : "Non assegnata";
                },
                getLabel: (k) => k,
            },
            priorita: {
                label: "Priorità",
                getKey: (t) => t?.priorita?.nome ?? "Nessuna",
                getLabel: (k) => k,
            },
            scadenza: {
                label: "Data di scadenza",
                getKey: (t) => {
                    if (t?.stato?.nome?.toLowerCase() === "completato") return "completati";
                    if (!t?.consegna) return "senza";
                    const dataTask = startOfDay(new Date(t.consegna));
                    const oggi = startOfDay(new Date());
                    if (isBefore(dataTask, oggi)) return "scaduti";
                    if (isToday(dataTask)) return "oggi";
                    if (isTomorrow(dataTask)) return "domani";
                    let aggiunti = 0;
                    let giorno = addDays(oggi, 2);
                    while (aggiunti < 5) {
                        const dow = giorno.getDay();
                        if (dow !== 0 && dow !== 6) {
                            if (dataTask.getTime() === giorno.getTime()) {
                                return giorno.toISOString().split("T")[0];
                            }
                            aggiunti++;
                        }
                        giorno = addDays(giorno, 1);
                    }
                    return "futuri";
                },
                getStaticColumns: () => {
                    const oggi = startOfDay(new Date());
                    const cols: KanbanColumn[] = [
                        { key: "scaduti", label: "Scaduti" },
                        { key: "oggi", label: "Oggi" },
                        { key: "domani", label: "Domani" },
                    ];
                    let aggiunti = 0;
                    let giorno = addDays(oggi, 2);
                    while (aggiunti < 5) {
                        const dow = giorno.getDay();
                        if (dow !== 0 && dow !== 6) {
                            cols.push({
                                key: giorno.toISOString().split("T")[0],
                                label: format(giorno, "EEEE", { locale: it }),
                            });
                            aggiunti++;
                        }
                        giorno = addDays(giorno, 1);
                    }
                    cols.push({ key: "futuri", label: "Futuri" });
                    cols.push({ key: "senza", label: "Senza data" });
                    cols.push({ key: "completati", label: "Completati" });
                    return cols;
                },
            },
        };
    }, [tipo, hasConfigGroupBy]);

    // init groupBy (senza UI)
    useEffect(() => {
        if (hasConfigGroupBy) {
            const keys = Object.keys(cfg.groupBy!);
            const initial = defaultGroupBy && cfg.groupBy![defaultGroupBy] ? defaultGroupBy : keys[0];
            setGroupByKey(initial);
        } else if (builtinTaskGroupBy) {
            const initial = defaultGroupBy && builtinTaskGroupBy[defaultGroupBy] ? defaultGroupBy : "stato";
            setGroupByKey(initial);
        } else {
            setGroupByKey(null);
        }
    }, [tipo]);

    // fetch
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const fetched = (await cfg.fetch?.({ filtro: filtro ?? {}, utenteId })) ?? [];
                if (!alive) return;
                setItems(fetched as any[]);
            } catch (e) {
                console.error("BachecaDinamica fetch error:", e);
                if (!alive) return;
                setItems([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, JSON.stringify(filtro), utenteId]);

    // colonne
    const columns: KanbanColumn[] = useMemo(() => {
        if (!groupByKey) return [{ key: "all", label: "Tutti" }];

        if (hasConfigGroupBy) {
            const gb = cfg.groupBy![groupByKey];
            if (!gb) return [{ key: "all", label: "Tutti" }];
            if (Array.isArray(gb.staticColumns) && gb.staticColumns.length > 0) {
                return gb.staticColumns.map((c) => ({ key: String(c.key), label: String(c.label) }));
            }
            const keys = new Map<string, string>();
            for (const it of items) {
                const k = String(gb.getKey?.(it) ?? "Tutti");
                const lbl = String(gb.getLabel?.(k, it) ?? k);
                keys.set(k, lbl);
            }
            if (keys.size === 0) return [{ key: "all", label: "Tutti" }];
            return Array.from(keys.entries()).map(([key, label]) => ({ key, label }));
        }

        if (builtinTaskGroupBy) {
            const gb = builtinTaskGroupBy[groupByKey];
            if (!gb) return [{ key: "all", label: "Tutti" }];
            if (typeof gb.getStaticColumns === "function") return gb.getStaticColumns();
            const keys = new Map<string, string>();
            for (const it of items) {
                const k = String(gb.getKey?.(it) ?? "Tutti");
                const lbl = String(gb.getLabel?.(k, it) ?? k);
                keys.set(k, lbl);
            }
            if (keys.size === 0) return [{ key: "all", label: "Tutti" }];
            return Array.from(keys.entries()).map(([key, label]) => ({ key, label }));
        }

        return [{ key: "all", label: "Tutti" }];
    }, [cfg, items, groupByKey, hasConfigGroupBy, builtinTaskGroupBy]);

    // abilita drag orizzontale
    useEffect(() => {
        if (scrollRef.current) {
            const enabled = scrollRef.current.scrollWidth > scrollRef.current.clientWidth;
            setDragEnabled(enabled);
        }
    }, [columns, items]);

    // partizionamento
    const itemsByColumn = useMemo<Record<string, any[]>>(() => {
        const map: Record<string, any[]> = {};
        for (const col of columns) map[col.key] = [];

        if (!groupByKey) {
            map["all"] = items;
            return map;
        }

        if (hasConfigGroupBy) {
            const gb = cfg.groupBy![groupByKey];
            for (const it of items) {
                const k = String(gb?.getKey?.(it) ?? "all");
                if (!map[k]) map[k] = [];
                map[k].push(it);
            }
            return map;
        }

        if (builtinTaskGroupBy) {
            const gb = builtinTaskGroupBy[groupByKey];
            for (const it of items) {
                const k = String(gb?.getKey?.(it) ?? "all");
                if (!map[k]) map[k] = [];
                map[k].push(it);
            }
            return map;
        }

        map["all"] = items;
        return map;
    }, [items, columns, groupByKey, hasConfigGroupBy, cfg, builtinTaskGroupBy]);

    // ctx condiviso per i renderer del config
    const ctx = { filtro, setFiltro, items, utenteId, navigate };

    // ---- Renderer card: usa card/renderCard, poi riga; NO JSON fallback ----
    const renderGenericCard = (item: any) => {
        // usa le colonne per mostrare titolo + 3 dettagli max
        const cols = Array.isArray((cfg as any).colonne) ? (cfg as any).colonne : [];
        const [titleCol, ...rest] = cols as {
            chiave: string;
            label: string;
            render?: (it: any, ctx: any) => any;
            className?: string;
        }[];

        const renderCell = (col: any) =>
            col.render ? col.render(item, ctx) : (item?.[col.chiave] ?? "—");

        return (
            <div className="bg-theme border border-gray-200 dark:border-gray-600 p-3 rounded-xl shadow-sm hover:shadow-md transition">
                {titleCol ? (
                    <div className="font-semibold text-theme mb-2 text-sm">
                        {renderCell(titleCol)}
                    </div>
                ) : null}

                <div className="text-xs space-y-1">
                    {rest.slice(0, 3).map((col) => (
                        <div key={String(col.chiave)} className="flex gap-2">
                            <span className="opacity-70 min-w-[84px]">{col.label}:</span>
                            <div className="flex-1">{renderCell(col)}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCard = (item: any) => {
        if (typeof (cfg as any).card === "function") return (cfg as any).card(item, ctx);
        if (typeof (cfg as any).renderCard === "function") return (cfg as any).renderCard(item, ctx);
        if (typeof (cfg as any).riga === "function")
            return (
                <div className="bg-theme border border-gray-200 dark:border-gray-600 p-3 rounded-xl shadow-sm hover:shadow-md transition">
                    {(cfg as any).riga(item, ctx)}
                </div>
            );
        // fallback elegante (mai JSON)
        return renderGenericCard(item);
    };

    // header (senza dropdown “Visualizza per”)
    const headerTitle = cfg?.titolo ?? "📋 Bacheca";

    const colAccent = (i: number) =>
        [
            "border-t-blue-500",
            "border-t-emerald-500",
            "border-t-amber-500",
            "border-t-fuchsia-500",
            "border-t-cyan-500",
            "border-t-rose-500",
        ][i % 6];

    const countBadge = (n: number) => (
        <span className="ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-2 py-0.5 bg-gray-900/10 dark:bg-white/10">
            {n}
        </span>
    );

    return (
        <div className={`p-4 sm:p-6 max-w-7xl mx-auto w-full ${className}`}>
            <IntestazioneLista
                titolo={headerTitle}
                icona={cfg.icona}
                coloreIcona={cfg.coloreIcona}
                tipo={tipo}
                dati={cfg.useHeaderFilters ? items : undefined}
                onChange={cfg.useHeaderFilters ? setFiltro : undefined}
            />

            <div
                ref={scrollRef}
                className={`flex gap-4 overflow-x-auto hide-scrollbar ${dragEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    }`}
                onMouseDown={(e) => {
                    if (!dragEnabled) return;
                    isDragging.current = true;
                    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
                    scrollLeftStart.current = scrollRef.current?.scrollLeft ?? 0;
                }}
                onMouseLeave={() => (isDragging.current = false)}
                onMouseUp={() => (isDragging.current = false)}
                onMouseMove={(e) => {
                    if (!isDragging.current || !dragEnabled) return;
                    e.preventDefault();
                    const x = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
                    const walk = (x - startX.current) * 1;
                    if (scrollRef.current) {
                        scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
                    }
                }}
                onWheel={(e) => {
                    if (!scrollRef.current) return;
                    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                        scrollRef.current.scrollLeft += e.deltaY;
                    }
                }}
            >
                {columns.map((col, idx) => {
                    const list = itemsByColumn[col.key] ?? [];
                    return (
                        <div
                            key={col.key}
                            className={`min-w-[18rem] w-80 card-theme flex-shrink-0 border-t-4 ${colAccent(
                                idx
                            )} rounded-2xl overflow-hidden`}
                        >
                            <div className="sticky top-0 z-10 bg-gray-100/80 dark:bg-gray-800/70 backdrop-blur px-3 py-2 font-semibold text-sm text-gray-700 dark:text-gray-200 flex items-center">
                                <span className="truncate">{col.label}</span>
                                {countBadge(list.length)}
                            </div>

                            <div className="p-2 space-y-3 max-h-[70vh] overflow-y-auto">
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-20 rounded-xl bg-gray-200/70 dark:bg-gray-700/50 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : list.length === 0 ? (
                                    <div className="text-xs text-gray-500 italic px-2 py-3 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                                        {emptyLabel}
                                    </div>
                                ) : (
                                    list.map((item: any, i: number) => (
                                        <div key={item?.id ?? i} className="transition-transform hover:-translate-y-0.5">
                                            {renderCard(item)}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
