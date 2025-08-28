// src/Liste/resourceConfigs.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFlag,
    faUserShield,
    faExclamationTriangle,
    faPlus,
    faAddressBook,
    faEnvelope,
    faPhone,
    faStickyNote,
    faFolderOpen,
    faUser,
    faProjectDiagram,
    faLink,
    faCheckCircle,
    faTasks,
    faPlay,
    faStop,
    faClock,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";

import MiniStatoEditorModal from "../Modifica/MiniStatoEditorModal";
import MiniRuoloEditorModal from "../Modifica/MiniRuoloEditorModal";
import MiniPrioritaEditorModal from "../Modifica/MiniPrioritaEditorModal";
import MiniClientEditorModal from "../Modifica/MiniClientEditorModal";
import MiniUserEditorModal from "../Modifica/MiniUserEditorModal";
import MiniProjectEditorModal from "../Modifica/MiniProjectEditorModal";
import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
// ⬇️ AGGIUNGI a fianco degli altri import da fetchData
import {
    fetchStatiDeleted,
    fetchRuoliDeleted,
    fetchPrioritaDeleted,
    fetchClientiDeleted,
    fetchUtentiDeleted,
    fetchProgettiDeleted,
    fetchTasksDeleted,
    cestinoActions,
} from "../supporto/fetchData";

import {
    fetchStati,
    fetchRuoli,
    fetchPriorita,
    fetchClienti,
    fetchUtenti,
    fetchProgetti,
    fetchTasks,
} from "../supporto/fetchData";
import { supabase } from "../supporto/supabaseClient";

// 🔹 soft delete helpers
import { softDelete } from "../supporto/softDelete";
import {
    softDeleteTask,
    softDeleteProgetto,
    softDeleteUtente,
    softDeleteCliente,
} from "../supporto/softDeleteRecursive";
import type { JSX } from "react";

// ============================================================
// Tipi locali (allineati a ListaDinamica) — niente import, evitiamo cicli
// ============================================================
// ⬇️ AGGIUNGI questo tipo di supporto, vicino agli altri tipi
type CestinoActions = {
    restore: (id: string | number) => Promise<void>;
    hardDelete: (id: string | number) => Promise<void>;
};

type CestinoConfig<T> = {
    fetch: (args: { filtro: FiltroIntestazione; utenteId: string | null }) => Promise<T[]>;
    actions: CestinoActions;
};

// ⬇️ NEL TIPO ResourceConfig aggiungi la proprietà opzionale `cestino`
export type ResourceConfig<T extends { id: string | number }> = {
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

    // ⬇️ nuovo
    cestino?: CestinoConfig<T>;
};

export type FiltroIntestazione = {
    soloMie?: boolean;
    soloCompletate?: boolean; // tasks
    soloCompletati?: boolean; // progetti
    // altri filtri opzionali, pass-through
    [k: string]: any;
};

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
    navigate: (to: string) => void;
    extra?: any;
    patchItem?: (id: string | number, patch: Partial<T>) => void;
};


// ============================================================
// Tipi dati minimi (compatibili coi tuoi fetch esistenti)
// ============================================================
type Stato = { id: number; nome: string; colore?: string | null };
type Ruolo = { id: number; nome: string };
type Priorita = { id: number; nome: string; colore?: string | null };

type Cliente = {
    id: string;
    nome: string;
    email?: string | null;
    telefono?: string | null;
    avatar_url?: string | null;
    note?: string | null;
    progetti?: { id: string; nome: string; slug?: string }[];
};

type Utente = {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    avatar_url?: string | null;
    ruolo: { id: number; nome: string };
    progetti: { id: string; nome: string; slug?: string }[];
};

type Progetto = {
    id: string;
    nome: string;
    slug?: string;
    consegna: string | null;
    stato?: { id: number; nome: string } | null;
    priorita?: { id: number; nome: string } | null;
    cliente?: { id: string; nome: string } | null;
    membri: { id: string; nome: string; cognome?: string | null }[];
    completato?: boolean;
    fine_progetto?: string | null;
    tempo_stimato?: string | null;
    note?: string | null;
};

type Task = {
    id: string;
    nome: string;
    slug?: string;
    parent_id?: string | null;
    consegna: string | null;
    stato?: { id: number; nome: string } | null;
    priorita?: { id: number; nome: string } | null;
    progetto?: { id: string; nome: string } | null;
    tempo_stimato?: number | null;
    note?: string | null;
    fine_task?: string | null;
    assegnatari?: { id: string; nome: string; cognome?: string | null }[];
};

