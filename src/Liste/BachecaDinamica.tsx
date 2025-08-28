// src/Liste/BachecaDinamica.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";

import IntestazioneLista from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type {
    FiltroIntestazione,
    ResourceConfig,
    GroupByDef,
    KanbanColumn,
} from "./typesLista";

type AnyItem = any;

export default function BachecaDinamica({
    tipo,
    defaultGroupBy,
    className = "",
    emptyLabel = "Nessun elemento",
    paramKey = "view",
}: {
    tipo: ResourceKey;
    defaultGroupBy?: string;
    className?: string;
    emptyLabel?: string;
    paramKey?: string;
}) {
    // tipizzo esplicitamente groupBy per evitare 'never'
    const cfg = resourceConfigs[tipo] as ResourceConfig<AnyItem> & {
        groupBy?: Record<string, GroupByDef>;
    };

    const navigate = useNavigate();

    const [items, setItems] = useState<AnyItem[]>([]);
    const patchItem = (id: string | number, patch: Partial<AnyItem>) => {
        setItems((prev) =>
            prev.map((it) => (String(it.id) === String(id) ? { ...it, ...patch } : it))
        );
    };

    const [loading, setLoading] = useState(true);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroIntestazione>({});

    // groupBy solo se definito in config
    const hasGroupBy = !!cfg?.groupBy && Object.keys(cfg.groupBy!).length > 0;
    const [groupByKey, setGroupByKey] = useState<string | null>(null);

    const setupResult = useMemo(
        () => (cfg.setup ? cfg.setup({ utenteId }) : { extra: undefined }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cfg, utenteId]
    );

    useEffect(() => {
        return () => {
            setupResult?.dispose?.();
        };
    }, [setupResult]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) =>
            setUtenteId(user?.id ?? null)
        );
    }, []);

    useEffect(() => {
        if (!hasGroupBy) {
            setGroupByKey(null);
            return;
        }
        const keys = Object.keys(cfg.groupBy!);
        const initial =
            defaultGroupBy && cfg.groupBy![defaultGroupBy] ? defaultGroupBy : keys[0];
        setGroupByKey(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, hasGroupBy]);

    // fetch demandato alla config, con tipizzazione sicura
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const data = (await (cfg.fetch
                    ? cfg.fetch({ filtro: filtro ?? {}, utenteId })
                    : Promise.resolve([]))) as AnyItem[];
                if (!alive) return;
                setItems(Array.isArray(data) ? data : []);
            } catch {
                if (!alive) return;
                setItems([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, JSON.stringify(filtro), utenteId]);

    // colonne della bacheca dal groupBy (solo se definito in config)
    const columns: KanbanColumn[] = useMemo(() => {
        if (!hasGroupBy || !groupByKey) return [{ key: "all", label: "Tutti" }];

        const gb = (cfg.groupBy as Record<string, GroupByDef>)[groupByKey];
        if (!gb) return [{ key: "all", label: "Tutti" }];

        // normalizzo staticColumns: può essere array o funzione
        type StaticDef = KanbanColumn[] | ((items: AnyItem[]) => KanbanColumn[]);
        const staticDef = gb.staticColumns as StaticDef | undefined;

        let staticCols: KanbanColumn[] | null = null;
        if (Array.isArray(staticDef)) {
            staticCols = staticDef;
        } else if (typeof staticDef === "function") {
            staticCols = staticDef(items);
        }

        if (staticCols && staticCols.length > 0) {
            return staticCols.map((c: KanbanColumn) => ({
                key: String(c.key),
                label: String(c.label),
            }));
        }

        // generazione dinamica da getKey/getLabel
        const keys = new Map<string, string>();
        for (const it of items) {
            const k = String(gb.getKey?.(it) ?? "Tutti");
            const lbl = String(gb.getLabel?.(k, it) ?? k);
            keys.set(k, lbl);
        }
        if (keys.size === 0) return [{ key: "all", label: "Tutti" }];
        return Array.from(keys.entries()).map(([key, label]) => ({ key, label }));
    }, [cfg, items, groupByKey, hasGroupBy]);

    // partizionamento items per colonna
    const itemsByColumn = useMemo<Record<string, AnyItem[]>>(() => {
        const map: Record<string, AnyItem[]> = {};
        for (const col of columns) map[col.key] = [];

        if (!hasGroupBy || !groupByKey) {
            map["all"] = items;
            return map;
        }

        const gb = (cfg.groupBy as Record<string, GroupByDef>)[groupByKey];
        for (const it of items) {
            const k = String(gb?.getKey?.(it) ?? "all");
            if (!map[k]) map[k] = [];
            map[k].push(it);
        }
        return map;
    }, [items, columns, hasGroupBy, groupByKey, cfg]);

    // ctx passato ai renderer della config
    const ctx = {
        filtro,
        setFiltro,
        items,
        utenteId,
        navigate,
        patchItem,
        extra: setupResult.extra,
    };

    // fallback card generica basata sulle colonne
    const renderGenericCard = (item: AnyItem) => {
        const cols = Array.isArray((cfg as any).colonne) ? (cfg as any).colonne : [];
        const [titleCol, ...rest] = cols as {
            chiave: string;
            label: string;
            render?: (it: AnyItem, ctx: any) => any;
            className?: string;
        }[];

        const renderCell = (col: any) =>
            col.render ? col.render(item, ctx) : item?.[col.chiave] ?? "—";

        return (
            <div className="bg-theme border border-gray-200 dark:border-gray-600 p-3 rounded-xl shadow-sm hover:shadow-md transition">
                {titleCol ? (
                    <div className="font-semibold text-theme mb-2 text-sm">{renderCell(titleCol)}</div>
                ) : null}
                <div className="text-xs space-y-1">
                    {rest.slice(0, 3).map((col: any) => (
                        <div key={String(col.chiave)} className="flex gap-2">
                            <span className="opacity-70 min-w-[84px]">{col.label}:</span>
                            <div className="flex-1">{renderCell(col)}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCard = (item: AnyItem) => {
        if (typeof (cfg as any).card === "function") return (cfg as any).card(item, ctx);
        if (typeof (cfg as any).renderCard === "function")
            return (cfg as any).renderCard(item, ctx);
        if (typeof (cfg as any).riga === "function")
            return (
                <div className="bg-theme border border-gray-200 dark:border-gray-600 p-3 rounded-xl shadow-sm hover:shadow-md transition">
                    {(cfg as any).riga(item, ctx)}
                </div>
            );
        return renderGenericCard(item);
    };

    // drag orizzontale
    const scrollRef = useRef<HTMLDivElement>(null);
    const [dragEnabled, setDragEnabled] = useState(false);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeftStart = useRef(0);

    useEffect(() => {
        if (scrollRef.current) {
            const enabled =
                scrollRef.current.scrollWidth > scrollRef.current.clientWidth;
            setDragEnabled(enabled);
        }
    }, [columns, items]);

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
        <span className="ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-2 py-0.5 bg-gray-900/10 dark:bg:white/10">
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
                paramKey={paramKey}
                dati={cfg.useHeaderFilters ? items : undefined}
                onChange={cfg.useHeaderFilters ? setFiltro : undefined}
                azioniExtra={cfg.azioniExtra}   // 👈 aggiunto
            />


            <div
                ref={scrollRef}
                className={`flex gap-4 overflow-x-auto hide-scrollbar ${dragEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    }`}
                onMouseDown={(e) => {
                    if (!dragEnabled || !scrollRef.current) return;
                    isDragging.current = true;
                    startX.current = e.pageX - scrollRef.current.offsetLeft;
                    scrollLeftStart.current = scrollRef.current.scrollLeft;
                }}
                onMouseLeave={() => (isDragging.current = false)}
                onMouseUp={() => (isDragging.current = false)}
                onMouseMove={(e) => {
                    if (!isDragging.current || !dragEnabled || !scrollRef.current) return;
                    e.preventDefault();
                    const x = e.pageX - scrollRef.current.offsetLeft;
                    const walk = (x - startX.current) * 1;
                    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
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
                                    list.map((item: AnyItem, i: number) => (
                                        <div
                                            key={item?.id ?? i}
                                            className="transition-transform hover:-translate-y-0.5"
                                        >
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
