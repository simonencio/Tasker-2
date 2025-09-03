import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import type { ResourceConfig, FiltroIntestazione } from "./typesLista";

/**
 * Hook condiviso per gestire dati di una resource (lista, card, timeline).
 */
export function useResourceData<T extends { id: string | number }>(
    config: ResourceConfig<T>,
    {
        modalitaCestino = false,
        paramKey,
    }: { modalitaCestino?: boolean; paramKey?: string } = {}
) {
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<FiltroIntestazione>({});

    // Helpers
    const patchItem = (id: string | number, patch: Partial<T>) => {
        setItems((prev) =>
            prev.map((it) => (String(it.id) === String(id) ? { ...it, ...patch } : it))
        );
    };

    const removeItem = (id: string | number) => {
        setItems((prev) => prev.filter((it) => String(it.id) !== String(id)));
    };

    const addItem = (item: T) => {
        setItems((prev) => [...prev, item]);
    };

    const replaceItem = (item: T) => {
        setItems((prev) => {
            const exists = prev.some((it) => String(it.id) === String(item.id));
            return exists
                ? prev.map((it) => (String(it.id) === String(item.id) ? item : it))
                : [...prev, item]; // fallback se non esiste
        });
    };

    // Recupera utente loggato
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUtenteId(user?.id ?? null);
        });
    }, []);

    // setup extra opzionale dalla config
    const setupResult = useMemo(
        () => config.setup?.({ utenteId }) ?? { extra: undefined },
        [config, utenteId]
    );

    useEffect(() => () => setupResult?.dispose?.(), [setupResult]);

    // Scegli fetch in base a cestino o normale
    const fetchFn =
        modalitaCestino && config.cestino?.fetch ? config.cestino.fetch : config.fetch;

    // fetch iniziale
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const data = await fetchFn({
                    filtro: filtro ?? {},
                    utenteId,
                    paramKey, // 👈 adesso lo passiamo al config
                });
                if (!alive) return;
                setItems(data);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [fetchFn, filtro, utenteId, paramKey]); // 👈 dipendenze aggiornate

    // 🔔 Listener globale
    useEffect(() => {
        const handler = (e: Event) => {
            const ev = e as CustomEvent;
            const { tipo, resource, payload } = ev.detail || {};
            if (resource !== config.key) return;

            if (tipo === "update" && payload?.id && payload?.patch) {
                patchItem(payload.id, payload.patch);
            } else if (tipo === "remove" && payload?.id) {
                removeItem(payload.id);
            } else if (tipo === "add" && payload?.item) {
                addItem(payload.item as T);
            } else if (tipo === "replace" && payload?.item) {
                replaceItem(payload.item as T);
            }
        };
        window.addEventListener("resource:event", handler as EventListener);
        return () => {
            window.removeEventListener("resource:event", handler as EventListener);
        };
    }, [config.key]);

    return {
        utenteId,
        items,
        loading,
        filtro,
        setFiltro,
        patchItem,
        removeItem,
        addItem,
        replaceItem,
        extra: setupResult.extra,
    };
}
