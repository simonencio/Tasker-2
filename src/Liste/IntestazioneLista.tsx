// src/Liste/IntestazioneLista.tsx
import { useEffect, useMemo, useState, type ReactNode, type JSX } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faLink } from "@fortawesome/free-solid-svg-icons";

import FiltriGenericiAvanzati, { type FiltroAvanzatoGenerico } from "../supporto/FiltriGenericiAvanzati";
import { fetchUtenti, fetchClienti, fetchProgetti, fetchStati, fetchPriorita } from "../supporto/fetchData";

import type { ResourceKey } from "./resourceConfigs";
import type { FiltroIntestazione, OpzioniGlobali } from "./typesLista";
import { getPreferredView, setPreferredView, type Vista } from "./viewPrefs";

// helper
function mapIdNome(arr: any[], fullName = false) {
    return (arr || []).map((u) => ({
        id: u.id,
        nome: fullName ? [u.nome, u.cognome].filter(Boolean).join(" ") : u.nome ?? "",
    }));
}

/** Switcher Vista — usa il paramKey specifico (default "view") */
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
        if (v === "list") sp.delete(paramKey);
        else sp.set(paramKey, v);
        setSearchParams(sp, { replace: true });
    };

    const Btn = ({ v, label }: { v: Vista; label: string }) => (
        <button
            type="button"
            onClick={() => go(v)}
            className={
                "px-2 py-1 rounded text-xs sm:text-sm border " +
                (vista === v
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-transparent text-theme border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800")
            }
            title={`Vista ${label}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex items-center gap-2">
            <Btn v="list" label="Lista" />
            <Btn v="cards" label="Schede" />
            <Btn v="timeline" label="Timeline" />
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
}: {
    titolo: string | JSX.Element;
    icona: any;
    coloreIcona?: string;
    azioniExtra?: ReactNode;
    tipo: ResourceKey;
    /** 👇 chiave querystring da usare per questa lista (indipendente per /altre-liste) */
    paramKey?: string;
    modalitaCestino?: boolean;
    dati?: any[];
    valore?: FiltroIntestazione;
    onChange?: (filtro: FiltroIntestazione) => void;
}) {
    // Toggles
    const [soloMieTasks, setSoloMieTasks] = useState<boolean>(valore?.soloMieTasks ?? false);
    const [soloMieProgetti, setSoloMieProgetti] = useState<boolean>(valore?.soloMieProgetti ?? false);
    const [soloCompletate, setSoloCompletate] = useState<boolean>(valore?.soloCompletate ?? false);
    const [soloCompletati, setSoloCompletati] = useState<boolean>(valore?.soloCompletati ?? false);

    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzatoGenerico>(valore ?? {});
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
                mostraToggleCompletati: false,
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
                mostraToggleCompletati: true,
            };
        }
        return {
            campi: [] as const,
            estrattori: {} as Record<string, any>,
            mostraToggleMie: false,
            mostraToggleCompletate: false,
            mostraToggleCompletati: false,
        };
    }, [tipo]);

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
            soloCompletati: tipo === "progetti" ? soloCompletati : undefined,
        };
        onChange?.(out);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [soloMieTasks, soloMieProgetti, soloCompletate, soloCompletati, filtroAvanzato, tipo, modalitaCestino]);

    return (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-theme flex items-center">
                <FontAwesomeIcon icon={icona} className={`${coloreIcona || ""} mr-2`} />
                {titolo}
            </h1>

            <div className="flex items-center gap-4 flex-wrap">
                {!modalitaCestino && <VistaSwitcher tipo={tipo} paramKey={paramKey} />}

                {!modalitaCestino && (
                    <>
                        {config.mostraToggleMie && (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faLink} className="w-5 h-5 text-blue-600" />
                                <span className="text-theme font-medium">{tipo === "progetti" ? "Miei" : "Mie"}</span>
                                <div
                                    onClick={() =>
                                        tipo === "tasks"
                                            ? setSoloMieTasks((v) => !v)
                                            : tipo === "progetti"
                                                ? setSoloMieProgetti((v) => !v)
                                                : null
                                    }
                                    className={`toggle-theme ${(tipo === "tasks" ? soloMieTasks : tipo === "progetti" ? soloMieProgetti : false) ? "active" : ""
                                        }`}
                                >
                                    <div
                                        className={`toggle-thumb ${(tipo === "tasks" ? soloMieTasks : tipo === "progetti" ? soloMieProgetti : false) ? "translate" : ""
                                            }`}
                                    />
                                </div>
                            </div>
                        )}

                        {config.mostraToggleCompletate && (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                                <span className="text-theme font-medium">Completate</span>
                                <div onClick={() => setSoloCompletate((v) => !v)} className={`toggle-theme ${soloCompletate ? "active" : ""}`}>
                                    <div className={`toggle-thumb ${soloCompletate ? "translate" : ""}`} />
                                </div>
                            </div>
                        )}

                        {config.mostraToggleCompletati && (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                                <span className="text-theme font-medium">Completati</span>
                                <div onClick={() => setSoloCompletati((v) => !v)} className={`toggle-theme ${soloCompletati ? "active" : ""}`}>
                                    <div className={`toggle-thumb ${soloCompletati ? "translate" : ""}`} />
                                </div>
                            </div>
                        )}

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
                <div className="w-full text-sm text-gray-500 mt-1">Carico filtri…</div>
            )}
        </div>
    );
}