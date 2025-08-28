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
    faPen,
    faUndo,
} from "@fortawesome/free-solid-svg-icons";

import MiniStatoEditorModal from "../Modifica/MiniStatoEditorModal";
import MiniRuoloEditorModal from "../Modifica/MiniRuoloEditorModal";
import MiniPrioritaEditorModal from "../Modifica/MiniPrioritaEditorModal";
import MiniClientEditorModal from "../Modifica/MiniClientEditorModal";
import MiniUserEditorModal from "../Modifica/MiniUserEditorModal";
import MiniProjectEditorModal from "../Modifica/MiniProjectEditorModal";
import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
import { useToast } from "../supporto/useToast";


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
import { softDelete } from "../supporto/softDelete";
import {
    softDeleteTask,
    softDeleteProgetto,
    softDeleteUtente,
    softDeleteCliente,
} from "../supporto/softDeleteRecursive";

import type {
    ResourceConfig,
    Stato,
    Ruolo,
    Priorita,
    Cliente,
    Utente,
    Progetto,
    Task,
    TimeEntry,
} from "./typesLista";
import { useEffect, useMemo, useState } from "react";

/* ============================================================
   UTILITÀ GLOBALI (semplici, riusabili, niente logica di vista)
   ============================================================ */

// Formattatori banali e chiari
const fmt = {
    date: (val: string | null) => (val ? new Date(val).toLocaleDateString() : "—"),
    durata: (value: number | string | null): string => {
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
    },
};

// Piccoli helper di dominio (semplici da leggere)
const is = {
    taskDone: (t: any) => !!t?.fine_task || t?.completata === true,
    projectDone: (p: any) => !!p?.fine_progetto || p?.completato === true,
};

// Mini factory per pulsanti/icone d’azione: leggibili e uguali ovunque
const btn = {
    // NB: queste funzioni NON fanno routing o fetch: solo UI + callback
    edit: (onClick: () => void, title = "Modifica") => (
        <button onClick={onClick} className="icon-color hover:text-blue-600" title={title}>
            <FontAwesomeIcon icon={faPen} />
        </button>
    ),
    trashSoft: (onClick: () => void, title = "Elimina") => (
        <button onClick={onClick} className="icon-color hover:text-red-600" title={title}>
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    restore: (onClick: () => void, title = "Ripristina") => (
        <button onClick={onClick} className="icon-color hover:text-green-600" title={title}>
            <FontAwesomeIcon icon={faUndo} />
        </button>
    ),
    trashHard: (onClick: () => void, title = "Elimina definitivamente") => (
        <button onClick={onClick} className="icon-color hover:text-red-700" title={title}>
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    openFolder: (onClick: () => void, title = "Apri") => (
        <button onClick={onClick} className="icon-color hover:text-violet-600" title={title}>
            <FontAwesomeIcon icon={faFolderOpen} />
        </button>
    ),
    navigateTo: (onClick: () => void, title = "Vai al dettaglio") => (
        <button onClick={onClick} className="icon-color hover:text-green-600" title={title}>
            <FontAwesomeIcon icon={faProjectDiagram} />
        </button>
    ),
    complete: (onClick: () => void, title = "Segna come completato") => (
        <button onClick={onClick} className="icon-color hover:text-emerald-600" title={title}>
            <FontAwesomeIcon icon={faCheckCircle} />
        </button>
    ),
    play: (onClick: () => void, title = "Avvia timer") => (
        <button onClick={onClick} className="icon-color hover:text-green-600" title={title}>
            <FontAwesomeIcon icon={faPlay} />
        </button>
    ),
    stop: (onClick: () => void, title = "Ferma timer") => (
        <button onClick={onClick} className="icon-color hover:text-red-600" title={title}>
            <FontAwesomeIcon icon={faStop} />
        </button>
    ),
};

// Badge (riusabili) che puoi riutilizzare in qualsiasi colonna/titolo
const badge = {
    meLink: <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Assegnato a te" />,
    member: <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Membro" />,
    done: <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completato" />,
};

// “Pixel” UI per avatar fallback
const AvatarFallback = ({ text }: { text: string }) => (
    <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
        {text?.[0]?.toUpperCase() ?? "?"}
    </div>
);

/* ============================================================
   STATI
   ============================================================ */
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
    azioni: (s) =>
        btn.trashSoft(async () => {
            if (!window.confirm("Eliminare questo stato?")) return;
            const res = await softDelete("stati", Number(s.id));
            if (!res.success) alert("Errore eliminazione: " + res.error);
        }),
    renderModaleModifica: (id, onClose) => <MiniStatoEditorModal statoId={id} onClose={onClose} />,
    azioniExtra: (
        <button type="button" onClick={() => (window as any).__openMiniCreate?.("stato")} className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} /> Crea
        </button>
    ),
};

