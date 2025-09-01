// src/Liste/ListaDinamica.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faUndo, faTrash } from "@fortawesome/free-solid-svg-icons";

import IntestazioneLista from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type { ResourceRenderCtx, ResourceConfig } from "./typesLista";
import { useResourceData } from "./useResourceData";

export default function ListaDinamica<T extends { id: string | number }>({
    tipo,
    modalitaCestino = false,
    paramKey = "view",
    configOverride,
}: {
    tipo: ResourceKey;
    modalitaCestino?: boolean;
    paramKey?: string;
    configOverride?: ResourceConfig<any>;
}) {
    const navigate = useNavigate();
    const configAny = configOverride ?? (resourceConfigs[tipo] as any);
    if (!configAny) return <p className="text-red-600">Config non trovata per tipo: {tipo}</p>;
    const config = configAny as ResourceConfig<T>;

    const { utenteId, items, loading, filtro, setFiltro, patchItem, removeItem } = useResourceData(
        config,
        { modalitaCestino }
    );

    // 👇 extra dallo setup
    const [extra, setExtra] = useState<any>(null);
    const disposeRef = useRef<null | (() => void)>(null);

    useEffect(() => {
        if (config.setup) {
            const res = config.setup({ utenteId });
            setExtra(res.extra ?? null);
            disposeRef.current = res.dispose ?? null;
        }
        return () => {
            if (disposeRef.current) {
                disposeRef.current();
                disposeRef.current = null;
            }
        };
    }, [config, utenteId]);

    const ctx: ResourceRenderCtx<T> = {
        filtro,
        setFiltro,
        items,
        utenteId,
        navigate,
        patchItem,
        removeItem,
        addItem: () => { },
        extra, // 👈 adesso c’è
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
        removeItem(id);
    };

    const [expandedId, setExpandedId] = useState<string | number | null>(null);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <IntestazioneLista
                titolo={headerTitle}
                icona={config.icona}
                coloreIcona={config.coloreIcona}
                tipo={tipo}
                paramKey={paramKey}
                azioniExtra={!modalitaCestino ? config.azioniExtra : undefined}
                modalitaCestino={modalitaCestino}
                dati={config.useHeaderFilters ? items : undefined}
                onChange={config.useHeaderFilters ? setFiltro : undefined}
            />

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-7xl mx-auto">
                    {/* intestazione tabella */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        {config.colonne.map(col => (
                            <div key={String(col.chiave)} className={col.className ?? "flex-1"}>
                                {col.label}
                            </div>
                        ))}
                        <div className="w-36 text-center">Azioni</div>
                    </div>

                    {/* righe */}
                    {items.map(item => {
                        const isExpanded = expandedId === item.id;
                        return (
                            <div
                                key={String(item.id)}
                                className="border-t border-gray-200 dark:border-gray-700"
                            >
                                {/* riga principale */}
                                <div
                                    className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer hover-bg-theme"
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                >
                                    {config.colonne.map(col => (
                                        <div key={String(col.chiave)} className={col.className ?? "flex-1"}>
                                            {col.render ? col.render(item, ctx) : (item as any)[col.chiave as keyof T]}
                                        </div>
                                    ))}

                                    {/* azioni */}
                                    <div
                                        className={`w-36 flex items-center shrink-0 ${modalitaCestino ? "justify-center gap-3" : "justify-end gap-3"
                                            }`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {modalitaCestino && config.cestino ? (
                                            <>
                                                <button
                                                    onClick={() => handleRestore(item.id)}
                                                    className="icon-color hover:text-green-600"
                                                    title="Ripristina"
                                                >
                                                    <FontAwesomeIcon icon={faUndo} />
                                                </button>
                                                <button
                                                    onClick={() => handleHardDelete(item.id)}
                                                    className="icon-color hover:text-red-600"
                                                    title="Elimina definitivamente"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {config.azioni?.(item, ctx)}
                                                {config.renderModaleModifica && (
                                                    <button
                                                        onClick={() =>
                                                            config.renderModaleModifica?.(String(item.id), () => { })
                                                        }
                                                        className="icon-color hover:text-blue-600"
                                                        title="Modifica"
                                                    >
                                                        <FontAwesomeIcon icon={faPen} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* dettaglio espanso */}
                                {isExpanded && config.renderDettaglio && (
                                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 text-sm">
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