type TimeEntry = {
    id: string;
    utente?: { id: string; nome: string; cognome: string };
    progetto?: { id: string; nome: string };
    task?: { id: string; nome: string };
    data_inizio: string;
    data_fine: string;
    durata: number;
};

// ============================================================
// Helpers UI
// ============================================================
const formatDate = (val: string | null) => (val ? new Date(val).toLocaleDateString() : "—");
const formatDurata = (value: number | string | null): string => {
    if (!value) return "0m";
    if (typeof value === "number") {
        const ore = Math.floor(value / 3600);
        const minuti = Math.floor((value % 3600) / 60);
        const secondi = value % 60;
        if (ore > 0 && secondi > 0) return `${ore}h ${minuti}m ${secondi}s`;
        if (ore > 0) return `${ore}h ${minuti}m`;
        if (minuti > 0 && secondi > 0) return `${minuti}m ${secondi}s`;
        if (minuti > 0) return `${minuti}m`;
        return `${secondi}s`;
    }
    return "0m";
};
// 🔧 PATCH OTTIMISTICO GENERICO (riusabile ovunque in questo file)
function optimisticPatch<T extends { id: string | number }>(
    item: T,
    patch: Partial<T>,
    setFiltro: (f: FiltroIntestazione) => void,
    filtro: FiltroIntestazione
) {
    Object.assign(item as any, patch); // aggiorna il record in memoria
    setFiltro({ ...filtro });          // forza il re-render della tabella senza refetch
}

// ============================================================
// STATI
// ============================================================
export const statiConfig: ResourceConfig<Stato> = {
    key: "stati",
    titolo: "Lista Stati",
    icona: faFlag,
    coloreIcona: "text-green-500",
    fetch: async () => await fetchStati(),
    cestino: {
        fetch: async () => await fetchStatiDeleted(),
        actions: cestinoActions.stati,
    },
    colonne: [
        { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
        {
            chiave: "colore",
            label: "Colore",
            className: "w-20 text-center",
            render: (s) =>
                s.colore ? (
                    <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: s.colore }} />
                ) : (
                    "-"
                ),
        },
    ],
    azioni: (s) => (
        <button
            onClick={async (e) => {
                e.stopPropagation();
                if (!window.confirm("Eliminare questo stato?")) return;
                const res = await softDelete("stati", Number(s.id));
                if (!res.success) alert("Errore eliminazione: " + res.error);
            }}
            className="icon-color hover:text-red-600"
            title="Elimina"
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    renderModaleModifica: (id, onClose) => <MiniStatoEditorModal statoId={id} onClose={onClose} />,
    azioniExtra: (
        <button
            type="button"
            onClick={() => (window as any).__openMiniCreate?.("stato")}
            className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
        >
            <FontAwesomeIcon icon={faPlus} /> Crea
        </button>
    ),
};