/* ============================================================
   RUOLI
   ============================================================ */
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
    azioni: (r) =>
        btn.trashSoft(async () => {
            if (!window.confirm("Eliminare questo ruolo?")) return;
            const res = await softDelete("ruoli", Number(r.id));
            if (!res.success) alert("Errore eliminazione: " + res.error);
        }),
    renderModaleModifica: (id, onClose) => <MiniRuoloEditorModal ruoloId={id} onClose={onClose} />,
    azioniExtra: (
        <button type="button" onClick={() => (window as any).__openMiniCreate?.("ruolo")} className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} /> Crea
        </button>
    ),
};

/* ============================================================
   PRIORITÀ
   ============================================================ */
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
    azioni: (p) =>
        btn.trashSoft(async () => {
            if (!window.confirm("Eliminare questa priorità?")) return;
            const res = await softDelete("priorita", Number(p.id));
            if (!res.success) alert("Errore eliminazione: " + res.error);
        }),
    renderModaleModifica: (id, onClose) => <MiniPrioritaEditorModal prioritaId={id} onClose={onClose} />,
    azioniExtra: (
        <button type="button" onClick={() => (window as any).__openMiniCreate?.("priorita")} className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} /> Crea
        </button>
    ),
};

/* ============================================================
   CLIENTI
   ============================================================ */
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
                    <img src={c.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
                ) : (
                    <AvatarFallback text={c.nome ?? "?"} />
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
                {hasProgetti && typeof openModal === "function" && btn.openFolder(() => openModal(c), "Progetti cliente")}
                {btn.trashSoft(async () => {
                    if (!window.confirm("Eliminare questo cliente?")) return;
                    try {
                        await softDeleteCliente(c.id);
                    } catch (err: any) {
                        alert("Errore eliminazione: " + err.message);
                    }
                })}
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

/* ============================================================
   UTENTI
   ============================================================ */
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
                    <img src={u.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
                ) : (
                    <AvatarFallback text={u.nome ?? "?"} />
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
            {(u.progetti?.length ?? 0) > 0 &&
                btn.openFolder(() => (window as any).__openUtenteProgetti?.(u), "Progetti utente")}
            {btn.trashSoft(async () => {
                if (!window.confirm("Eliminare questo utente?")) return;
                try {
                    await softDeleteUtente(u.id);
                } catch (err: any) {
                    alert("Errore eliminazione: " + err.message);
                }
            })}
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

/* ============================================================
   PROGETTI
   ============================================================ */
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
        // usa il flag corretto separato
        const all = await fetchProgetti(
            { ...filtro, soloMie: !!filtro.soloMieProgetti },
            utenteId ?? undefined
        );

        // fallback di sicurezza lato client: se attivo "Miei", tieni solo progetti dove sono membro
        let items = all;
        if (filtro?.soloMieProgetti && utenteId) {
            items = (all || []).filter((p: any) =>
                (p.membri || []).some((m: any) => m.id === utenteId)
            );
        }

        // mantieni la logica "Completati"
        return filtro.soloCompletati
            ? items.filter((p: any) => p.completato === true || p.fine_progetto != null)
            : items;
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
        { chiave: "consegna", label: "Consegna", className: "w-40 hidden lg:block", render: (p) => fmt.date(p.consegna) },
        { chiave: "stato", label: "Stato", className: "w-32 hidden lg:block", render: (p) => p.stato?.nome ?? "—" },
        { chiave: "priorita", label: "Priorità", className: "w-32 hidden lg:block", render: (p) => p.priorita?.nome ?? "—" },
    ],
    azioni: (proj, { navigate, patchItem }) => {
        const completaProgetto = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (proj.fine_progetto) return;

            // ✅ chiude progetto + tutte le task collegate (via progetti_task + sotto-task)
            const { error } = await supabase.rpc("complete_project", { p_id: proj.id });
            if (error) {
                alert("Errore nel completare il progetto: " + error.message);
                return;
            }

            // Aggiorna subito la UI del progetto (niente refetch)
            const nowIso = new Date().toISOString();
            patchItem?.(proj.id, { fine_progetto: nowIso });

            // (opzionale) avvisa altri componenti/lista task che sono state chiuse in bulk
            (window as any).dispatchEvent?.(
                new CustomEvent("tasks:bulkCompleted", { detail: { progettoId: proj.id, fine_task: nowIso } })
            );
        };

        return (
            <>
                {/* ✅ check: completa progetto + task, senza ricaricare */}
                <button
                    onClick={completaProgetto}
                    className="icon-color hover:text-emerald-600"
                    title={proj.fine_progetto ? "Già completato" : "Segna come completato (chiude anche le task)"}
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


/* ============================================================
   TIME ENTRIES
   ============================================================ */
export const timeEntriesConfig: ResourceConfig<TimeEntry> = {
    key: "time_entries",
    titolo: "Registro attività",
    icona: faClock,
    coloreIcona: "text-gray-500",
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
    azioni: (t) =>
        btn.trashSoft(async () => {
            if (!window.confirm("Eliminare questa registrazione di tempo?")) return;
            try {
                await softDelete("time_entries", Number(t.id));
            } catch (err: any) {
                alert("Errore eliminazione: " + err.message);
            }
        }),
    cestino: {
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
                .not("deleted_at", "is", null)
                .order("data_inizio", { ascending: false });
            if (error) throw error;
            return (data || []) as any as TimeEntry[];
        },
        actions: {
            restore: async (id: string | number) => {
                const { error } = await supabase.from("time_entries").update({ deleted_at: null }).eq("id", id);
                if (error) throw error;
            },
            hardDelete: async (id: string | number) => {
                const { error } = await supabase.from("time_entries").delete().eq("id", id);
                if (error) throw error;
            },
        },
    },
    colonne: [
        { chiave: "utente", label: "Utente", className: "w-40", render: (t) => (t.utente ? `${t.utente.nome} ${t.utente.cognome}` : "—") },
        { chiave: "progetto", label: "Progetto", className: "w-40", render: (t) => t.progetto?.nome ?? "—" },
        { chiave: "task", label: "Task", className: "flex-1", render: (t) => t.task?.nome ?? "—" },
        { chiave: "data_inizio", label: "Inizio", className: "w-40", render: (t) => new Date(t.data_inizio).toLocaleString() },
        { chiave: "data_fine", label: "Fine", className: "w-40", render: (t) => (t.data_fine ? new Date(t.data_fine).toLocaleString() : "—") },
        { chiave: "durata", label: "Durata", className: "w-32", render: (t) => fmt.durata(t.durata) },
    ],
};
const TIMER_KEY = "kal_active_task_timer";

// toast globale
let globalShowToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void = () => { };
export const ToastBridge = () => {
    const showToast = useToast();
    globalShowToast = showToast;
    return null;
};



type ActiveTimerStore = {
    taskId: string;
    taskName: string;
    progettoId?: string | null;
    startISO: string;
};

function readTimer(): ActiveTimerStore | null {
    try {
        const raw = localStorage.getItem(TIMER_KEY);
        return raw ? JSON.parse(raw) as ActiveTimerStore : null;
    } catch { return null; }
}

function writeTimer(v: ActiveTimerStore | null) {
    if (v) localStorage.setItem(TIMER_KEY, JSON.stringify(v));
    else localStorage.removeItem(TIMER_KEY);
}

export const TimerOverlay = () => {
    const [data, setData] = useState<ActiveTimerStore | null>(() => readTimer());
    const [, tick] = useState(0);

    // aggiorna stato quando cambia da altre viste
    useEffect(() => {
        const onChange = () => setData(readTimer());
        window.addEventListener("tasks:timerChanged", onChange as any);
        return () => window.removeEventListener("tasks:timerChanged", onChange as any);
    }, []);

    // timer 1s per tempo che scorre
    useEffect(() => {
        if (!data) return;
        const id = setInterval(() => tick(x => x + 1), 1000);
        return () => clearInterval(id);
    }, [data]);

    const elapsed = useMemo(() => {
        if (!data) return "0s";
        const start = new Date(data.startISO).getTime();
        const diff = Math.max(0, Date.now() - start) / 1000;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = Math.floor(diff % 60);
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }, [data, Date.now()]);

    if (!data) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-[9998] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3"
            role="status"
        >
            <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
            <div className="text-sm">
                <div className="font-semibold">Timer attivo</div>
                <div className="opacity-80 max-w-[260px] truncate">{data.taskName}</div>
                <div className="text-xs opacity-70">⏱ {elapsed}</div>
            </div>
            <button
                className="ml-3 text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-500"
                onClick={() => {
                    // chiede allo setup di fermare e salvare
                    window.dispatchEvent(new CustomEvent("tasks:timerStopRequest"));
                }}
                title="Ferma e salva"
            >
                Stop
            </button>
        </div>
    );
};

