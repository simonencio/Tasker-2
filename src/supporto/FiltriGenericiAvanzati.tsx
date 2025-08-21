
// src/supporto/FiltriGenericiAvanzati.tsx
import { useEffect, useRef, useState } from "react";
import { DateRange, type Range } from "react-date-range";
import { format } from "date-fns";
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

type Props<T> = {
    dati: T[];
    campi: CampoFiltro[];
    onChange: (f: FiltroAvanzatoGenerico) => void;
    estrattori: {
        progetto?: (d: T) => { id: string; nome: string } | null;
        utente?: (d: T) => { id: string; nome: string }[] | null;
        membri?: (d: T) => { id: string; nome: string }[] | null;
        cliente?: (d: T) => { id: string; nome: string } | null;
        stato?: (d: T) => { id: number; nome: string } | null;
        priorita?: (d: T) => { id: number; nome: string } | null;
        consegna?: (d: T) => string | null;
    };
};

export default function FiltriGenericiAvanzati<T>({
    dati,
    campi,
    onChange,
    estrattori,
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

    useEffect(() => {
        const { startDate, endDate } = rangeSelezionato[0];
        setFiltro((prev) => ({
            ...prev,
            dataInizio: startDate ? format(startDate, "yyyy-MM-dd") : null,
            dataFine: endDate ? format(endDate, "yyyy-MM-dd") : null,
        }));
    }, [rangeSelezionato]);

    useEffect(() => {
        onChange(filtro);
    }, [filtro]);

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

    const creaOpzioni = <K extends string | number>(
        getter: (d: T) => { id: K; nome: string } | { id: K; nome: string }[] | null
    ) => {
        const map = new Map<K, string>();
        dati.forEach((d) => {
            const val = getter(d);
            if (!val) return;
            if (Array.isArray(val)) val.forEach((v) => map.set(v.id, v.nome));
            else map.set(val.id, val.nome);
        });
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
    };

    const opzioniProgetti = campi.includes("progetto") && estrattori.progetto ? creaOpzioni(estrattori.progetto) : [];
    const opzioniUtenti = campi.includes("utente") && estrattori.utente ? creaOpzioni(estrattori.utente) : [];
    const opzioniMembri = campi.includes("membri") && estrattori.membri ? creaOpzioni(estrattori.membri) : [];
    const opzioniClienti = campi.includes("cliente") && estrattori.cliente ? creaOpzioni(estrattori.cliente) : [];
    const opzioniStati = campi.includes("stato") && estrattori.stato ? creaOpzioni(estrattori.stato) : [];
    const opzioniPriorita = campi.includes("priorita") && estrattori.priorita ? creaOpzioni(estrattori.priorita) : [];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6 w-full">
            {campi.includes("progetto") && (
                <select
                    className="input-style"
                    value={filtro.progetto || ""}
                    onChange={(e) => setFiltro((p) => ({ ...p, progetto: e.target.value || null }))}
                >
                    <option value="">📁 Tutti i progetti</option>
                    {opzioniProgetti.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("utente") && (
                <select
                    className="input-style"
                    value={filtro.utente || ""}
                    onChange={(e) => setFiltro((p) => ({ ...p, utente: e.target.value || null }))}
                >
                    <option value="">🧑‍💼 Tutti gli utenti</option>
                    {opzioniUtenti.map((u) => (
                        <option key={u.id} value={u.id}>
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
                                membri: Array.from(e.target.selectedOptions).map((o) => o.value),
                            }))
                        }
                    >
                        {opzioniMembri.map((m) => (
                            <option key={m.id} value={m.id}>
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
                    onChange={(e) => setFiltro((p) => ({ ...p, cliente: e.target.value || null }))}
                >
                    <option value="">👥 Tutti i clienti</option>
                    {opzioniClienti.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("stato") && (
                <select
                    className="input-style"
                    value={filtro.stato || ""}
                    onChange={(e) => setFiltro((p) => ({ ...p, stato: Number(e.target.value) || null }))}
                >
                    <option value="">📊 Tutti gli stati</option>
                    {opzioniStati.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.nome}
                        </option>
                    ))}
                </select>
            )}

            {campi.includes("priorita") && (
                <select
                    className="input-style"
                    value={filtro.priorita || ""}
                    onChange={(e) => setFiltro((p) => ({ ...p, priorita: Number(e.target.value) || null }))}
                >
                    <option value="">⏫ Tutte le priorità</option>
                    {opzioniPriorita.map((p) => (
                        <option key={p.id} value={p.id}>
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
                                    setRangeSelezionato([{ startDate, endDate, key: key ?? "selection" }]);
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
                                        setRangeSelezionato([{ startDate: undefined, endDate: undefined, key: "selection" }]);
                                        setFiltro((p) => ({ ...p, dataInizio: null, dataFine: null }));
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
                    onChange={(e) => setFiltro((p) => ({ ...p, ordine: e.target.value || null }))}
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
            const aVal = getter(a, "priorita") ?? Infinity;   // ✅ usa priorita
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

    const [conValore, senzaValore] = dati.reduce<[T[], T[]]>((acc, item) => {
        const valore = getter(item, criterio);
        if (valore === null || valore === undefined || valore === "") acc[1].push(item);
        else acc[0].push(item);
        return acc;
    }, [[], []]);

    conValore.sort((a, b) => {
        const aVal = getter(a, criterio);
        const bVal = getter(b, criterio);
        if (criterio.endsWith("_desc") || criterio.endsWith("za")) return bVal > aVal ? 1 : -1;
        return aVal > bVal ? 1 : -1;
    });

    return [...conValore, ...senzaValore];
}