// ============================================================
// RUOLI
// ============================================================
export const ruoliConfig: ResourceConfig<Ruolo> = {
    key: "ruoli",
    titolo: "Lista Ruoli",
    icona: faUserShield,
    coloreIcona: "text-blue-500",
    fetch: async () => await fetchRuoli(),
    cestino: {
        fetch: async () => await fetchRuoliDeleted(),
        actions: cestinoActions.ruoli,
    },
    colonne: [{ chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" }],
    azioni: (r) => (
        <button
            onClick={async (e) => {
                e.stopPropagation();
                if (!window.confirm("Eliminare questo ruolo?")) return;
                const res = await softDelete("ruoli", Number(r.id));
                if (!res.success) alert("Errore eliminazione: " + res.error);
            }}
            className="icon-color hover:text-red-600"
            title="Elimina"
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    renderModaleModifica: (id, onClose) => <MiniRuoloEditorModal ruoloId={id} onClose={onClose} />,
    azioniExtra: (
        <button
            type="button"
            onClick={() => (window as any).__openMiniCreate?.("ruolo")}
            className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
        >
            <FontAwesomeIcon icon={faPlus} /> Crea
        </button>
    ),
};


// ============================================================
// PRIORITÀ
// ============================================================
export const prioritaConfig: ResourceConfig<Priorita> = {
    key: "priorita",
    titolo: "Lista Priorità",
    icona: faExclamationTriangle,
    coloreIcona: "text-red-500",
    fetch: async () => await fetchPriorita(),
    cestino: {
        fetch: async () => await fetchPrioritaDeleted(),
        actions: cestinoActions.priorita,
    },
    colonne: [
        { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
        {
            chiave: "colore",
            label: "Colore",
            className: "w-20 text-center",
            render: (p) =>
                p.colore ? (
                    <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: p.colore }} />
                ) : (
                    "-"
                ),
        },
    ],
    azioni: (p) => (
        <button
            onClick={async (e) => {
                e.stopPropagation();
                if (!window.confirm("Eliminare questa priorità?")) return;
                const res = await softDelete("priorita", Number(p.id));
                if (!res.success) alert("Errore eliminazione: " + res.error);
            }}
            className="icon-color hover:text-red-600"
            title="Elimina"
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    renderModaleModifica: (id, onClose) => <MiniPrioritaEditorModal prioritaId={id} onClose={onClose} />,
    azioniExtra: (
        <button
            type="button"
            onClick={() => (window as any).__openMiniCreate?.("priorita")}
            className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
        >
            <FontAwesomeIcon icon={faPlus} /> Crea
        </button>
    ),
};


// ============================================================
// CLIENTI
// ============================================================
export const clientiConfig: ResourceConfig<Cliente> = {
    key: "clienti",
    titolo: "Lista Clienti",
    icona: faAddressBook,
    coloreIcona: "text-orange-500",
    fetch: async () => await fetchClienti(),
    cestino: {
        fetch: async () => await fetchClientiDeleted(),
        actions: cestinoActions.clienti,
    },
    colonne: [
        {
            chiave: "avatar",
            label: "",
            className: "w-10 shrink-0",
            render: (c) =>
                c.avatar_url ? (
                    <img
                        src={c.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
                        {c.nome?.[0]?.toUpperCase() ?? "?"}
                    </div>
                ),
        },
        { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
    ],
    azioni: (c) => {
        const progetti = Array.isArray(c.progetti) ? c.progetti : [];
        const hasProgetti = progetti.length > 0;
        const openModal = (window as any).__openClienteProgetti;

        return (
            <>
                {hasProgetti && typeof openModal === "function" && (
                    <button
                        onClick={() => openModal(c)}
                        className="icon-color hover:text-violet-600"
                        title="Progetti cliente"
                    >
                        <FontAwesomeIcon icon={faFolderOpen} />
                    </button>
                )}
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm("Eliminare questo cliente?")) return;
                        try {
                            await softDeleteCliente(c.id);
                        } catch (err: any) {
                            alert("Errore eliminazione: " + err.message);
                        }
                    }}
                    className="icon-color hover:text-red-600"
                    title="Elimina"
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            </>
        );
    },
    renderDettaglio: (c) => (
        <div className="space-y-1">
            {c.email && (
                <p>
                    <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-500" />
                    {c.email}
                </p>
            )}
            {c.telefono && (
                <p>
                    <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-500" />
                    {c.telefono}
                </p>
            )}
            {c.note && (
                <p>
                    <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-500" />
                    {c.note}
                </p>
            )}
        </div>
    ),
    renderModaleModifica: (id, onClose) => <MiniClientEditorModal clienteId={id} onClose={onClose} />,
};


// ============================================================
// UTENTI
// ============================================================
export const utentiConfig: ResourceConfig<Utente> = {
    key: "utenti",
    titolo: "Lista Utenti",
    icona: faUser,
    coloreIcona: "text-purple-500",
    fetch: async () => await fetchUtenti(),
    cestino: {
        fetch: async () => await fetchUtentiDeleted(),
        actions: cestinoActions.utenti,
    },
    colonne: [
        {
            chiave: "avatar",
            label: "",
            className: "w-10 shrink-0",
            render: (u) =>
                u.avatar_url ? (
                    <img
                        src={u.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
                        {u.nome[0]?.toUpperCase() ?? "?"}
                    </div>
                ),
        },
        {
            chiave: "nomeCompleto",
            label: "Nome",
            className: "flex-1 font-medium truncate",
            render: (u) => `${u.nome} ${u.cognome}`,
        },
    ],
    azioni: (u) => (
        <>
            {(u.progetti?.length ?? 0) > 0 && (
                <button
                    onClick={() => (window as any).__openUtenteProgetti?.(u)}
                    className="icon-color hover:text-violet-600"
                    title="Progetti utente"
                >
                    <FontAwesomeIcon icon={faFolderOpen} />
                </button>
            )}
            <button
                onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm("Eliminare questo utente?")) return;
                    try {
                        await softDeleteUtente(u.id);
                    } catch (err: any) {
                        alert("Errore eliminazione: " + err.message);
                    }
                }}
                className="icon-color hover:text-red-600"
                title="Elimina"
            >
                <FontAwesomeIcon icon={faTrash} />
            </button>
        </>
    ),
    renderDettaglio: (u) => (
        <>
            <p>Email: {u.email}</p>
            <p>Ruolo: {u.ruolo?.nome}</p>
        </>
    ),
    renderModaleModifica: (id, onClose) => <MiniUserEditorModal utenteId={id} onClose={onClose} />,
};


