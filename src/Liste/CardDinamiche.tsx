import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faUndo, faTrash } from "@fortawesome/free-solid-svg-icons";

import IntestazioneLista, { type FiltroIntestazione } from "./IntestazioneLista";
import { supabase } from "../supporto/supabaseClient";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";

type ResourceRenderCtx<T> = {
    filtro: FiltroIntestazione;
    setFiltro: (f: FiltroIntestazione) => void;
    items: T[];
    utenteId: string | null;
    navigate: ReturnType<typeof useNavigate>;
    extra?: any;
};

type Props = {
    tipo: ResourceKey;
    modalitaCestino?: boolean;
};

export default function CardDinamiche<T extends { id: string | number }>({
    tipo,
    modalitaCestino = false,
}: Props) {
    const navigate = useNavigate();
    const configAny = resourceConfigs[tipo] as any;
    if (!configAny) {
        return <p className="text-red-600">Config non trovata per tipo: {tipo}</p>;
    }

    const config = configAny as {
        titolo: string | JSX.Element;
        icona: any;
        coloreIcona: string;
        fetch: (args: { filtro: FiltroIntestazione; utenteId: string | null }) => Promise<T[]>;
        useHeaderFilters?: boolean;
        colonne: {
            chiave: keyof T | string;
            label: string;
            render?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element | string | null;
        }[];
        azioni?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element;
        renderDettaglio?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element | null;
        renderModaleModifica?: (id: string, onClose: () => void) => JSX.Element;
        cestino?: {
            fetch: (args: { filtro: FiltroIntestazione; utenteId: string | null }) => Promise<T[]>;
            actions: {
                restore: (id: string | number) => Promise<void>;
                hardDelete: (id: string | number) => Promise<void>;
            };
        };
    };

    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<FiltroIntestazione>({});
    const [itemDaModificareId, setItemDaModificareId] = useState<string | null>(null);

    // utente loggato
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUtenteId(user?.id ?? null);
        });
    }, []);

    const fetchFn =
        modalitaCestino && config.cestino?.fetch ? config.cestino.fetch : config.fetch;

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            try {
                const data = await fetchFn({ filtro: filtro ?? {}, utenteId });
                if (!cancelled) setItems(data);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [fetchFn, filtro, utenteId]);

    const ctx: ResourceRenderCtx<T> = {
        filtro,
        setFiltro,
        items,
        utenteId,
        navigate,
    };

    const headerTitle =
        modalitaCestino && typeof config.titolo === "string"
            ? `Cestino – ${config.titolo.replace(/^Lista\s+/i, "")}`
            : config.titolo;

    const handleRestore = async (id: string | number) => {
        if (!config.cestino?.actions?.restore) return;
        await config.cestino.actions.restore(id);
        setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
    };

    const handleHardDelete = async (id: string | number) => {
        if (!config.cestino?.actions?.hardDelete) return;
        if (!window.confirm("Eliminazione definitiva. Continuare?")) return;
        await config.cestino.actions.hardDelete(id);
        setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <IntestazioneLista
                titolo={headerTitle}
                icona={config.icona}
                coloreIcona={config.coloreIcona}
                tipo={tipo}
                modalitaCestino={modalitaCestino}
                dati={config.useHeaderFilters ? items : undefined}
                onChange={config.useHeaderFilters ? setFiltro : undefined}
            />

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                        <div
                            key={String(item.id)}
                            className="card-theme p-4 flex flex-col justify-between animate-scale-fade"
                        >
                            <div className="flex-1 space-y-2">
                                {config.colonne.map((col) => (
                                    <div key={String(col.chiave)} className="text-sm">

                                        {col.render ? col.render(item, ctx) : (item as any)[col.chiave as keyof T]}
                                    </div>
                                ))}
                                {config.renderDettaglio && (
                                    <div className="mt-2 text-xs opacity-80">
                                        {config.renderDettaglio(item, ctx)}
                                    </div>
                                )}
                            </div>

                            <div
                                className={`mt-3 flex items-center ${modalitaCestino ? "justify-between" : "justify-end gap-3"
                                    }`}
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
                                        {config.azioni && config.azioni(item, ctx)}
                                        {config.renderModaleModifica && (
                                            <button
                                                onClick={() => setItemDaModificareId(String(item.id))}
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
                    ))}
                </div>
            )}

            {itemDaModificareId &&
                !modalitaCestino &&
                config.renderModaleModifica?.(itemDaModificareId, () =>
                    setItemDaModificareId(null)
                )}
        </div>
    );
}
