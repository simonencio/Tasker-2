import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { azioni, listenResourceEvents } from "./config/azioniConfig";

import IntestazioneLista from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type { ResourceRenderCtx, ResourceConfig } from "./typesLista";
import { useResourceData } from "./useResourceData";
import { supabase } from "../supporto/supabaseClient";

export default function ListaDinamica<T extends { id: string | number }>({
    tipo,
    modalitaCestino = false,
    paramKey,
    configOverride,
    hideHeader = false,
    minimalHeader = false,
    forcedFilter,
}: {
    tipo: ResourceKey;
    modalitaCestino?: boolean;
    paramKey?: string;
    configOverride?: ResourceConfig<any>;
    hideHeader?: boolean;
    minimalHeader?: boolean;
    forcedFilter?: Record<string, any>;
}) {
    const navigate = useNavigate();
    const configAny = configOverride ?? (resourceConfigs[tipo] as any);
    if (!configAny) {
        return <p className="text-red-600">Config non trovata per tipo: {tipo}</p>;
    }
    const config = configAny as ResourceConfig<T>;

    // 👇 includo addItem
    const {
        utenteId,
        items,
        loading,
        filtro,
        setFiltro,
        patchItem,
        removeItem,
        addItem,
    } = useResourceData(config, { modalitaCestino, paramKey });

    // Filtri visivi locali
    const filteredItems = items.filter((item: any) => {
        if (filtro.soloCompletate) return !!item.fine_task;
        if (filtro.soloNonCompletate) return !item.fine_task;
        if (filtro.soloCompletati) return !!item.fine_progetto;
        if (filtro.soloNonCompletati) return !item.fine_progetto;
        return true;
    });

    const [extra, setExtra] = useState<any>(null);
    const disposeRef = useRef<null | (() => void)>(null);

    // Refs anti-closure per realtime
    const itemsRef = useRef<any[]>(filteredItems);
    useEffect(() => {
        itemsRef.current = filteredItems;
    }, [filteredItems]);

    const filtroRef = useRef<any>(filtro);
    useEffect(() => {
        filtroRef.current = filtro;
    }, [filtro]);

    const forcedFilterRef = useRef<Record<string, any> | undefined>(forcedFilter);
    useEffect(() => {
        forcedFilterRef.current = forcedFilter;
    }, [forcedFilter]);

    // Helper progetto
    function getTaskProjectId(row: any): string | null {
        if (!row) return null;
        if (row.progetto_id != null) return row.progetto_id;
        if (row.progetto?.id != null) return row.progetto.id;
        return null;
    }

    function matchesForcedFilter(row: any, ff?: Record<string, any>): boolean {
        if (!ff) return true;
        if (ff.progetto) {
            const p = getTaskProjectId(row);
            if (String(p ?? "") !== String(ff.progetto)) return false;
        }
        return true;
    }

    function passesLocalFilters(row: any, f: any): boolean {
        if (!f) return true;
        if (f.soloCompletate) return !!row.fine_task;
        if (f.soloNonCompletate) return !row.fine_task;
        if (f.soloCompletati) return !!row.fine_progetto;
        if (f.soloNonCompletati) return !row.fine_progetto;
        return true;
    }

    // setup config + eventi locali
    useEffect(() => {
        if (config.setup) {
            const res = config.setup({ utenteId });
            setExtra(res.extra ?? null);
            disposeRef.current = res.dispose ?? null;
        }

        const unlisten = listenResourceEvents(tipo, (tipoEvento, payload) => {
            if (tipoEvento === "remove") {
                removeItem(payload);
            } else if (tipoEvento === "update") {
                patchItem(payload.id, payload);
            } else if (tipoEvento === "replace") {
                const item = payload?.item;
                if (!item) return;
                if (!matchesForcedFilter(item, forcedFilterRef.current)) {
                    removeItem(item.id);
                } else {
                    patchItem(item.id, item);
                }
            } else if (tipoEvento === "add" && payload?.item) {
                addItem(payload.item);
            }
        });

        return () => {
            if (disposeRef.current) {
                disposeRef.current();
                disposeRef.current = null;
            }
            unlisten();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, utenteId, tipo]);

    const ctx: ResourceRenderCtx<T> = {
        filtro,
        setFiltro,
        items,
        utenteId,
        navigate,
        patchItem,
        removeItem,
        addItem,
        extra,
    };

    const headerTitle =
        modalitaCestino && typeof config.titolo === "string"
            ? `Cestino – ${config.titolo.replace(/^Lista\s+/i, "")}`
            : config.titolo;

    const handleRestore = async (id: string | number) => {
        if (!config.cestino?.actions?.restore) return;
        await config.cestino.actions.restore(id);
        removeItem(id);
    };

    const handleHardDelete = async (id: string | number) => {
        if (!config.cestino?.actions?.hardDelete) return;
        if (!window.confirm("Eliminazione definitiva. Continuare?")) return;
        await config.cestino.actions.hardDelete(id);
        if (!modalitaCestino) removeItem(id);
    };

    const [expandedId, setExpandedId] = useState<string | number | null>(null);

    // ———————— REALTIME: tasks & tasks_sub (INSERT/UPDATE/DELETE) ——————————
    useEffect(() => {
        if (tipo !== "tasks" && tipo !== "tasks_sub") return;

        const ch = supabase
            .channel(`lista:${tipo}:tasks`)
            // INSERT
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "tasks" },
                (payload) => {
                    const row = payload.new as any;
                    if (tipo === "tasks_sub" && paramKey) {
                        if (String(row.parent_id) !== String(paramKey)) return;
                    }
                    if (!matchesForcedFilter(row, forcedFilterRef.current)) return;
                    if (!passesLocalFilters(row, filtroRef.current)) return;
                    addItem(row as any);
                }
            )
            // UPDATE
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "tasks" },
                (payload) => {
                    const row = payload.new as any;
                    const current = itemsRef.current.find(
                        (x: any) => String(x.id) === String(row.id)
                    );
                    const inList = !!current;
                    if (inList) {
                        if (!matchesForcedFilter(row, forcedFilterRef.current)) {
                            removeItem(row.id);
                            return;
                        }
                        if (!passesLocalFilters(row, filtroRef.current)) {
                            removeItem(row.id);
                            return;
                        }
                        patchItem(row.id, row);
                    }
                }
            )
            // DELETE
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "tasks" },
                (payload) => {
                    const id = (payload.old as any)?.id;
                    if (id) removeItem(id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [tipo, paramKey, removeItem, patchItem, addItem]);

    // ———————— REALTIME: progetti_task (solo per tasks normali) ——————————
    useEffect(() => {
        if (tipo !== "tasks") return;
        if (!forcedFilterRef.current?.progetto) return;

        const ch = supabase
            .channel(`lista:${tipo}:progetti_task`)
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "progetti_task" },
                (payload) => {
                    const oldRow = payload.old as any;
                    const forcedProj = String(forcedFilterRef.current!.progetto);
                    if (String(oldRow?.progetti_id) === forcedProj) {
                        const taskId = oldRow?.task_id;
                        if (taskId) removeItem(taskId);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [tipo, removeItem]);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {!hideHeader && (
                <IntestazioneLista
                    titolo={headerTitle}
                    icona={config.icona}
                    coloreIcona={config.coloreIcona}
                    tipo={tipo}
                    paramKey={paramKey}
                    minimal={minimalHeader}
                    azioniExtra={!modalitaCestino ? config.azioniExtra : undefined}
                    modalitaCestino={modalitaCestino}
                    dati={config.useHeaderFilters ? items : undefined}
                    onChange={config.useHeaderFilters ? setFiltro : undefined}
                />
            )}

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-7xl mx-auto">
                    {/* intestazione tabella */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-theme">
                        {config.colonne.map((col) => (
                            <div
                                key={String(col.chiave)}
                                className={col.className ?? "flex-1"}
                            >
                                {col.label}
                            </div>
                        ))}
                        <div className="w-36 text-center">Azioni</div>
                    </div>

                    {/* righe */}
                    {filteredItems.map((item) => {
                        const isExpanded = expandedId === item.id;
                        return (
                            <div key={String(item.id)} className="border-t border-theme">
                                <div
                                    className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer hover-bg-theme"
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                >
                                    {config.colonne.map((col) => (
                                        <div
                                            key={String(col.chiave)}
                                            className={col.className ?? "flex-1"}
                                        >
                                            {col.render
                                                ? col.render(item, ctx)
                                                : (item as any)[col.chiave as keyof T]}
                                        </div>
                                    ))}

                                    <div
                                        className="w-36 flex items-center justify-center gap-3 shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {modalitaCestino && config.cestino ? (
                                            <>
                                                {azioni.restore(() => handleRestore(item.id))}
                                                {azioni.trashHard(() => handleHardDelete(item.id))}
                                            </>
                                        ) : (
                                            <>
                                                {config.azioni?.(item, ctx)}
                                                {config.renderModaleModifica && (
                                                    azioni.edit(() =>
                                                        config.renderModaleModifica?.(
                                                            String(item.id),
                                                            () => { }
                                                        )
                                                    )
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && config.renderDettaglio && (
                                    <div className="px-6 py-4 bg-theme text-sm">
                                        {config.renderDettaglio(item, ctx)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
