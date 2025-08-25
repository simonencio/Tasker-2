import { useEffect, useMemo, useState, type ReactNode, type JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faLink } from "@fortawesome/free-solid-svg-icons";

import FiltriGenericiAvanzati, {
    type FiltroAvanzatoGenerico,
} from "../supporto/FiltriGenericiAvanzati";

import {
    fetchUtenti,
    fetchClienti,
    fetchProgetti,
    fetchStati,
    fetchPriorita,
} from "../supporto/fetchData";

// ✅ tip dinamico dalle config (no union hard-coded)
import type { ResourceKey } from "../Liste/resourceConfigs";

// 🔹 filtro combinato che esce dall’intestazione verso la lista
export type FiltroIntestazione = FiltroAvanzatoGenerico & {
    soloMie?: boolean;
    soloCompletate?: boolean; // tasks
    soloCompletati?: boolean; // progetti
};

type Props = {
    titolo: string | JSX.Element;
    icona: any; // icona FontAwesome
    coloreIcona?: string;
    azioniExtra?: ReactNode;
    tipo: ResourceKey; // ✅ niente update manuale
    modalitaCestino?: boolean; // quando true, nasconde tutto il pannello filtri

    // opzionale: dati correnti per popolare i menu dei filtri (per dedurre opzioni dal subset)
    dati?: any[];

    // opzionale: valore iniziale dei filtri
    valore?: FiltroIntestazione;

    // callback per notificare la lista quando cambiano i filtri
    onChange?: (filtro: FiltroIntestazione) => void;
};

// helper per mappare { id, nome }
function mapIdNome(arr: any[], fullName = false) {
    return (arr || []).map((u) => ({
        id: u.id,
        nome: fullName ? [u.nome, u.cognome].filter(Boolean).join(" ") : u.nome ?? "",
    }));
}

type OpzioniGlobali = {
    progetto?: { id: string; nome: string }[];
    utente?: { id: string; nome: string }[];
    membri?: { id: string; nome: string }[];
    cliente?: { id: string; nome: string }[];
    stato?: { id: number; nome: string }[];
    priorita?: { id: number; nome: string }[];
};

export default function IntestazioneLista({
    titolo,
    icona,
    coloreIcona,
    azioniExtra,
    tipo,
    dati = [],
    valore,
    onChange,
    modalitaCestino = false,
}: Props) {
    // stato locale dei toggle e dei filtri avanzati
    const [soloMie, setSoloMie] = useState<boolean>(valore?.soloMie ?? false);
    const [soloCompletate, setSoloCompletate] = useState<boolean>(valore?.soloCompletate ?? false);
    const [soloCompletati, setSoloCompletati] = useState<boolean>(valore?.soloCompletati ?? false);
    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzatoGenerico>(valore ?? {});

    // 🌍 opzioni globali per mostrare tutte le anagrafiche finché non si filtra
    const [opzioniGlobali, setOpzioniGlobali] = useState<OpzioniGlobali>({});
    const [loadingGlobali, setLoadingGlobali] = useState(false);

    // configurazione dinamica dei campi/estrattori filtri per tipo
    const config = useMemo(() => {
        if (tipo === "tasks") {
            return {
                campi: ["progetto", "utente", "stato", "priorita", "date", "ordine"] as const,
                estrattori: {
                    progetto: (t: any) => (t.progetto ? { id: t.progetto.id, nome: t.progetto.nome } : null),
                    // assegnatari già è un array di utenti {id, nome, cognome}; il filtro usa .id/.nome
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
        // altri tipi: intestazione semplice (mostro solo azioniExtra)
        return {
            campi: [] as const,
            estrattori: {},
            mostraToggleMie: false,
            mostraToggleCompletate: false,
            mostraToggleCompletati: false,
        };
    }, [tipo]);

    // 🔄 carica le opzioni globali una volta (o quando cambia il tipo)
    useEffect(() => {
        if (modalitaCestino) return; // niente filtri in cestino
        const needGlobals = tipo === "tasks" || tipo === "progetti";

        if (!needGlobals) {
            setOpzioniGlobali({});
            return;
        }

        setLoadingGlobali(true);
        (async () => {
            try {
                const [utenti, clienti, progetti, stati, priorita] = await Promise.all([
                    fetchUtenti(), // tutti gli utenti non-deleted
                    fetchClienti(), // tutti i clienti non-deleted
                    fetchProgetti(), // tutti i progetti non-deleted (per opzioni)
                    fetchStati(),
                    fetchPriorita(),
                ]);

                const utentiMN = mapIdNome(utenti, true); // nome + cognome
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
            } catch (err) {
                console.error("Errore fetch opzioni globali", err);
                setOpzioniGlobali({});
            } finally {
                setLoadingGlobali(false);
            }
        })();
    }, [tipo, modalitaCestino]);

    // emetti all’esterno l’oggetto filtro combinato
    useEffect(() => {
        // In modalità cestino non emettiamo alcun filtro (header "muto")
        if (modalitaCestino) {
            onChange?.({});
            return;
        }

        const out: FiltroIntestazione = {
            ...filtroAvanzato,
            soloMie,
            soloCompletate: tipo === "tasks" ? soloCompletate : undefined,
            soloCompletati: tipo === "progetti" ? soloCompletati : undefined,
        };
        onChange?.(out);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [soloMie, soloCompletate, soloCompletati, filtroAvanzato, tipo, modalitaCestino]);

    return (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-theme flex items-center">
                <FontAwesomeIcon icon={icona} className={`${coloreIcona || ""} mr-2`} />
                {titolo}
            </h1>

            <div className="flex items-center gap-4 flex-wrap">
                {/* 🔒 In modalità cestino: NIENTE filtri né toggle */}
                {!modalitaCestino && (
                    <>
                        {/* toggle predefiniti in base al tipo */}
                        {config.mostraToggleMie && (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faLink} className="w-5 h-5 text-blue-600" />
                                <span className="text-theme font-medium">Mie</span>
                                <div
                                    onClick={() => setSoloMie((v) => !v)}
                                    className={`toggle-theme ${soloMie ? "active" : ""}`}
                                >
                                    <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                                </div>
                            </div>
                        )}

                        {config.mostraToggleCompletate && (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                                <span className="text-theme font-medium">Completate</span>
                                <div
                                    onClick={() => setSoloCompletate((v) => !v)}
                                    className={`toggle-theme ${soloCompletate ? "active" : ""}`}
                                >
                                    <div className={`toggle-thumb ${soloCompletate ? "translate" : ""}`} />
                                </div>
                            </div>
                        )}

                        {config.mostraToggleCompletati && (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                                <span className="text-theme font-medium">Completati</span>
                                <div
                                    onClick={() => setSoloCompletati((v) => !v)}
                                    className={`toggle-theme ${soloCompletati ? "active" : ""}`}
                                >
                                    <div className={`toggle-thumb ${soloCompletati ? "translate" : ""}`} />
                                </div>
                            </div>
                        )}

                        {/* filtri avanzati auto-configurati per tipo */}
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

                {/* azioni extra (pulsanti personalizzati) */}
                {azioniExtra}
            </div>

            {loadingGlobali && !modalitaCestino && (
                <div className="w-full text-sm text-gray-500 mt-1">Carico filtri…</div>
            )}
        </div>
    );
}
