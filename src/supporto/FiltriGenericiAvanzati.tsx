// src/supporto/FiltriGenericiAvanzati.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { DateRange, type Range } from "react-date-range";
import { format, isAfter, isBefore } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

type CampoFiltro =
    | "progetto"
    | "utente"
    | "membri"
    | "cliente"
    | "stato"
    | "priorita"
    | "date"
    | "ordine";

// 👇 Chiavi logiche per filtrare (nota "date" non è una keyof del filtro)
type FiltroChiave =
    | "progetto"
    | "utente"
    | "membri"
    | "cliente"
    | "stato"
    | "priorita"
    | "date";

export type FiltroAvanzatoGenerico = {
    progetto?: string | null;
    utente?: string | null;
    membri?: string[];
    cliente?: string | null;
    stato?: number | null;
    priorita?: number | null;
    dataInizio?: string | null;
    dataFine?: string | null;
    ordine?: string | null;
};

type IdNome<K extends string | number = string> = { id: K; nome: string };

type Props<T> = {
    dati: T[];
    campi: CampoFiltro[];
    onChange: (f: FiltroAvanzatoGenerico) => void;
    estrattori: {
        progetto?: (d: T) => IdNome<string> | null;
        utente?: (d: T) => IdNome<string>[] | null;
        membri?: (d: T) => IdNome<string>[] | null;
        cliente?: (d: T) => IdNome<string> | null;
        stato?: (d: T) => IdNome<number> | null;
        priorita?: (d: T) => IdNome<number> | null;
        consegna?: (d: T) => string | null; // ISO date string
    };
    /** Cataloghi completi da DB: mostrati finché nessun altro filtro è attivo */
    opzioniGlobali?: {
        progetto?: IdNome<string>[];
        utente?: IdNome<string>[];
        membri?: IdNome<string>[]; // se omesso, fallback a utente
        cliente?: IdNome<string>[];
        stato?: IdNome<number>[];
        priorita?: IdNome<number>[];
    };
};