/* ============================================================
   TASKS (con timer in setup)
   ============================================================ */
export const tasksConfig: ResourceConfig<Task> = {
    key: "tasks",
    titolo: "Lista Task",
    icona: faTasks,
    coloreIcona: "text-green-500",
    useHeaderFilters: true,
    fetch: async ({ filtro, utenteId }) => {
        // usa il flag corretto separato
        const all = await fetchTasks(
            { ...filtro, soloMie: !!filtro.soloMieTasks },
            utenteId ?? undefined
        );

        // mostra solo root (come prima)
        let items = (all || []).filter((t: any) => !t.parent_id);

        // fallback di sicurezza lato client: se attivo "Mie", tieni solo task dove sono assegnato
        if (filtro?.soloMieTasks && utenteId) {
            items = items.filter((t: any) =>
                (t.assegnatari || []).some((u: any) => u.id === utenteId)
            );
        }

        // mantieni la logica "Completate"
        return filtro.soloCompletate ? items.filter((t: any) => !!t.fine_task || t.completata === true) : items;
    },

    cestino: {
        fetch: async ({ filtro }) => {
            const data = await fetchTasksDeleted(filtro);
            return data.filter((t: any) => !t.parent_id);
        },
        actions: cestinoActions.tasks,
    },
    setup: ({ utenteId }) => {
        let active: { taskId: string; taskName: string; progettoId?: string | null; startTime: Date } | null = null;

        // ripristina stato se presente (page change)
        const stored = ((): ActiveTimerStore | null => {
            try {
                const raw = localStorage.getItem(TIMER_KEY);
                return raw ? JSON.parse(raw) as ActiveTimerStore : null;
            } catch { return null; }
        })();
        if (!active && stored) {
            active = {
                taskId: stored.taskId,
                taskName: stored.taskName,
                progettoId: stored.progettoId ?? null,
                startTime: new Date(stored.startISO),
            };
        }

        const notify = () => {
            window.dispatchEvent(new CustomEvent("tasks:timerChanged"));
        };

        const start = (task: Task) => {
            active = { taskId: task.id, taskName: task.nome, progettoId: task.progetto?.id ?? null, startTime: new Date() };
            writeTimer({ taskId: active.taskId, taskName: active.taskName, progettoId: active.progettoId ?? undefined, startISO: active.startTime.toISOString() });
            globalShowToast("⏱️ Timer avviato", "info");
            notify();
        };

        const stop = async (task?: Task) => {
            if (!active || !utenteId) {
                active = null;
                writeTimer(null);
                notify();
                return;
            }
            const progettoId = task?.progetto?.id ?? active.progettoId ?? null;
            if (!progettoId) {
                globalShowToast("Questa task non è collegata a nessun progetto", "error");
                active = null;
                writeTimer(null);
                notify();
                return;
            }
            const endTime = new Date();
            const durata = Math.floor((endTime.getTime() - active.startTime.getTime()) / 1000);

            const { error } = await supabase.from("time_entries").insert({
                utente_id: utenteId,
                progetto_id: progettoId,
                task_id: task?.id ?? active.taskId,
                nome: task?.nome ?? active.taskName,
                data_inizio: active.startTime.toISOString(),
                data_fine: endTime.toISOString(),
                durata,
            });

            if (error) globalShowToast("Errore nel salvataggio", "error");
            else globalShowToast("✅ Tempo salvato", "success");

            active = null;
            writeTimer(null);
            notify();
        };

        const isRunning = (taskId: string) => active?.taskId === taskId;

        // listener per overlay "Stop"
        const stopListener = () => { void stop(undefined); };
        window.addEventListener("tasks:timerStopRequest", stopListener as any);

        return {
            extra: { start, stop, isRunning },
            dispose: () => {
                window.removeEventListener("tasks:timerStopRequest", stopListener as any);
            }
        };
    },



    colonne: [
        {
            chiave: "nome",
            label: "Nome",
            render: (task, { utenteId }) => (
                <div className="flex items-center gap-2">
                    {task.assegnatari?.some((u) => u.id === utenteId) && badge.meLink}
                    {is.taskDone(task) && badge.done}
                    <span>{task.nome}</span>
                </div>
            ),
        },
        { chiave: "consegna", label: "Consegna", className: "w-40 hidden lg:block", render: (t) => fmt.date(t.consegna) },
        { chiave: "stato", label: "Stato", className: "w-32 hidden lg:block", render: (t) => t.stato?.nome ?? "—" },
        { chiave: "priorita", label: "Priorità", className: "w-32 hidden lg:block", render: (t) => t.priorita?.nome ?? "—" },
    ],
    azioni: (task, { navigate, extra, patchItem }) => {
        const running = extra?.isRunning?.(task.id);

        const toggleTimer = async () => {
            if (running) {
                await extra?.stop?.(task);
                patchItem?.(task.id, { __runningTick: Date.now() } as any);
            } else {
                extra?.start?.(task); // ⬅️ passa l'intera task
                patchItem?.(task.id, { __runningTick: Date.now() } as any);
            }
        };


        const completaTask = async () => {
            if (task.fine_task) return;
            const nowIso = new Date().toISOString();
            const { error } = await supabase.from("tasks").update({ fine_task: nowIso }).eq("id", task.id);
            if (error) return alert("Errore nel completare la task: " + error.message);
            patchItem?.(task.id, { fine_task: nowIso });
        };

        return (
            <>
                {/* ✅ come in DettaglioTask: il timer è disponibile se la task ha un progetto */}
                {task.progetto?.id
                    ? (running ? btn.stop(toggleTimer) : btn.play(toggleTimer))
                    : null}

                {btn.complete(completaTask, task.fine_task ? "Già completata" : "Segna come completata")}
                {btn.navigateTo(() => navigate(`/tasks/${task.slug ?? task.id}`), "Vai al dettaglio")}
                {btn.trashSoft(async () => {
                    if (!window.confirm("Eliminare questa task?")) return;
                    try {
                        await softDeleteTask(task.id);
                    } catch (err: any) {
                        alert("Errore eliminazione: " + err.message);
                    }
                })}
            </>
        );
    },

    renderDettaglio: (task) => (
        <div className="space-y-2">
            {task.progetto?.nome && <p>📁 Progetto: {task.progetto.nome}</p>}
            {typeof task.tempo_stimato === "number" && <p>⏱️ Tempo stimato: {fmt.durata(task.tempo_stimato)}</p>}
            {task.assegnatari?.length ? (
                <p>👥 Assegnata a: {task.assegnatari.map((u) => `${u.nome} ${u.cognome || ""}`).join(", ")}</p>
            ) : null}
            {task.note && <p>🗒️ {task.note}</p>}
        </div>
    ),
    renderModaleModifica: (id, onClose) => <MiniTaskEditorModal taskId={id} onClose={onClose} />,
};

/* ============================================================
   REGISTRO CENTRALE
   ============================================================ */
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
