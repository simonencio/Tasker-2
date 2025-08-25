// src/Liste/ListaDinamica.tsx
import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faUndo, faTrash } from "@fortawesome/free-solid-svg-icons";

import IntestazioneLista, { type FiltroIntestazione } from "./IntestazioneLista";
import { supabase } from "../supporto/supabaseClient";
import { resourceConfigs, type ResourceKey } from "./resourceConfigs";

/**
 * Tipi base per column rendering e context che passiamo alle funzioni della config
 */
export type Colonna<T> = {
    chiave: keyof T | string;
    label: string;
    className?: string;
    render?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element | string | null;
};

export type ResourceRenderCtx<T> = {
    filtro: FiltroIntestazione;
    setFiltro: (f: FiltroIntestazione) => void;
    items: T[];
    utenteId: string | null;
    navigate: ReturnType<typeof useNavigate>;
    extra?: any; // spazio per stati/azioni custom restituiti da config.setup()
};

type Props = {
    /** Chiave della risorsa da mostrare (deve esistere in resourceConfigs) */
    tipo: ResourceKey;
    /** Abilita la modalità Cestino per questa lista */
    modalitaCestino?: boolean;
};

/**
 * COMPONENTE UNICO “SCHELETRO”
 * - Legge la config da resourceConfigs[tipo]
 * - Esegue fetch/setup secondo la config (switcha su cestino.fetch se modalitaCestino)
 * - Renderizza: Intestazione + Tabella + Azioni + Dettaglio + Modale (se definita in config)
 * - Nessuna logica di dominio qui dentro: tutto arriva dalla config (azioni, modali, ecc.)
 */
export default function ListaDinamica<T extends { id: string | number }>({
    tipo,
    modalitaCestino = false,
}: Props) {
    const navigate = useNavigate();
    const configAny = resourceConfigs[tipo] as any;
    if (!configAny) {
        return <p className="text-red-600">Config non trovata per tipo: {tipo}</p>;
    }

    const config = configAny as {
        key: string;
        titolo: string | JSX.Element;
        icona: any;
        coloreIcona: string;
        fetch: (args: { filtro: FiltroIntestazione; utenteId: string | null }) => Promise<T[]>;
        useHeaderFilters?: boolean;
        colonne: Colonna<T>[];
        azioni?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element;
        renderDettaglio?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element | null;
        renderModaleModifica?: (id: string, onClose: () => void) => JSX.Element;
        azioniExtra?: JSX.Element;
        modalitaCestino?: boolean;
        setup?: (deps: { utenteId: string | null }) => { extra: any; dispose?: () => void };
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
    const [itemEspansoId, setItemEspansoId] = useState<string | null>(null);
    const [itemDaModificareId, setItemDaModificareId] = useState<string | null>(null);

    // Recupero utente loggato
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUtenteId(user?.id ?? null);
        });
    }, []);

    // setup extra opzionale dalla config (es. timer per tasks)
    const setupResult = useMemo(
        () => config.setup?.({ utenteId }) ?? { extra: undefined },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [config, utenteId]
    );

    // Scegli la fetch in base alla modalità
    const fetchFn =
        modalitaCestino && config.cestino?.fetch ? config.cestino.fetch : config.fetch;

    // fetch dati
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
            setupResult?.dispose?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchFn, filtro, utenteId]);

    // Context passato a tutte le render-fn della config
    const ctx: ResourceRenderCtx<T> = {
        filtro,
        setFiltro,
        items,
        utenteId,
        navigate,
        extra: setupResult.extra,
    };

    // Titolo: prefisso "Cestino – " se siamo in cestino e il titolo è stringa
    const headerTitle =
        modalitaCestino && typeof config.titolo === "string"
            ? `Cestino – ${config.titolo.replace(/^Lista\s+/i, "")}`
            : config.titolo;

    // Handlers cestino
    const handleRestore = async (id: string | number) => {
        if (!config.cestino?.actions?.restore) return;
        await config.cestino.actions.restore(id);
        // aggiorna lista localmente
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
                // ⬇️ Niente pulsante Crea quando siamo nel cestino
                azioniExtra={!modalitaCestino && !config.useHeaderFilters ? config.azioniExtra : undefined}
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
                        {config.colonne.map((col) => (
                            <div key={String(col.chiave)} className={col.className ?? "flex-1"}>
                                {col.label}
                            </div>
                        ))}
                        <div className="w-36 text-center">Azioni</div>
                    </div>

                    {/* righe */}
                    {items.map((item) => {
                        const itemId = String(item.id);
                        const isOpen = itemEspansoId === itemId;

                        return (
                            <div
                                key={itemId}
                                className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme"
                            >
                                {/* riga principale */}
                                <div
                                    className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer"
                                    onClick={() => setItemEspansoId(isOpen ? null : itemId)}
                                >
                                    {config.colonne.map((col) => (
                                        <div key={String(col.chiave)} className={col.className ?? "flex-1"}>
                                            {col.render ? col.render(item, ctx) : (item as any)[col.chiave as keyof T]}
                                        </div>
                                    ))}

                                    {/* azioni per riga */}
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
                                                {config.azioni && config.azioni(item, ctx)}
                                                {/* Modifica disponibile solo fuori dal cestino */}
                                                {config.renderModaleModifica && !modalitaCestino && (
                                                    <button
                                                        onClick={() => setItemDaModificareId(itemId)}
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

                                {/* dettaglio espandibile */}
                                {isOpen && config.renderDettaglio && (
                                    <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-1">
                                        {config.renderDettaglio(item, ctx)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* modale modifica (decisa dalla config) — non in cestino */}
            {itemDaModificareId &&
                !modalitaCestino &&
                config.renderModaleModifica?.(itemDaModificareId, () => setItemDaModificareId(null))}
        </div>
    );
}