export default function FiltriGenericiAvanzati<T>({
    dati,
    campi,
    onChange,
    estrattori,
    opzioniGlobali,
}: Props<T>) {
    const [filtro, setFiltro] = useState<FiltroAvanzatoGenerico>({
        progetto: null,
        utente: null,
        membri: [],
        cliente: null,
        stato: null,
        priorita: null,
        dataInizio: null,
        dataFine: null,
        ordine: null,
    });

    const [rangeSelezionato, setRangeSelezionato] = useState<Range[]>([
        { startDate: undefined, endDate: undefined, key: "selection" },
    ]);
    const [mostraCalendario, setMostraCalendario] = useState(false);
    const calendarioRef = useRef<HTMLDivElement>(null);

    // utils
    const normalizeAndSort = <K extends string | number>(arr: IdNome<K>[]) =>
        [...arr].sort((a, b) =>
            a.nome.localeCompare(b.nome, "it", { sensitivity: "base" })
        );

    const creaOpzioniDaDati = <K extends string | number>(
        getter: (d: T) => IdNome<K> | IdNome<K>[] | null,
        subset: T[]
    ) => {
        const map = new Map<K, string>();
        subset.forEach((row) => {
            const v = getter(row);
            if (!v) return;
            if (Array.isArray(v)) v.forEach((x) => map.set(x.id, x.nome));
            else map.set(v.id, v.nome);
        });
        return normalizeAndSort(
            Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
        );
    };

    const campoPresente = (c: FiltroChiave) =>
        (c === "date" && campi.includes("date")) || campi.includes(c as CampoFiltro);

    // subset coerente con TUTTI i filtri tranne "escludi"
    const subsetFiltratoEscludendo = (escludi: FiltroChiave): T[] => {
        return dati.filter((row) => {
            // progetto
            if (escludi !== "progetto" && filtro.progetto && estrattori.progetto) {
                if (estrattori.progetto(row)?.id !== filtro.progetto) return false;
            }
            // utente
            if (escludi !== "utente" && filtro.utente && estrattori.utente) {
                const us = estrattori.utente(row) || [];
                if (!us.some((u) => u.id === filtro.utente)) return false;
            }
            // membri (tutti i selezionati devono essere presenti)
            if (
                escludi !== "membri" &&
                filtro.membri &&
                filtro.membri.length &&
                estrattori.membri
            ) {
                const ms = estrattori.membri(row) || [];
                const ids = new Set(ms.map((m) => m.id));
                if (!filtro.membri.every((id) => ids.has(id))) return false;
            }
            // cliente
            if (escludi !== "cliente" && filtro.cliente && estrattori.cliente) {
                if (estrattori.cliente(row)?.id !== filtro.cliente) return false;
            }
            // stato
            if (escludi !== "stato" && filtro.stato != null && estrattori.stato) {
                if (estrattori.stato(row)?.id !== filtro.stato) return false;
            }
            // priorita
            if (
                escludi !== "priorita" &&
                filtro.priorita != null &&
                estrattori.priorita
            ) {
                if (estrattori.priorita(row)?.id !== filtro.priorita) return false;
            }
            // date (range chiuso)
            if (
                escludi !== "date" &&
                (filtro.dataInizio || filtro.dataFine) &&
                estrattori.consegna
            ) {
                const ds = estrattori.consegna(row);
                if (!ds) return false;
                const d = new Date(ds);
                if (filtro.dataInizio && isBefore(d, new Date(filtro.dataInizio)))
                    return false;
                if (filtro.dataFine && isAfter(d, new Date(filtro.dataFine)))
                    return false;
            }
            return true;
        });
    };

    // vero se almeno UN altro filtro (diverso da 'campo') è attivo
    const altriFiltriAttivi = (campo: FiltroChiave): boolean => {
        const flags = {
            progetto: !!filtro.progetto,
            utente: !!filtro.utente,
            membri: !!(filtro.membri && filtro.membri.length),
            cliente: !!filtro.cliente,
            stato: filtro.stato !== null && filtro.stato !== undefined,
            priorita: filtro.priorita !== null && filtro.priorita !== undefined,
            date: !!(filtro.dataInizio || filtro.dataFine),
        } as Record<FiltroChiave, boolean>;

        return (Object.keys(flags) as FiltroChiave[])
            .filter((k) => k !== campo)
            .some((k) => flags[k]);
    };

    const getOpzioni = <K extends string | number>(
        campo: FiltroChiave,
        globali: IdNome<K>[] | undefined,
        getter: ((d: T) => IdNome<K> | IdNome<K>[] | null) | undefined
    ): IdNome<K>[] => {
        if (!campoPresente(campo)) return [];
        // nessun altro filtro attivo => mostra TUTTE le globali se presenti
        if (!altriFiltriAttivi(campo) && globali && globali.length) {
            return normalizeAndSort(globali);
        }
        // altrimenti, calcola opzioni dal subset coerente con gli altri filtri
        const subset = subsetFiltratoEscludendo(campo);
        const dedotte = getter ? creaOpzioniDaDati(getter, subset) : [];
        // se abbiamo globali, intersechiamo per coerenza con le anagrafiche
        if (globali && globali.length) {
            const allowed = new Set(globali.map((g) => g.id as any));
            return dedotte.filter((d) => allowed.has(d.id as any));
        }
        return dedotte;
    };

    // opzioni pronte
    const opzioniProgetti = useMemo(
        () => getOpzioni("progetto", opzioniGlobali?.progetto, estrattori.progetto),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dati,
            filtro.progetto,
            filtro.utente,
            filtro.membri?.length,
            filtro.cliente,
            filtro.stato,
            filtro.priorita,
            filtro.dataInizio,
            filtro.dataFine,
            opzioniGlobali?.progetto,
        ]
    );

    const opzioniUtenti = useMemo(
        () => getOpzioni("utente", opzioniGlobali?.utente, estrattori.utente),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dati,
            filtro.progetto,
            filtro.utente,
            filtro.membri?.length,
            filtro.cliente,
            filtro.stato,
            filtro.priorita,
            filtro.dataInizio,
            filtro.dataFine,
            opzioniGlobali?.utente,
        ]
    );

    const opzioniMembri = useMemo(
        () =>
            getOpzioni(
                "membri",
                opzioniGlobali?.membri ?? opzioniGlobali?.utente,
                estrattori.membri
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dati,
            filtro.progetto,
            filtro.utente,
            filtro.membri?.length,
            filtro.cliente,
            filtro.stato,
            filtro.priorita,
            filtro.dataInizio,
            filtro.dataFine,
            opzioniGlobali?.membri,
            opzioniGlobali?.utente,
        ]
    );

    const opzioniClienti = useMemo(
        () => getOpzioni("cliente", opzioniGlobali?.cliente, estrattori.cliente),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dati,
            filtro.progetto,
            filtro.utente,
            filtro.membri?.length,
            filtro.cliente,
            filtro.stato,
            filtro.priorita,
            filtro.dataInizio,
            filtro.dataFine,
            opzioniGlobali?.cliente,
        ]
    );

    const opzioniStati = useMemo(
        () => getOpzioni("stato", opzioniGlobali?.stato, estrattori.stato),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dati,
            filtro.progetto,
            filtro.utente,
            filtro.membri?.length,
            filtro.cliente,
            filtro.stato,
            filtro.priorita,
            filtro.dataInizio,
            filtro.dataFine,
            opzioniGlobali?.stato,
        ]
    );

    const opzioniPriorita = useMemo(
        () => getOpzioni("priorita", opzioniGlobali?.priorita, estrattori.priorita),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dati,
            filtro.progetto,
            filtro.utente,
            filtro.membri?.length,
            filtro.cliente,
            filtro.stato,
            filtro.priorita,
            filtro.dataInizio,
            filtro.dataFine,
            opzioniGlobali?.priorita,
        ]
    );

    // date → aggiorna filtro quando cambia il range
    useEffect(() => {
        const { startDate, endDate } = rangeSelezionato[0];
        setFiltro((prev) => ({
            ...prev,
            dataInizio: startDate ? format(startDate, "yyyy-MM-dd") : null,
            dataFine: endDate ? format(endDate, "yyyy-MM-dd") : null,
        }));
    }, [rangeSelezionato]);

    // propaga all'esterno
    useEffect(() => {
        onChange(filtro);
    }, [filtro, onChange]);

    // chiusura calendario on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                mostraCalendario &&
                calendarioRef.current &&
                !calendarioRef.current.contains(e.target as Node)
            ) {
                setMostraCalendario(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [mostraCalendario]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6 w-full">
            {campi.includes("progetto") && (
                <select
                    className="input-style"
                    value={filtro.progetto || ""}
                    onChange={(e) =>
                        setFiltro((p) => ({ ...p, progetto: e.target.value || null }))
                    }
                >
                    <option value="">📁 Tutti i progetti</option>
                    {opzioniProgetti.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                            {p.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("utente") && (
                <select
                    className="input-style"
                    value={filtro.utente || ""}
                    onChange={(e) =>
                        setFiltro((p) => ({ ...p, utente: e.target.value || null }))
                    }
                >
                    <option value="">🧑‍💼 Tutti gli utenti</option>
                    {opzioniUtenti.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                            {u.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("membri") && (
                <div className="relative membri-dropdown">
                    <select
                        multiple
                        className="input-style"
                        value={filtro.membri}
                        onChange={(e) =>
                            setFiltro((p) => ({
                                ...p,
                                membri: Array.from(e.target.selectedOptions).map(
                                    (o) => o.value
                                ),
                            }))
                        }
                    >
                        {opzioniMembri.map((m) => (
                            <option key={m.id} value={String(m.id)}>
                                {m.nome}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {campi.includes("cliente") && (
                <select
                    className="input-style"
                    value={filtro.cliente || ""}
                    onChange={(e) =>
                        setFiltro((p) => ({ ...p, cliente: e.target.value || null }))
                    }
                >
                    <option value="">👥 Tutti i clienti</option>
                    {opzioniClienti.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                            {c.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("stato") && (
                <select
                    className="input-style"
                    value={filtro.stato ?? ""}
                    onChange={(e) =>
                        setFiltro((p) => ({
                            ...p,
                            stato: e.target.value ? Number(e.target.value) : null,
                        }))
                    }
                >
                    <option value="">📊 Tutti gli stati</option>
                    {opzioniStati.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                            {s.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("priorita") && (
                <select
                    className="input-style"
                    value={filtro.priorita ?? ""}
                    onChange={(e) =>
                        setFiltro((p) => ({
                            ...p,
                            priorita: e.target.value ? Number(e.target.value) : null,
                        }))
                    }
                >
                    <option value="">⏫ Tutte le priorità</option>
                    {opzioniPriorita.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                            {p.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("date") && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMostraCalendario((prev) => !prev)}
                        className="input-style w-full text-start whitespace-nowrap "
                    >
                        📅{" "}
                        {filtro.dataInizio && filtro.dataFine
                            ? `${format(new Date(filtro.dataInizio), "dd/MM/yy")} - ${format(
                                new Date(filtro.dataFine),
                                "dd/MM/yy"
                            )}`
                            : "Filtra per intervallo"}
                    </button>
                    {mostraCalendario && (
                        <div
                            ref={calendarioRef}
                            className="absolute z-20 mt-2 popup-panel shadow-xl rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f2937]"
                        >
                            <DateRange
                                editableDateInputs
                                onChange={(item) => {
                                    const { startDate, endDate, key } = item.selection;
                                    setRangeSelezionato([
                                        { startDate, endDate, key: key ?? "selection" },
                                    ]);
                                }}
                                moveRangeOnFirstSelection={false}
                                ranges={[
                                    {
                                        startDate: rangeSelezionato[0].startDate ?? new Date(),
                                        endDate: rangeSelezionato[0].endDate ?? new Date(),
                                        key: "selection",
                                    },
                                ]}
                                showDateDisplay={false}
                                rangeColors={["#2563eb"]}
                                className="popup-panel text-theme border rounded shadow-xl"
                            />
                            <div className="flex justify-end px-4 py-2">
                                <button
                                    className="text-sm text-red-600 hover:underline"
                                    onClick={() => {
                                        setRangeSelezionato([
                                            {
                                                startDate: undefined,
                                                endDate: undefined,
                                                key: "selection",
                                            },
                                        ]);
                                        setFiltro((p) => ({
                                            ...p,
                                            dataInizio: null,
                                            dataFine: null,
                                        }));
                                        setMostraCalendario(false);
                                    }}
                                >
                                    ❌ Pulisci intervallo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {campi.includes("ordine") && (
                <select
                    className="input-style"
                    value={filtro.ordine || ""}
                    onChange={(e) =>
                        setFiltro((p) => ({ ...p, ordine: e.target.value || null }))
                    }
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
            )}
        </div>
    );
}

/* ===========================
   ORDINAMENTO GENERICO
=========================== */
export function ordinaClientSide<T>(
    dati: T[],
    criterio: string | null,
    getter: (item: T, criterio: string) => any
): T[] {
    if (!criterio) return dati;

    if (criterio === "priorita_urgente" || criterio === "priorita_meno_urgente") {
        const crescente = criterio === "priorita_urgente";
        return [...dati].sort((a, b) => {
            const aVal = getter(a, "priorita") ?? Infinity;
            const bVal = getter(b, "priorita") ?? Infinity;
            if (aVal !== bVal) return crescente ? aVal - bVal : bVal - aVal;

            const aData = getter(a, "consegna")
                ? new Date(getter(a, "consegna")).getTime()
                : Infinity;
            const bData = getter(b, "consegna")
                ? new Date(getter(b, "consegna")).getTime()
                : Infinity;
            return aData - bData;
        });
    }

    const [conValore, senzaValore] = dati.reduce<[T[], T[]]>(
        (acc, item) => {
            const valore = getter(item, criterio);
            if (valore === null || valore === undefined || valore === "")
                acc[1].push(item);
            else acc[0].push(item);
            return acc;
        },
        [[], []]
    );

    conValore.sort((a, b) => {
        const aVal = getter(a, criterio);
        const bVal = getter(b, criterio);
        if (criterio.endsWith("_desc") || criterio.endsWith("za"))
            return bVal > aVal ? 1 : -1;
        return aVal > bVal ? 1 : -1;
    });

    return [...conValore, ...senzaValore];
}