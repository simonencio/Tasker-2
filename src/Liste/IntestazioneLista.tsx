import { useEffect, useMemo, useState, type ReactNode, type JSX } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import FiltriGenericiAvanzati, { type FiltroAvanzatoGenerico } from "../supporto/FiltriGenericiAvanzati";
import { fetchUtenti, fetchClienti, fetchProgetti, fetchStati, fetchPriorita } from "../supporto/fetchData";

import type { ResourceKey } from "./resourceConfigs";
import type { FiltroIntestazione, OpzioniGlobali } from "./typesLista";
import { getPreferredView, setPreferredView, type Vista } from "./viewPrefs";
import ToggleFiltri from "../supporto/ToggleFiltri";

// helper
function mapIdNome(arr: any[], fullName = false) {
    return (arr || []).map((u) => ({
        id: u.id,
        nome: fullName ? [u.nome, u.cognome].filter(Boolean).join(" ") : u.nome ?? "",
    }));
}

/** Switcher Vista */
function VistaSwitcher({ tipo, paramKey = "view" }: { tipo: ResourceKey; paramKey?: string }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const readView = (): Vista => {
        const v = searchParams.get(paramKey);
        if (v === "cards" || v === "timeline" || v === "list") return v;
        return getPreferredView(tipo, "list");
    };

    const [vista, setVista] = useState<Vista>(() => readView());

    useEffect(() => {
        const v = readView();
        setVista(v);
        setPreferredView(tipo, v);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, tipo, paramKey]);

    const go = (v: Vista) => {
        setPreferredView(tipo, v);
        setVista(v);

        const sp = new URLSearchParams(location.search);

        if (paramKey !== "view") {
            for (const key of Array.from(sp.keys())) {
                if (key.startsWith("view_")) sp.delete(key);
            }
            if (v !== "list") sp.set(paramKey, v);
        } else {
            if (v === "list") sp.delete(paramKey);
            else sp.set(paramKey, v);
        }

        setSearchParams(sp, { replace: true });
    };

    const Btn = ({ v, label }: { v: Vista; label: string }) => (
        <button
            type="button"
            onClick={() => go(v)}
            className={
                "tooltip px-2 py-1 rounded text-xs sm:text-sm border border-theme cursor-pointer " +
                (vista === v
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-transparent text-theme hover-bg-theme")
            }
            data-tooltip={`Vista ${label}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex items-center gap-2">
            <Btn v="list" label="Lista" />
            <Btn v="cards" label="Schede" />
            {(tipo === "tasks" || tipo === "progetti") && (
                <>
                    <Btn v="timeline" label="Timeline" />
                    <Btn v="gantt" label="Gantt" />
                </>
            )}
        </div>
    );

}

export default function IntestazioneLista({
    titolo,
    icona,
    coloreIcona,
    azioniExtra,
    tipo,
    paramKey = "view",
    dati = [],
    valore,
    onChange,
    modalitaCestino = false,
    minimal = false,   // 👈 nuova prop
}: {
    titolo: string | JSX.Element;
    icona: any;
    coloreIcona?: string;
    azioniExtra?: ReactNode;
    tipo: ResourceKey;
    paramKey?: string;
    modalitaCestino?: boolean;
    dati?: any[];
    valore?: FiltroIntestazione;
    onChange?: (filtro: FiltroIntestazione) => void;
    minimal?: boolean;
}) {



    const PREF_KEY = `filtro_${tipo}`;

    // Carico eventuale stato persistito
    const loadPersisted = (): FiltroIntestazione => {
        try {
            const raw = localStorage.getItem(PREF_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    };
    const initial = { ...loadPersisted(), ...valore };

    // Toggles
    const [soloMieTasks, setSoloMieTasks] = useState<boolean>(initial?.soloMieTasks ?? false);
    const [soloMieProgetti, setSoloMieProgetti] = useState<boolean>(initial?.soloMieProgetti ?? false);
    const [soloCompletate, setSoloCompletate] = useState<boolean>(initial?.soloCompletate ?? false);
    const [soloCompletati, setSoloCompletati] = useState<boolean>(initial?.soloCompletati ?? false);
    const [soloNonCompletate, setSoloNonCompletate] = useState<boolean>(initial?.soloNonCompletate ?? false);
    const [soloNonCompletati, setSoloNonCompletati] = useState<boolean>(initial?.soloNonCompletati ?? false);

    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzatoGenerico>(initial ?? {});
    const [opzioniGlobali, setOpzioniGlobali] = useState<OpzioniGlobali>({});
    const [loadingGlobali, setLoadingGlobali] = useState(false);

    const config = useMemo(() => {
        if (tipo === "tasks") {
            return {
                campi: ["progetto", "utente", "stato", "priorita", "date", "ordine"] as const,
                estrattori: {
                    progetto: (t: any) => (t.progetto ? { id: t.progetto.id, nome: t.progetto.nome } : null),
                    utente: (t: any) => t.assegnatari ?? [],
                    stato: (t: any) => (t.stato ? { id: t.stato.id, nome: t.stato.nome } : null),
                    priorita: (t: any) => (t.priorita ? { id: t.priorita.id, nome: t.priorita.nome } : null),
                    consegna: (t: any) => (t.consegna ? t.consegna : null),
                },
                mostraToggleMie: true,
                mostraToggleCompletate: true,
                mostraToggleNonCompletate: true,
                mostraToggleCompletati: false,
                mostraToggleNonCompletati: false,
            };
        }
        if (tipo === "progetti") {
            return {
                campi: ["utente", "cliente", "stato", "priorita", "date", "ordine"] as const,
                estrattori: {
                    utente: (p: any) =>
                        (p.membri || []).map((m: any) => ({
                            id: m.id,
                            nome: [m.nome, m.cognome].filter(Boolean).join(" "),
                        })),
                    cliente: (p: any) => (p.cliente ? { id: p.cliente.id, nome: p.cliente.nome } : null),
                    stato: (p: any) => (p.stato ? { id: p.stato.id, nome: p.stato.nome } : null),
                    priorita: (p: any) => (p.priorita ? { id: p.priorita.id, nome: p.priorita.nome } : null),
                    consegna: (p: any) => p.consegna ?? null,
                },
                mostraToggleMie: true,
                mostraToggleCompletate: false,
                mostraToggleNonCompletate: false,
                mostraToggleCompletati: true,
                mostraToggleNonCompletati: true,
            };
        }
        return {
            campi: [] as const,
            estrattori: {} as Record<string, any>,
            mostraToggleMie: false,
            mostraToggleCompletate: false,
            mostraToggleNonCompletate: false,
            mostraToggleCompletati: false,
            mostraToggleNonCompletati: false,
        };
    }, [tipo]);

    // carico opzioni globali
    useEffect(() => {
        if (modalitaCestino) return;
        const need = tipo === "tasks" || tipo === "progetti";
        if (!need) {
            setOpzioniGlobali({});
            return;
        }
        setLoadingGlobali(true);
        (async () => {
            try {
                const [utenti, clienti, progetti, stati, priorita] = await Promise.all([
                    fetchUtenti(),
                    fetchClienti(),
                    fetchProgetti(),
                    fetchStati(),
                    fetchPriorita(),
                ]);
                const utentiMN = mapIdNome(utenti, true);
                const clientiMN = (clienti || []).map((c: any) => ({ id: c.id, nome: c.nome }));
                const progettiMN = (progetti || []).map((p: any) => ({ id: p.id, nome: p.nome }));
                const statiMN = (stati || []).map((s: any) => ({ id: s.id, nome: s.nome }));
                const prioritaMN = (priorita || []).map((p: any) => ({ id: p.id, nome: p.nome }));
                setOpzioniGlobali({
                    utente: utentiMN,
                    membri: utentiMN,
                    cliente: clientiMN,
                    progetto: progettiMN,
                    stato: statiMN,
                    priorita: prioritaMN,
                });
            } catch {
                setOpzioniGlobali({});
            } finally {
                setLoadingGlobali(false);
            }
        })();
    }, [tipo, modalitaCestino]);

    // aggiorno filtro esterno + salvo su localStorage
    useEffect(() => {
        if (modalitaCestino) {
            onChange?.({});
            return;
        }
        const out: FiltroIntestazione = {
            ...filtroAvanzato,
            soloMieTasks: tipo === "tasks" ? soloMieTasks : undefined,
            soloMieProgetti: tipo === "progetti" ? soloMieProgetti : undefined,
            soloCompletate: tipo === "tasks" ? soloCompletate : undefined,
            soloNonCompletate: tipo === "tasks" ? soloNonCompletate : undefined,
            soloCompletati: tipo === "progetti" ? soloCompletati : undefined,
            soloNonCompletati: tipo === "progetti" ? soloNonCompletati : undefined,
        };
        onChange?.(out);
        try {
            localStorage.setItem(PREF_KEY, JSON.stringify(out));
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        soloMieTasks,
        soloMieProgetti,
        soloCompletate,
        soloNonCompletate,
        soloCompletati,
        soloNonCompletati,
        filtroAvanzato,
        tipo,
        modalitaCestino,
    ]);
    // 🔹 se minimal: solo titolo + toggle
    if (minimal) {
        return (
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme flex items-center">
                    <FontAwesomeIcon
                        icon={icona}
                        className={`${coloreIcona || "icon-color"} mr-2`}
                    />
                    {titolo}
                </h1>
                <ToggleFiltri
                    tipo={tipo}
                    config={config}
                    valori={{
                        soloMieTasks,
                        soloMieProgetti,
                        soloCompletate,
                        soloCompletati,
                        soloNonCompletate,
                        soloNonCompletati,
                    }}
                    setters={{
                        setSoloMieTasks,
                        setSoloMieProgetti,
                        setSoloCompletate,
                        setSoloCompletati,
                        setSoloNonCompletate,
                        setSoloNonCompletati,
                    }}
                />
            </div>
        );
    }
    return (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-theme flex items-center">
                <FontAwesomeIcon icon={icona} className={`${coloreIcona || "icon-color"} mr-2`} />
                {titolo}
            </h1>

            <div className="flex items-center gap-4 flex-wrap">
                {!modalitaCestino && <VistaSwitcher tipo={tipo} paramKey={paramKey} />}

                {!modalitaCestino && (
                    <>
                        <ToggleFiltri
                            tipo={tipo}
                            config={config}
                            valori={{
                                soloMieTasks,
                                soloMieProgetti,
                                soloCompletate,
                                soloCompletati,
                                soloNonCompletate,
                                soloNonCompletati,
                            }}
                            setters={{
                                setSoloMieTasks,
                                setSoloMieProgetti,
                                setSoloCompletate,
                                setSoloCompletati,
                                setSoloNonCompletate,
                                setSoloNonCompletati,
                            }}
                        />

                        {config.campi.length > 0 && (
                            <FiltriGenericiAvanzati<any>
                                dati={dati}
                                campi={config.campi as any}
                                estrattori={config.estrattori as any}
                                onChange={setFiltroAvanzato}
                                opzioniGlobali={opzioniGlobali}
                            />
                        )}
                    </>
                )}

                {azioniExtra}
            </div>

            {loadingGlobali && !modalitaCestino && (
                <div className="w-full text-sm text-theme mt-1">Carico filtri…</div>
            )}
        </div>
    );
}
