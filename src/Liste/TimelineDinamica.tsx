// src/Liste/TimelineDinamica.tsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { resourceConfigs, type ResourceKey } from "./resourceConfigs";
import type { ResourceRenderCtx, ResourceConfig } from "./typesLista";
import { useResourceData } from "./useResourceData";
import IntestazioneLista from "./IntestazioneLista";
import { ordinaClientSide } from "../supporto/FiltriGenericiAvanzati";

export default function TimelineDinamica<T extends { id: string | number }>({
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
    if (!cfgAny) {
        return <p className="text-red-600">Config non trovata per tipo: {tipo}</p>;
    }
    const cfg = cfgAny as ResourceConfig<T>;

    const {
        utenteId,
        items,
        loading,
        filtro,
        setFiltro,
        patchItem,
        removeItem,
        addItem,
    } = useResourceData(cfg, { modalitaCestino });

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

    const criterio = filtro.ordine ?? null;

    const sorted = ordinaClientSide(items, criterio, (item: any, criterio: string) => {
        switch (criterio) {
            case "consegna_asc":
            case "consegna_desc":
                return item.consegna ?? null;

            case "priorita_urgente":
            case "priorita_meno_urgente":
                return item.priorita?.id ?? null;

            case "stato_az":
            case "stato_za":
                return item.stato?.nome ?? "";

            case "nome_az":
            case "nome_za":
                return item.nome ?? "";

            default:
                return null;
        }
    });


    return (
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
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

            {loading ? (
                <p className="text-center text-theme py-8">Caricamento…</p>
            ) : (
                <div className="relative border-l border-gray-300 dark:border-gray-600 ml-4 mt-6">
                    {sorted.map((item, idx) => {
                        const date = item && (item as any).consegna
                            ? format(new Date((item as any).consegna), "dd MMM yyyy")
                            : "—";

                        return (
                            <motion.div
                                key={String(item.id)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="mb-10 ml-6 relative"
                            >
                                {/* Punto della timeline */}
                                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs shadow">
                                    {idx + 1}
                                </span>

                                {/* Card elemento */}
                                <div
                                    className="bg-theme border border-gray-200 dark:border-gray-600 p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
                                    onClick={() =>
                                        navigate(`/${tipo}/${(item as any).slug ?? item.id}`)
                                    }
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">
                                            {cfg.colonne[0]?.render?.(item, ctx) ??
                                                (item as any).nome}
                                        </p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            📅 {date}
                                        </span>
                                    </div>

                                    {cfg.renderDettaglio && (
                                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                            {cfg.renderDettaglio(item, ctx)}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