// ============================================================
// PROGETTI
// ============================================================
export const progettiConfig: ResourceConfig<Progetto> = {
    key: "progetti",
    titolo: "Lista Progetti",
    icona: faProjectDiagram,
    coloreIcona: "text-blue-500",
    useHeaderFilters: true,
    fetch: async ({ filtro, utenteId }) => {
        const data = await fetchProgetti({ ...filtro, soloMie: !!filtro.soloMie }, utenteId ?? undefined);
        return filtro.soloCompletati ? data.filter((p: any) => p.completato === true || p.fine_progetto != null) : data;
    },
    cestino: {
        fetch: async ({ filtro }) => await fetchProgettiDeleted(filtro),
        actions: cestinoActions.progetti,
    },
    colonne: [
        {
            chiave: "nome",
            label: "Nome",
            render: (proj, { utenteId }) => (
                <div className="flex items-center gap-2">
                    {proj.membri?.some((m) => m.id === utenteId) && (
                        <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Membro" />
                    )}
                    {(proj.completato || proj.fine_progetto) && (
                        <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completato" />
                    )}
                    <span>{proj.nome}</span>
                </div>
            ),
        },
        { chiave: "consegna", label: "Consegna", className: "w-40 hidden lg:block", render: (p) => formatDate(p.consegna) },
        { chiave: "stato", label: "Stato", className: "w-32 hidden lg:block", render: (p) => p.stato?.nome ?? "—" },
        { chiave: "priorita", label: "Priorità", className: "w-32 hidden lg:block", render: (p) => p.priorita?.nome ?? "—" },
    ],
    azioni: (proj, { navigate, filtro, setFiltro }) => {
        const completaProgetto = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (proj.fine_progetto) return;

            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from("progetti")
                .update({ fine_progetto: nowIso })
                .eq("id", proj.id);

            if (error) {
                alert("Errore nel completare il progetto: " + error.message);
                return;
            }

            // ✅ patch locale (ottimistico)
            optimisticPatch(proj, { fine_progetto: nowIso }, setFiltro, filtro);
        };

        return (
            <>
                {/* 🔹 Pulsante check per completare */}
                <button
                    onClick={completaProgetto}
                    className="icon-color hover:text-emerald-600"
                    title={proj.fine_progetto ? "Già completato" : "Segna come completato"}
                >
                    <FontAwesomeIcon icon={faCheckCircle} />
                </button>

                <button
                    onClick={() => navigate(`/progetti/${proj.slug ?? proj.id}`)}
                    className="icon-color hover:text-green-600"
                    title="Vai al dettaglio"
                >
                    <FontAwesomeIcon icon={faProjectDiagram} />
                </button>
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm("Eliminare questo progetto?")) return;
                        try {
                            await softDeleteProgetto(proj.id);
                        } catch (err: any) {
                            alert("Errore eliminazione: " + err.message);
                        }
                    }}
                    className="icon-color hover:text-red-600"
                    title="Elimina"
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            </>
        );
    },

    renderDettaglio: (proj) => (
        <div className="space-y-1">
            {proj.cliente?.nome && <p>👤 Cliente: {proj.cliente.nome}</p>}
            {proj.membri?.length > 0 && (
                <p>👥 Membri: {proj.membri.map((m) => `${m.nome} ${m.cognome ?? ""}`).join(", ")}</p>
            )}
            {proj.tempo_stimato && <p>⏱️ Tempo stimato: {proj.tempo_stimato}</p>}
            {proj.note && <p>🗒️ Note: {proj.note}</p>}
        </div>
    ),
    renderModaleModifica: (id, onClose) => <MiniProjectEditorModal progettoId={id} onClose={onClose} />,
};


