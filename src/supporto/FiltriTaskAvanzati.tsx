import { useEffect, useMemo, useState } from "react";

export type Task = {
    id: string;
    nome: string;
    consegna?: string | null;
    stato?: { id: number; nome: string } | null;
    priorita?: { id: number; nome: string } | null;
    progetto?: { id: string; nome: string } | null;
    assegnatari?: { id: string; nome: string }[]; // ← può essere singolo o multiplo
};

export type FiltroAvanzato = {
    progetto?: string | null;
    utente?: string | null;
    stato?: number | null;
    priorita?: number | null;
    consegna?: string | null;
    ordine?: string | null;
};

type Props = {
    tasks: Task[];
    isAdmin: boolean;
    soloMie: boolean;
    onChange: (f: FiltroAvanzato) => void;
};

export default function FiltriTaskAvanzati({ tasks, isAdmin, soloMie, onChange }: Props) {
    const [filtro, setFiltro] = useState<FiltroAvanzato>({
        progetto: null,
        utente: null,
        stato: null,
        priorita: null,
        consegna: null,
        ordine: null,
    });

    // 🔁 Filtra le task che corrispondono ai filtri attuali
    const taskFiltrate = useMemo(() => {
        return tasks.filter((t) => {
            if (filtro.progetto && t.progetto?.id !== filtro.progetto) return false;
            if (filtro.utente && !t.assegnatari?.some((u) => u.id === filtro.utente)) return false;
            if (filtro.stato && t.stato?.id !== filtro.stato) return false;
            if (filtro.priorita && t.priorita?.id !== filtro.priorita) return false;
            if (filtro.consegna && t.consegna !== filtro.consegna) return false;
            return true;
        });
    }, [tasks, filtro]);

    // 🔄 Aggiorna filtro esterno ogni volta che cambia qualcosa
    useEffect(() => {
        onChange(filtro);
    }, [filtro]);

    // 🔢 Opzioni dinamiche in base alle task filtrate
    const opzioniProgetti = useMemo(() => {
        const set = new Map();
        taskFiltrate.forEach((t) => {
            if (t.progetto) set.set(t.progetto.id, t.progetto.nome);
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [taskFiltrate]);

    const opzioniUtenti = useMemo(() => {
        const set = new Map();
        taskFiltrate.forEach((t) => {
            t.assegnatari?.forEach((u) => set.set(u.id, u.nome));
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [taskFiltrate]);

    const opzioniStati = useMemo(() => {
        const set = new Map();
        taskFiltrate.forEach((t) => {
            if (t.stato) set.set(t.stato.id, t.stato.nome);
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [taskFiltrate]);

    const opzioniPriorita = useMemo(() => {
        const set = new Map();
        taskFiltrate.forEach((t) => {
            if (t.priorita) set.set(t.priorita.id, t.priorita.nome);
        });
        return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
    }, [taskFiltrate]);

    const opzioniDate = useMemo(() => {
        const set = new Set<string>();
        taskFiltrate.forEach((t) => {
            if (t.consegna) set.add(t.consegna);
        });
        return Array.from(set).sort();
    }, [taskFiltrate]);

    return (
        <div className="flex flex-col gap-3 mb-6 md:grid md:grid-cols-3 md:gap-4">
            {/* Riga 1 */}
            <select
                className="input-style w-full lg:w-auto"
                value={filtro.progetto || ""}
                onChange={(e) => setFiltro((prev) => ({ ...prev, progetto: e.target.value || null }))}
            >
                <option value="">📁 Tutti i progetti</option>
                {opzioniProgetti.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.nome}
                    </option>
                ))}
            </select>

            {isAdmin && !soloMie ? (
                <select
                    className="input-style w-full lg:w-auto"
                    value={filtro.utente || ""}
                    onChange={(e) => setFiltro((prev) => ({ ...prev, utente: e.target.value || null }))}
                >
                    <option value="">🧑‍💼 Tutti gli utenti</option>
                    {opzioniUtenti.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.nome}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="hidden md:block" />
            )}

            <select
                className="input-style w-full lg:w-auto"
                value={filtro.stato || ""}
                onChange={(e) => setFiltro((prev) => ({ ...prev, stato: Number(e.target.value) || null }))}
            >
                <option value="">📊 Tutti gli stati</option>
                {opzioniStati.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.nome}
                    </option>
                ))}
            </select>

            {/* Riga 2 */}
            <select
                className="input-style w-full lg:w-auto"
                value={filtro.priorita || ""}
                onChange={(e) => setFiltro((prev) => ({ ...prev, priorita: Number(e.target.value) || null }))}
            >
                <option value="">⏫ Tutte le priorità</option>
                {opzioniPriorita.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.nome}
                    </option>
                ))}
            </select>

            <select
                className="input-style w-full lg:w-auto"
                value={filtro.consegna || ""}
                onChange={(e) => setFiltro((prev) => ({ ...prev, consegna: e.target.value || null }))}
            >
                <option value="">📅 Tutte le date</option>
                {opzioniDate.map((d) => (
                    <option key={d} value={d}>
                        📅 {new Date(d).toLocaleDateString()}
                    </option>
                ))}
            </select>

            <select
                className="input-style w-full lg:w-auto"
                value={filtro.ordine || ""}
                onChange={(e) => setFiltro((prev) => ({ ...prev, ordine: e.target.value || null }))}
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
