// Selezione SINGOLA: mostra al massimo 1 elemento.
// Restano: + per scegliere dall'elenco (filtrato per utente), 'x' per rimuovere.
// Lo span verso il parent è sempre 1.

import { useEffect, useMemo, useState, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supporto/supabaseClient";
import { resourceConfigs, type ResourceKey } from "../Liste/resourceConfigs";

type Risorsa = Extract<ResourceKey, "tasks" | "progetti">;

interface Props {
    resource: Risorsa;
    widgetKey?: string;
    onSpanChange?: (span: 1 | 2) => void;
}

export default function WidgetModello({ resource, widgetKey, onSpanChange }: Props) {
    const navigate = useNavigate();
    const cfg = resourceConfigs[resource] as any;

    const rid = useId();
    const instanceKey = widgetKey ?? `inst-${rid}`;

    const STORAGE_KEY = `widget_${resource}_${instanceKey}`;
    const SELECTED_KEY = `${STORAGE_KEY}_selected_id`; // <- singolo

    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [pool, setPool] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(() => {
        try {
            const raw = localStorage.getItem(SELECTED_KEY);
            return raw ? String(JSON.parse(raw)) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    const [timerTick, setTimerTick] = useState(0);

    // ...stato esistente
    const [extra, setExtra] = useState<any>(null);
    const disposeRef = useRef<null | (() => void)>(null);



    // Fetch utente + pool (lista assegnata all'utente)
    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setErrorMsg(null);

            const { data: { user }, error: authErr } = await supabase.auth.getUser();
            if (authErr || !user) {
                if (!alive) return;
                setErrorMsg("Impossibile ottenere l'utente");
                setLoading(false);
                return;
            }
            if (!alive) return;
            setUtenteId(user.id);

            try {
                const filtro = filtroAssegnati(resource, user.id);
                const data = await cfg.fetch({ filtro, utenteId: user.id });
                if (!alive) return;
                setPool(Array.isArray(data) ? data : []);
            } catch (e: any) {
                if (!alive) return;
                setErrorMsg(e?.message ?? "Errore caricamento");
                setPool([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, [resource, widgetKey]);

    // Inizializza le azioni extra (start/stop/isRunning) della risorsa, se disponibili
    useEffect(() => {
        if (!utenteId) return;
        if (typeof (cfg as any).setup === "function") {
            const res = (cfg as any).setup({ utenteId });
            setExtra(res?.extra ?? null);
            disposeRef.current = res?.dispose ?? null;

            return () => {
                // cleanup quando il widget si smonta o cambia utenteId/resource
                disposeRef.current?.();
                disposeRef.current = null;
            };
        } else {
            // la risorsa potrebbe non avere setup (es. 'progetti'): nessun problema
            setExtra(null);
        }
    }, [utenteId, cfg]);


    // Persistenza singola
    useEffect(() => {
        try { localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedId)); } catch { }
    }, [selectedId]);

    // Elemento selezionato (0 o 1)
    const item = useMemo(() => {
        if (!selectedId) return null;
        return pool.find((it: any) => String(it.id) === String(selectedId)) ?? null;
    }, [pool, selectedId]);

    const hasItem = !!item;


    // Notifica sempre span = 1 al parent
    useEffect(() => {
        onSpanChange?.(1);
    }, [onSpanChange, selectedId, pool]);

    // Candidati: tutti gli assegnati a me (escludo quello già scelto)
    const candidates = useMemo(() => {
        return pool.filter((it: any) => String(it.id) !== String(selectedId ?? ""));
    }, [pool, selectedId]);

    const title = resource === "tasks" ? "Task" : "Progetti";
    const goTo = resource === "tasks" ? "/tasks" : "/progetti";

    function choose(id: string) {
        setSelectedId(id);
        setPickerOpen(false);
    }

    function clear() {
        setSelectedId(null);
    }


    // Se l'elemento selezionato non c'è più nel pool, lo resetto
    useEffect(() => {
        if (loading || !selectedId) return; // aspetta che il pool sia pronto
        const exists = pool.some((it: any) => String(it.id) === String(selectedId));
        if (!exists) setSelectedId(null);
    }, [pool, selectedId, loading]);


    // funzione da usare per refetch
    async function refetchPool(userId: string) {
        const filtro = filtroAssegnati(resource, userId);
        const data = await cfg.fetch({ filtro, utenteId: userId });
        setPool(Array.isArray(data) ? data : []);
    }

    // quando apri il picker, ricarica
    useEffect(() => {
        if (!pickerOpen || !utenteId) return;
        refetchPool(utenteId).catch(() => { });
    }, [pickerOpen, utenteId]);

    // quando il timer cambia (start/stop) forziamo un re-render
    useEffect(() => {
        const onChange = () => setTimerTick(t => t + 1);
        window.addEventListener("tasks:timerChanged", onChange as any);
        return () => window.removeEventListener("tasks:timerChanged", onChange as any);
    }, []);



    return (
        <div
            className="card-theme w-full p-3 rounded-2xl shadow-sm hover:shadow-md transition-[box-shadow,transform] duration-150 cursor-default text-theme"
            style={{ height: 'auto', minHeight: 'fit-content' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3
                    className="text-lg font-semibold text-theme cursor-pointer hover:underline"
                    onClick={() => navigate(goTo)}
                    title={`Vai a ${title}`}
                >
                    {title}
                </h3>

                {/* 🔽 mostra il + solo quando NON c'è un elemento selezionato */}
                {!hasItem && (
                    <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            className="btn-subtle text-sm px-2 py-1 rounded-md inline-flex items-center gap-1"
                            onClick={() => setPickerOpen(v => !v)}
                            title={`Scegli ${title}`}
                        >
                            <FontAwesomeIcon icon={faPlus} />
                        </button>

                        {pickerOpen && (
                            <div
                                className="dropdown-panel absolute right-0 z-20 mt-2 w-64 rounded-lg shadow-lg"
                                // isola il menu dal DnD
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onWheel={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                style={{ touchAction: 'pan-y', overflow: 'visible' }} // niente overflow sul contenitore esterno
                            >
                                {/* ⬇️ wrapper INTERNO scrollabile */}
                                <div
                                    className="max-h-80 overflow-y-auto no-scrollbar pr-1"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                    style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                                >
                                    {/* titolo NON sticky: scorre con la lista */}
                                    <div className="p-2 border-b border-theme text-sm font-semibold">
                                        Seleziona {title} assegnati a te
                                    </div>

                                    {candidates.length === 0 ? (
                                        <div className="p-3 text-sm opacity-70">Nessun elemento disponibile</div>
                                    ) : (
                                        <ul className="divide-y border-theme/50">
                                            {candidates.map((it: any) => (
                                                <li key={it.id}>
                                                    <button
                                                        className="w-full text-left px-3 py-2 hover-bg-theme text-sm"
                                                        onClick={() => choose(String(it.id))}
                                                        title="Visualizza nel widget"
                                                    >
                                                        {renderTitolo(it, cfg)}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            <div className="border-b border-theme mb-2" />

            {loading ? (
                <p className="text-sm text-theme opacity-80">Caricamento...</p>
            ) : errorMsg ? (
                <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            ) : !item ? (
                <div className="flex items-center justify-center h-28 text-sm text-theme opacity-70">
                    Nessun elemento selezionato
                </div>
            ) : (
                <div className="rounded-lg border border-theme p-3 hover:shadow-sm h-auto text-theme relative">
                    {/* Remove */}
                    <button
                        className="absolute right-2 top-2 text-xs px-2 py-1 rounded-md hover-bg-theme"
                        onClick={(e) => { e.stopPropagation(); clear(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Rimuovi dal widget"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>

                    <div className="font-semibold mb-1 pr-6" title={renderTitolo(item, cfg)}>
                        {renderTitolo(item, cfg)}
                    </div>

                    {typeof cfg.renderDettaglio === "function" ? (
                        <div className="text-sm">
                            {cfg.renderDettaglio(item, { navigate: (to: string) => navigate(to), utenteId })}
                        </div>
                    ) : null}

                    {typeof cfg.azioni === "function" && (
                        <div
                            className="flex items-center gap-3 mt-2"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {cfg.azioni(item, { navigate: (to: string) => navigate(to), utenteId, extra })}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

// Helpers
function renderTitolo(item: any, cfg: any) {
    const colNome = (cfg.colonne ?? []).find((c: any) => c.chiave === "nome");
    if (colNome?.render) return colNome.render(item, {});
    return item?.nome ?? item?.titolo ?? `#${item?.id}`;
}

function filtroAssegnati(resource: Risorsa, utenteId: string) {
    if (resource === "tasks") {
        return { assegnatarioId: utenteId, includeChildren: false } as any;
    }
    return { soloMieProgetti: true } as any;
}