// ============================================================
// TIME ENTRIES
// ============================================================
export const timeEntriesConfig: ResourceConfig<TimeEntry> = {
    key: "time_entries",
    titolo: "Registro attività",
    icona: faClock,
    coloreIcona: "text-gray-500",
    // fetch normale
    fetch: async () => {
        const { data, error } = await supabase
            .from("time_entries")
            .select(
                `
          id, data_inizio, data_fine, durata, deleted_at,
          utente:utente_id (id, nome, cognome),
          progetto:progetto_id (id, nome),
          task:task_id (id, nome)
        `
            )
            .is("deleted_at", null)
            .order("data_inizio", { ascending: false });
        if (error) throw error;
        return data as any as TimeEntry[];
    },
    // ✅ icona cestino (soft delete) in vista normale
    azioni: (t) => (
        <button
            onClick={async (e) => {
                e.stopPropagation();
                if (!window.confirm("Eliminare questa registrazione di tempo?")) return;
                try {
                    await softDelete("time_entries", Number(t.id)); // PK bigint → Number()
                } catch (err: any) {
                    alert("Errore eliminazione: " + err.message);
                }
            }}
            className="icon-color hover:text-red-600"
            title="Elimina"
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),

    // cestino: fetch + azioni (restore + hard delete)
    cestino: {
        fetch: async () => {
            const { data, error } = await supabase
                .from("time_entries")
                .select(`
          id, data_inizio, data_fine, durata, deleted_at,
          utente:utente_id (id, nome, cognome),
          progetto:progetto_id (id, nome),
          task:task_id (id, nome)
        `)
                .not("deleted_at", "is", null)
                .order("data_inizio", { ascending: false });
            if (error) throw error;
            return (data || []) as any as TimeEntry[];
        },
        actions: {
            // 🔄 Restore
            restore: async (id: string | number) => {
                const { error } = await supabase.from("time_entries").update({ deleted_at: null }).eq("id", id);
                if (error) throw error;
            },
            // 🗑️ Hard delete
            hardDelete: async (id: string | number) => {
                const { error } = await supabase.from("time_entries").delete().eq("id", id);
                if (error) throw error;
            },
        },
    },
    colonne: [
        { chiave: "utente", label: "Utente", render: (t) => (t.utente ? `${t.utente.nome} ${t.utente.cognome}` : "—"), className: "w-40" },
        { chiave: "progetto", label: "Progetto", render: (t) => t.progetto?.nome ?? "—", className: "w-40" },
        { chiave: "task", label: "Task", render: (t) => t.task?.nome ?? "—", className: "flex-1" },
        { chiave: "data_inizio", label: "Inizio", render: (t) => new Date(t.data_inizio).toLocaleString(), className: "w-40" },
        { chiave: "data_fine", label: "Fine", render: (t) => (t.data_fine ? new Date(t.data_fine).toLocaleString() : "—"), className: "w-40" },
        { chiave: "durata", label: "Durata", render: (t) => formatDurata(t.durata), className: "w-32" },
    ],
};

