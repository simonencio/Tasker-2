import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-date-range";
import type { Range } from "react-date-range";

import { format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

// Tipi base
export type Utente = { id: string; nome: string; cognome: string | null };
export type Cliente = { id: string; nome: string };
export type Stato = { id: number; nome: string };
export type Priorita = { id: number; nome: string };

// Progetto completo
export type Progetto = {
    id: string;
    nome: string;
    consegna: string | null;
    stato: Stato | null;
    priorita: Priorita | null;
    cliente: Cliente | null;
    membri: Utente[];
};

// Filtro attivo
export type FiltroAvanzatoProgetto = {
    membri: string[];
    cliente: string | null;
    stato: number | null;
    priorita: number | null;
    dataInizio: string | null;
    dataFine: string | null;
    ordine: string | null;
};

type Props = {
    progetti: Progetto[];
    onChange: (f: FiltroAvanzatoProgetto) => void;
};

export default function FiltriProgettoAvanzati({ progetti, onChange }: Props) {
    const [dropdownAperto, setDropdownAperto] = useState(false);
    const [mostraCalendario, setMostraCalendario] = useState(false);

    const [rangeSelezionato, setRangeSelezionato] = useState<Range[]>([{
        startDate: undefined,
        endDate: undefined,
        key: "selection"
    }]);



    const [filtro, setFiltro] = useState<FiltroAvanzatoProgetto>({
        membri: [],
        cliente: null,
        stato: null,
        priorita: null,
        dataInizio: null,
        dataFine: null,
        ordine: null,
    });

    useEffect(() => {
        const { startDate, endDate } = rangeSelezionato[0];
        setFiltro(prev => ({
            ...prev,
            dataInizio: startDate ? format(startDate, "yyyy-MM-dd") : null,
            dataFine: endDate ? format(endDate, "yyyy-MM-dd") : null,
        }));
    }, [rangeSelezionato]);

    useEffect(() => {
        onChange(filtro);
    }, [filtro]);

    useEffect(() => {
        const chiudi = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".membri-dropdown")) setDropdownAperto(false);
        };
        document.addEventListener("click", chiudi);
        return () => document.removeEventListener("click", chiudi);
    }, []);

    const progettiFiltrati = useMemo(() => {
        return progetti.filter((p) => {
            if (filtro.membri.length > 0) {
                const membriId = p.membri.map((m) => m.id);
                const tuttiPresenti = filtro.membri.every((id) => membriId.includes(id));
                if (!tuttiPresenti) return false;
            }
            if (filtro.cliente && p.cliente?.id !== filtro.cliente) return false;
            if (filtro.stato && p.stato?.id !== filtro.stato) return false;
            if (filtro.priorita && p.priorita?.id !== filtro.priorita) return false;
            if (filtro.dataInizio || filtro.dataFine) {
                const data = p.consegna ? new Date(p.consegna) : null;
                if (!data) return false;

                const inizio = filtro.dataInizio ? new Date(filtro.dataInizio) : null;
                const fine = filtro.dataFine ? new Date(filtro.dataFine) : null;

                if (inizio && data < inizio) return false;
                if (fine && data > fine) return false;
            }
            return true;
        });
    }, [progetti, filtro]);

    const opzioniMembri = useMemo(() => {
        const set = new Map<string, string>();
        progettiFiltrati.forEach((p) => {
            p.membri.forEach((u) => {
                const nome = `${u.nome} ${u.cognome || ""}`.trim();
                set.set(u.id, nome);
            });
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [progettiFiltrati]);

    const opzioniClienti = useMemo(() => {
        const set = new Map<string, string>();
        progettiFiltrati.forEach((p) => {
            if (p.cliente) set.set(p.cliente.id, p.cliente.nome);
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [progettiFiltrati]);

    const opzioniStati = useMemo(() => {
        const set = new Map<number, string>();
        progettiFiltrati.forEach((p) => {
            if (p.stato) set.set(p.stato.id, p.stato.nome);
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [progettiFiltrati]);

    const opzioniPriorita = useMemo(() => {
        const set = new Map<number, string>();
        progettiFiltrati.forEach((p) => {
            if (p.priorita) set.set(p.priorita.id, p.priorita.nome);
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [progettiFiltrati]);

    return (
        <div className="flex flex-col gap-3 mb-6 md:grid md:grid-cols-3 md:gap-4 xl:flex xl:flex-row xl:flex-wrap xl:gap-4">
            {/* Membri */}
            <div className="relative membri-dropdown w-full xl:w-auto xl:max-w-[220px]">
                <button
                    type="button"
                    className="input-style w-full text-left"
                    onClick={() => setDropdownAperto(prev => !prev)}
                >
                    {filtro.membri.length > 0
                        ? `${filtro.membri.length} membro${filtro.membri.length > 1 ? "i" : ""} selezionat${filtro.membri.length > 1 ? "i" : "o"}`
                        : "🧑‍💼 Filtra per membri"}
                </button>
                {dropdownAperto && (
                    <div className="absolute z-20 mt-1 w-full popup-panel max-h-48 overflow-y-auto shadow-xl">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {opzioniMembri.map((m) => (
                                <li
                                    key={m.id}
                                    className={`px-3 py-2 cursor-pointer hover-bg-theme text-sm ${filtro.membri.includes(m.id)
                                        ? "font-semibold text-blue-600 dark:text-blue-300"
                                        : "text-theme"
                                        }`}
                                    onClick={() =>
                                        setFiltro(prev => {
                                            const giàPresente = prev.membri.includes(m.id);
                                            const nuovi = giàPresente
                                                ? prev.membri.filter(id => id !== m.id)
                                                : [...prev.membri, m.id];
                                            return { ...prev, membri: nuovi };
                                        })
                                    }
                                >
                                    {filtro.membri.includes(m.id) ? "✅" : "⬜"} {m.nome}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Cliente */}
            <select
                className="input-style w-full xl:w-auto xl:max-w-[220px]"
                value={filtro.cliente || ""}
                onChange={(e) => setFiltro(prev => ({ ...prev, cliente: e.target.value || null }))}
            >
                <option value="">👥 Tutti i clienti</option>
                {opzioniClienti.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
            </select>

            {/* Stato */}
            <select
                className="input-style w-full xl:w-auto xl:max-w-[220px]"
                value={filtro.stato || ""}
                onChange={(e) => setFiltro(prev => ({ ...prev, stato: Number(e.target.value) || null }))}
            >
                <option value="">📊 Tutti gli stati</option>
                {opzioniStati.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
            </select>

            {/* Priorità */}
            <select
                className="input-style w-full xl:w-auto xl:max-w-[220px]"
                value={filtro.priorita || ""}
                onChange={(e) => setFiltro(prev => ({ ...prev, priorita: Number(e.target.value) || null }))}
            >
                <option value="">⏫ Tutte le priorità</option>
                {opzioniPriorita.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
            </select>

            {/* Range date */}
            <div className="relative w-full xl:w-auto">
                <button
                    type="button"
                    onClick={() => setMostraCalendario(prev => !prev)}
                    className="input-style w-full text-left"
                >
                    📅 {filtro.dataInizio && filtro.dataFine
                        ? `${filtro.dataInizio} → ${filtro.dataFine}`
                        : "Filtra per intervallo"}
                </button>
                {mostraCalendario && (
                    <div className="absolute z-20 mt-2 popup-panel shadow-xl rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f2937]">
                        <DateRange
                            editableDateInputs
                            onChange={item => {
                                const { startDate, endDate, key } = item.selection;
                                setRangeSelezionato([{ startDate, endDate, key: key ?? "selection" }]);
                                setFiltro(prev => ({
                                    ...prev,
                                    dataInizio: startDate ? format(startDate, "yyyy-MM-dd") : null,
                                    dataFine: endDate ? format(endDate, "yyyy-MM-dd") : null
                                }));
                            }}
                            moveRangeOnFirstSelection={false}
                            ranges={[
                                {
                                    startDate: rangeSelezionato[0].startDate ?? new Date(),
                                    endDate: rangeSelezionato[0].endDate ?? new Date(),
                                    key: "selection"
                                }
                            ]}
                            showDateDisplay={false}
                            rangeColors={
                                rangeSelezionato[0].startDate && rangeSelezionato[0].endDate
                                    ? ["#2563eb"]
                                    : ["transparent"]
                            }
                            className="popup-panel text-theme border rounded shadow-xl"
                        />




                        <div className="flex justify-end px-4 py-2">
                            <button
                                className="text-sm text-red-600 hover:underline"
                                onClick={() => {
                                    setRangeSelezionato([{ startDate: undefined, endDate: undefined, key: "selection" }]);
                                    setFiltro(prev => ({ ...prev, dataInizio: null, dataFine: null }));
                                    setMostraCalendario(false);
                                }}
                            >
                                ❌ Pulisci intervallo
                            </button>
                        </div>
                    </div>
                )}


            </div>

            {/* Ordina */}
            <select
                className="input-style w-full xl:w-auto xl:max-w-[220px]"
                value={filtro.ordine || ""}
                onChange={(e) => setFiltro(prev => ({ ...prev, ordine: e.target.value || null }))}
            >
                <option value="">🔀 Ordina per...</option>
                <option value="consegna_asc">📈 Data crescente</option>
                <option value="consegna_desc">📉 Data decrescente</option>
                <option value="priorita_urgente">🔥 Più urgente</option>
                <option value="priorita_meno_urgente">🧊 Meno urgente</option>
                <option value="stato_az">🔤 Stato A-Z</option>
                <option value="stato_za">🔡 Stato Z-A</option>
                <option value="nome_az">🔤 Nome A-Z</option>
                <option value="nome_za">🔡 Nome Z-A</option>
            </select>
        </div>
    );
}

// ✅ ORDINAMENTO CLIENT-SIDE
export function ordinaProgettiClientSide(progetti: Progetto[], criterio: string | null): Progetto[] {
    if (!criterio) return progetti;

    const [conValore, senzaValore] = progetti.reduce<[Progetto[], Progetto[]]>((acc, progetto) => {
        const valore = getValoreProgetto(progetto, criterio);
        if (valore === null || valore === undefined || valore === "") acc[1].push(progetto);
        else acc[0].push(progetto);
        return acc;
    }, [[], []]);

    conValore.sort((a, b) => {
        const aVal = getValoreProgetto(a, criterio);
        const bVal = getValoreProgetto(b, criterio);
        if (criterio.endsWith("_desc") || criterio.endsWith("za")) return bVal > aVal ? 1 : -1;
        return aVal > bVal ? 1 : -1;
    });

    return [...conValore, ...senzaValore];
}

function getValoreProgetto(p: Progetto, criterio: string): any {
    switch (criterio) {
        case "consegna_asc":
        case "consegna_desc":
            return p.consegna ?? null;
        case "priorita_urgente":
        case "priorita_meno_urgente":
            return p.priorita?.id ?? null;
        case "stato_az":
        case "stato_za":
            return p.stato?.nome?.toLowerCase() ?? null;
        case "nome_az":
        case "nome_za":
            return p.nome?.toLowerCase() ?? null;
        default:
            return null;
    }
}
