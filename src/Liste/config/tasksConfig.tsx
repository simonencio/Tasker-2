// src/Liste/config/tasksConfig.tsx
import { faTasks } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../supporto/supabaseClient";
import { fetchTasks, fetchTasksDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDeleteTask } from "../../supporto/softDeleteRecursive";
import type { ResourceConfig, Task } from "../typesLista";
import { fmt, is, badge } from "./common";
import { azioni, dispatchResourceEvent } from "./azioniConfig";
import { showToast } from "../../supporto/useToast"; // 👈 usa la funzione, non l’hook

/* ============================================================
   Timer setup helpers
   ============================================================ */
const TIMER_KEY = "kal_active_task_timer";

function writeTimer(v: any | null) {
    if (v) localStorage.setItem(TIMER_KEY, JSON.stringify(v));
    else localStorage.removeItem(TIMER_KEY);
}

export const tasksConfig: ResourceConfig<Task> = {
    key: "tasks",
    titolo: "Lista Task",
    icona: faTasks,
    coloreIcona: "text-green-500",
    useHeaderFilters: true,

    /* ================== FETCH ================== */
    fetch: async ({ filtro, utenteId }) => {
        const all = await fetchTasks({ ...filtro, soloMie: !!filtro.soloMieTasks }, utenteId ?? undefined);
        let items = (all || []).filter((t: any) => !t.parent_id);
        if (filtro?.soloMieTasks && utenteId) {
            items = items.filter((t: any) => (t.assegnatari || []).some((u: any) => u.id === utenteId));
        }
        return filtro.soloCompletate ? items.filter((t: any) => !!t.fine_task || t.completata === true) : items;
    },

    cestino: {
        fetch: async ({ filtro }) => {
            const data = await fetchTasksDeleted(filtro);
            return data.filter((t: any) => !t.parent_id);
        },
        actions: cestinoActions.tasks,
    },

    /* ================== SETUP TIMER ================== */
    setup: ({ utenteId }) => {
        let active: { taskId: string; taskName: string; progettoId?: string | null; startTime: Date } | null = null;

        // ripristina eventuale timer salvato
        const stored = (() => {
            try {
                const raw = localStorage.getItem(TIMER_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
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
            const progettoId = task.progetto?.id ?? null;

            // 🚫 Task senza progetto
            if (!progettoId) {
                showToast("Questa task non è collegata a nessun progetto", "error");
                return;
            }

            // 🚫 Utente non assegnato
            const assegnato = task.assegnatari?.some((u) => u.id === utenteId);
            if (!assegnato) {
                showToast("Non sei assegnato a questa task", "error");
                return;
            }

            // ✅ Avvio timer
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
        window.addEventListener("tasks:timerStopRequest", stopListener as any);

        return {
            extra: { start, stop, isRunning },
            dispose: () => {
                window.removeEventListener("tasks:timerStopRequest", stopListener as any);
            },
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
        { chiave: "consegna", label: "Consegna", className: "w-40 hidden lg:block", render: (t) => fmt.date(t.consegna) },
        { chiave: "stato", label: "Stato", className: "w-32 hidden lg:block", render: (t) => t.stato?.nome ?? "—" },
        { chiave: "priorita", label: "Priorità", className: "w-32 hidden lg:block", render: (t) => t.priorita?.nome ?? "—" },
    ],

    /* ================== AZIONI ================== */
    azioni: (task, { navigate, extra, patchItem }) => {
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
            const { error } = await supabase.from("tasks").update({ fine_task: nowIso }).eq("id", task.id);
            if (error) return alert("Errore nel completare la task: " + error.message);

            patchItem?.(task.id, { fine_task: nowIso });
            dispatchResourceEvent("update", "tasks", { id: task.id, patch: { fine_task: nowIso } });
        };

        const eliminaTask = async () => {
            if (!window.confirm("Eliminare questa task?")) return;
            try {
                await softDeleteTask(task.id);
                dispatchResourceEvent("remove", "tasks", { id: task.id });
            } catch (err: any) {
                alert("Errore eliminazione: " + err.message);
            }
        };

        return (
            <>
                {running ? azioni.stop(toggleTimer, "Ferma timer") : azioni.play(toggleTimer, "Avvia timer")}
                {azioni.edit(() => (window as any).__openMiniEdit("tasks", task.id))}
                {azioni.complete(completaTask, task.fine_task ? "Già completata" : "Segna come completata")}
                {azioni.navigateTo(() => navigate(`/tasks/${task.slug ?? task.id}`), "Vai al dettaglio")}
                {azioni.trashSoft(eliminaTask)}
            </>
        );
    },

    /* ================== DETTAGLIO ================== */
    /* ================== DETTAGLIO ================== */
    renderDettaglio: (task) => (
        <div className="space-y-2">
            {task.progetto?.nome && <p>📁 Progetto: {task.progetto.nome}</p>}

            {task.tempo_stimato && (
                <p>⏱️ Tempo stimato: {typeof task.tempo_stimato === "string"
                    ? task.tempo_stimato
                    : fmt.durata(task.tempo_stimato)}
                </p>
            )}

            {task.assegnatari?.length ? (
                <p>👥 Assegnata a: {task.assegnatari.map((u) => `${u.nome} ${u.cognome || ""}`).join(", ")}</p>
            ) : null}

            {task.note && <p>🗒️ {task.note}</p>}
        </div>
    ),

};