// ============================================================
// TASK — con setup leggero per il timer
// ============================================================
export const tasksConfig: ResourceConfig<Task> = {
    key: "tasks",
    titolo: "Lista Task",
    icona: faTasks,
    coloreIcona: "text-green-500",
    useHeaderFilters: true,
    fetch: async ({ filtro, utenteId }) => {
        const data = await fetchTasks({ ...filtro, soloMie: !!filtro.soloMie }, utenteId ?? undefined);
        const roots = data.filter((t: any) => !t.parent_id);
        return filtro.soloCompletate ? roots.filter((t: any) => t.fine_task != null) : roots;
    },
    cestino: {
        fetch: async ({ filtro }) => {
            const data = await fetchTasksDeleted(filtro);
            return data.filter((t: any) => !t.parent_id);
        },
        actions: cestinoActions.tasks,
    },
    setup: ({ utenteId }) => {
        let active: { taskId: string; startTime: Date } | null = null;
        const start = (taskId: string) => {
            active = { taskId, startTime: new Date() };
        };
        const stop = async (task: Task | undefined) => {
            if (!active || !utenteId) {
                active = null;
                return;
            }
            const endTime = new Date();
            const durata = Math.floor((endTime.getTime() - active.startTime.getTime()) / 1000);

            const t = task;
            if (!t?.progetto?.id) {
                alert("Questa task non è collegata a nessun progetto");
                active = null;
                return;
            }

            const { error } = await supabase.from("time_entries").insert({
                utente_id: utenteId,
                progetto_id: t.progetto.id,
                task_id: t.id,
                nome: t.nome,
                data_inizio: active.startTime.toISOString(),
                data_fine: endTime.toISOString(),
                durata,
            });
            if (error) alert("Errore nel salvataggio del tempo");
            active = null;
        };
        const isRunning = (taskId: string) => active?.taskId === taskId;
        return { extra: { start, stop, isRunning } };
    },
    colonne: [
        {
            chiave: "nome",
            label: "Nome",
            render: (task, { utenteId }) => (
                <div className="flex items-center gap-2">
                    {task.assegnatari?.some((u) => u.id === utenteId) && (
                        <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Assegnata a te" />
                    )}
                    {task.fine_task && (
                        <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completata" />
                    )}
                    <span>{task.nome}</span>
                </div>
            ),
        },
        { chiave: "consegna", label: "Consegna", className: "w-40 hidden lg:block", render: (t) => formatDate(t.consegna) },
        { chiave: "stato", label: "Stato", className: "w-32 hidden lg:block", render: (t) => t.stato?.nome ?? "—" },
        { chiave: "priorita", label: "Priorità", className: "w-32 hidden lg:block", render: (t) => t.priorita?.nome ?? "—" },
    ],
    azioni: (task, { navigate, extra, patchItem }) => {
        const { start, stop, isRunning } = extra || {};
        const running = isRunning?.(task.id);

        const completaTask = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (task.fine_task) return;

            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from("tasks")
                .update({ fine_task: nowIso })
                .eq("id", task.id);

            if (error) {
                alert("Errore nel completare la task: " + error.message);
                return;
            }

            // ✅ aggiorna solo questa riga in memoria, nessun refetch
            patchItem?.(task.id, { fine_task: nowIso });
        };

        return (
            <>
                {task.progetto?.id && (task.assegnatari?.length ?? 0) > 0 ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            running ? stop?.(task) : start?.(task.id);
                        }}
                        className={`icon-color ${running ? "hover:text-red-600" : "hover:text-green-600"}`}
                        title={running ? "Ferma timer" : "Avvia timer"}
                    >
                        <FontAwesomeIcon icon={running ? faStop : faPlay} />
                    </button>
                ) : null}

                {/* ✅ check: completa senza ricaricare */}
                <button
                    onClick={completaTask}
                    className="icon-color hover:text-emerald-600"
                    title={task.fine_task ? "Già completata" : "Segna come completata"}
                >
                    <FontAwesomeIcon icon={faCheckCircle} />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.slug ?? task.id}`); }}
                    className="icon-color hover:text-green-600"
                    title="Vai al dettaglio"
                >
                    <FontAwesomeIcon icon={faTasks} />
                </button>

                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm("Eliminare questa task?")) return;
                        try { await softDeleteTask(task.id); } catch (err: any) { alert("Errore eliminazione: " + err.message); }
                    }}
                    className="icon-color hover:text-red-600"
                    title="Elimina"
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            </>
        );
    },



    renderDettaglio: (task) => (
        <div className="space-y-2">
            {task.progetto?.nome && <p>📁 Progetto: {task.progetto.nome}</p>}
            {typeof task.tempo_stimato === "number" && <p>⏱️ Tempo stimato: {formatDurata(task.tempo_stimato)}</p>}
            {task.assegnatari?.length ? (
                <p>👥 Assegnata a: {task.assegnatari.map((u) => `${u.nome} ${u.cognome || ""}`).join(", ")}</p>
            ) : null}
            {task.note && <p>🗒️ {task.note}</p>}
        </div>
    ),
    renderModaleModifica: (id, onClose) => <MiniTaskEditorModal taskId={id} onClose={onClose} />,
};


// ============================================================
// REGISTRO CENTRALE
// ============================================================
export const resourceConfigs = {
    stati: statiConfig,
    ruoli: ruoliConfig,
    priorita: prioritaConfig,
    clienti: clientiConfig,
    utenti: utentiConfig,
    progetti: progettiConfig,
    tasks: tasksConfig,
    time_entries: timeEntriesConfig,
};

export type ResourceKey = keyof typeof resourceConfigs;
