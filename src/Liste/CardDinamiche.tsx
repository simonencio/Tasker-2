// src/Liste/CardDinamiche.tsx
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faUndo, faTrash } from "@fortawesome/free-solid-svg-icons";

import IntestazioneLista from "./IntestazioneLista";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type { ResourceRenderCtx, ResourceConfig } from "./typesLista";
import { useResourceData } from "./useResourceData";

export default function CardDinamiche<T extends { id: string | number }>({
    tipo,
    modalitaCestino = false,
    paramKey = "view",
}: {
    tipo: ResourceKey;
    modalitaCestino?: boolean;
    paramKey?: string;
}) {
    const navigate = useNavigate();
    const configAny = resourceConfigs[tipo] as any;
    if (!configAny) return <p className="text-danger">Config non trovata per tipo: {tipo}</p>;
    const config = configAny as ResourceConfig<T>;

    const {
        utenteId,
        items,
        loading,
        filtro,
        setFiltro,
        patchItem,
        removeItem,
        addItem,
    } = useResourceData(config, { modalitaCestino });

    const filteredItems = items.filter((item: any) => {
        if (filtro.soloCompletate) return !!item.fine_task;
        if (filtro.soloNonCompletate) return !item.fine_task;
        if (filtro.soloCompletati) return !!item.fine_progetto;
        if (filtro.soloNonCompletati) return !item.fine_progetto;
        return true;
    });

    const ctx: ResourceRenderCtx<T> = {
        filtro,
        setFiltro,
        items,
        utenteId,
        navigate,
        patchItem,
        removeItem,
        addItem,
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

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <IntestazioneLista
                titolo={headerTitle}
                icona={config.icona}
                coloreIcona={config.coloreIcona}
                tipo={tipo}
                paramKey={paramKey}
                modalitaCestino={modalitaCestino}
                dati={config.useHeaderFilters ? items : undefined}
                onChange={config.useHeaderFilters ? setFiltro : undefined}
                azioniExtra={config.azioniExtra}
            />

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => (
                        <div
                            key={String(item.id)}
                            className="card-theme p-4 flex flex-col justify-between"
                        >
                            <div className="flex-1 space-y-2">
                                {/* colonne principali */}
                                {config.colonne.map((col) => (
                                    <div key={String(col.chiave)} className="text-sm text-theme">
                                        {col.render
                                            ? col.render(item, ctx)
                                            : (item as any)[col.chiave as keyof T]}
                                    </div>
                                ))}

                                {/* dettaglio coerente */}
                                {config.renderDettaglio && (
                                    <div className="mt-2 text-xs text-theme opacity-80">
                                        {config.renderDettaglio(item, ctx)}
                                    </div>
                                )}
                            </div>

                            {/* azioni */}
                            <div
                                className={`mt-3 flex items-center ${modalitaCestino ? "justify-between" : "justify-end gap-3"
                                    }`}
                            >
                                {modalitaCestino && config.cestino ? (
                                    <>
                                        <button
                                            onClick={() => handleRestore(item.id)}
                                            className="icon-color hover:icon-success"
                                            title="Ripristina"
                                        >
                                            <FontAwesomeIcon icon={faUndo} />
                                        </button>
                                        <button
                                            onClick={() => handleHardDelete(item.id)}
                                            className="icon-color hover:icon-danger"
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
                                                    config.renderModaleModifica?.(
                                                        String(item.id),
                                                        () => { }
                                                    )
                                                }
                                                className="icon-color hover:icon-info"
                                                title="Modifica"
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
