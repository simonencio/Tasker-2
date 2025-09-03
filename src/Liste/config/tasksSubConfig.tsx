// src/Liste/config/tasksSubConfig.tsx
import { faTasks } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../supporto/supabaseClient";
import { softDeleteTask } from "../../supporto/softDeleteRecursive";
import type { ResourceConfig, Task } from "../typesLista";
import { fmt, is, badge } from "./common";
import { azioni, dispatchResourceEvent } from "./azioniConfig";
import { showToast } from "../../supporto/useToast";

const TIMER_KEY = "kal_active_task_timer";

function writeTimer(v: any | null) {
    if (v) localStorage.setItem(TIMER_KEY, JSON.stringify(v));
    else localStorage.removeItem(TIMER_KEY);
}

// util interna per deduplicare utenti per id
function uniqById<T extends { id?: string }>(arr: T[]): T[] {
    const map = new Map<string, T>();
    for (const x of arr) {
        const id = x?.id as string | undefined;
        if (!id) continue;
        if (!map.has(id)) map.set(id, x);
    }
    return Array.from(map.values());
}

/**
 * Config specifico per le SOTTO-TASK
 * - stesso comportamento del tasksConfig
 * - nel fetch filtra per parent_id = paramKey
 */
export const tasksSubConfig: ResourceConfig<Task> = {
    key: "tasks_sub",
    titolo: "Sotto-task",
    icona: faTasks,
    coloreIcona: "text-green-400",
    useHeaderFilters: false,

    /* ================== FETCH ================== */
    fetch: async (opts) => {
        const { paramKey } = opts as any;
        if (!paramKey) return [];

        const { data, error } = await supabase
            .from("tasks")
            .select(`
        id, nome, slug, note, consegna, tempo_stimato, fine_task,
        stato:stato_id(id, nome, colore),
        priorita:priorita_id(id, nome),
        parent_id,
        progetti_task(progetti(id, nome, slug)),
        utenti_task(utenti(id, nome, cognome, avatar_url))
      `)
            .eq("parent_id", paramKey)
            .is("deleted_at", null);

        if (error) {
            console.error("Errore fetch sottotask:", error);
            return [];
        }

        return (data || []).map((t: any) => {
            const progetto = Array.isArray(t.progetti_task?.[0]?.progetti)
                ? t.progetti_task?.[0]?.progetti[0]
                : t.progetti_task?.[0]?.progetti ?? null;

            const assegnatariRaw = (t.utenti_task || [])
                .map((r: any) => r?.utenti)
                .filter(Boolean);

            return {
                ...t,
                progetto,
                // dedup per evitare warning React "same key"
                assegnatari: uniqById(assegnatariRaw),
            };
        });
    },

    /* ================== SETUP TIMER ================== */
    setup: ({ utenteId }) => {
        let active:
            | {
                taskId: string;
                taskName: string;
                progettoId?: string | null;
                startTime: Date;
            }
            | null = null;

        // ripristina eventuale timer
        try {
            const raw = localStorage.getItem(TIMER_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                active = {
                    taskId: s.taskId,
                    taskName: s.taskName,
                    progettoId: s.progettoId ?? null,
                    startTime: new Date(s.startISO),
                };
            }
        } catch { }

        const notify = () => {
            window.dispatchEvent(new CustomEvent("tasks:timerChanged"));
        };

        const start = (task: Task) => {
            const progettoId = task.progetto?.id ?? null;
            if (!progettoId) {
                showToast("Questa task non è collegata a nessun progetto", "error");
                return;
            }
            const assegnato = task.assegnatari?.some((u) => u.id === utenteId);
            if (!assegnato) {
                showToast("Non sei assegnato a questa task", "error");
                return;
            }
            active = {
                taskId: task.id,
                taskName: task.nome,
                progettoId,
                startTime: new Date(),
            };
            writeTimer({
                taskId: active.taskId,
                taskName: active.taskName,
                progettoId: active.progettoId,
                startISO: active.startTime.toISOString(),
            });
            showToast("⏱️ Timer avviato", "info");
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
                showToast("Questa task non è collegata a nessun progetto", "error");
                active = null;
                writeTimer(null);
                notify();
                return;
            }
            const endTime = new Date();
            const durata = Math.floor(
                (endTime.getTime() - active.startTime.getTime()) / 1000
            );
            const { error } = await supabase.from("time_entries").insert({
                utente_id: utenteId,
                progetto_id: progettoId,
                task_id: task?.id ?? active.taskId,
                nome: task?.nome ?? active.taskName,
                data_inizio: active.startTime.toISOString(),
                data_fine: endTime.toISOString(),
                durata,
            });
            if (error) showToast("Errore nel salvataggio", "error");
            else showToast("✅ Tempo salvato", "success");
            active = null;
            writeTimer(null);
            notify();
        };

        const isRunning = (taskId: string) => active?.taskId === taskId;

        const stopListener = () => {
            void stop(undefined);
        };
        window.addEventListener(
            "tasks:timerStopRequest",
            stopListener as unknown as EventListener
        );

        return {
            extra: { start, stop, isRunning },
            dispose: () =>
                window.removeEventListener(
                    "tasks:timerStopRequest",
                    stopListener as unknown as EventListener
                ),
        };
    },

    /* ================== COLONNE ================== */
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
        {
            chiave: "consegna",
            label: "Consegna",
            className: "w-40 hidden lg:block",
            render: (t) => fmt.date(t.consegna),
        },
        {
            chiave: "stato",
            label: "Stato",
            className: "w-32 hidden lg:block",
            render: (t) => t.stato?.nome ?? "—",
        },
        {
            chiave: "priorita",
            label: "Priorità",
            className: "w-32 hidden lg:block",
            render: (t) => t.priorita?.nome ?? "—",
        },
    ],

    /* ================== AZIONI ================== */
    azioni: (task, { extra, patchItem }) => {
        const running = extra?.isRunning?.(task.id);

        const toggleTimer = async () => {
            if (running) {
                await extra?.stop?.(task);
                patchItem?.(task.id, { __runningTick: Date.now() } as any);
            } else {
                await extra?.start?.(task);
                patchItem?.(task.id, { __runningTick: Date.now() } as any);
            }
        };

        const completaTask = async () => {
            if (task.fine_task) return;
            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from("tasks")
                .update({ fine_task: nowIso })
                .eq("id", task.id);
            if (error) {
                showToast("Errore nel completare la task", "error");
                return;
            }
            patchItem?.(task.id, { fine_task: nowIso });
            dispatchResourceEvent("update", "tasks_sub", {
                id: task.id,
                patch: { fine_task: nowIso },
            });
            showToast("✅ Task completata", "success");
        };

        const eliminaTask = async () => {
            if (!window.confirm("Eliminare questa sotto-task?")) return;
            try {
                await softDeleteTask(task.id);
                dispatchResourceEvent("remove", "tasks_sub", { id: task.id });
                showToast("🗑️ Task spostata nel cestino", "info");
            } catch (err: any) {
                showToast(err?.message || "Errore eliminazione", "error");
            }
        };

        return (
            <>
                {running
                    ? azioni.stop(toggleTimer, "Ferma timer")
                    : azioni.play(toggleTimer, "Avvia timer")}
                {azioni.edit(() => (window as any).__openMiniEdit?.("tasks", task.id))}
                {azioni.complete(
                    completaTask,
                    task.fine_task ? "Già completata" : "Segna come completata"
                )}
                {azioni.trashSoft(eliminaTask)}
            </>
        );
    },

    /* ================== DETTAGLIO ================== */
    renderDettaglio: (task) => (
        <div className="space-y-2">
            {task.tempo_stimato && (
                <div>
                    ⏱️ Tempo stimato:{" "}
                    {typeof task.tempo_stimato === "string"
                        ? task.tempo_stimato
                        : fmt.durata(task.tempo_stimato)}
                </div>
            )}
            {task.assegnatari?.length ? (
                <div>
                    👥 Assegnata a:{" "}
                    {task.assegnatari
                        .map((u) => `${u.nome} ${u.cognome || ""}`.trim())
                        .join(", ")}
                </div>
            ) : null}
            {task.note && <div>🗒️ {task.note}</div>}
        </div>
    ),
};
