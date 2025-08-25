import { supabase } from "./supabaseClient";

/**
 * Imposta deleted_at = now() per una tabella/record specifico
 */
async function markDeleted(table: string, column: string, value: string) {
    return supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq(column, value);
}

/**
 * 🔹 1. Eliminazione ricorsiva di una Task
 */
export async function softDeleteTask(taskId: string): Promise<void> {
    await markDeleted("tasks", "id", taskId);

    // Ricorsione: sotto-task
    const { data: subtasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_id", taskId)
        .is("deleted_at", null);

    if (subtasks) {
        for (const st of subtasks) {
            await softDeleteTask(st.id);
        }
    }

    // Associazioni
    await markDeleted("utenti_task", "task_id", taskId);
    await markDeleted("progetti_task", "task_id", taskId);

    // Commenti
    const { data: commenti } = await supabase
        .from("commenti")
        .select("id")
        .eq("task_id", taskId)
        .is("deleted_at", null);

    if (commenti) {
        for (const c of commenti) {
            await markDeleted("commenti", "id", c.id);
            await markDeleted("commenti_destinatari", "commento_id", c.id);
            await markDeleted("notifiche", "commento_id", c.id);
        }
    }

    // Time tracking
    await markDeleted("time_entries", "task_id", taskId);
    await markDeleted("task_durate_totali", "task_id", taskId);

    // Notifiche collegate alla task
    await markDeleted("notifiche", "task_id", taskId);
}

/**
 * 🔹 2. Eliminazione di un Progetto (ora include anche le task del progetto)
 */
export async function softDeleteProgetto(progettoId: string): Promise<void> {
    await markDeleted("progetti", "id", progettoId);

    // Utenti assegnati
    await markDeleted("utenti_progetti", "progetto_id", progettoId);

    // Link a task
    await markDeleted("progetti_task", "progetti_id", progettoId);

    // Time tracking
    await markDeleted("time_entries", "progetto_id", progettoId);
    await markDeleted("task_durate_totali", "progetto_id", progettoId);

    // Notifiche
    await markDeleted("notifiche", "progetto_id", progettoId);

    // Trova le task collegate e soft delete ricorsiva
    const { data: tasks } = await supabase
        .from("progetti_task")
        .select("task_id")
        .eq("progetti_id", progettoId);

    if (tasks) {
        for (const t of tasks) {
            await softDeleteTask(t.task_id);
        }
    }
}

/**
 * 🔹 3. Eliminazione di un Utente
 */
export async function softDeleteUtente(utenteId: string): Promise<void> {
    await markDeleted("utenti", "id", utenteId);

    // Associazioni
    await markDeleted("utenti_task", "utente_id", utenteId);
    await markDeleted("utenti_progetti", "utente_id", utenteId);

    // Commenti scritti
    const { data: commenti } = await supabase
        .from("commenti")
        .select("id")
        .eq("utente_id", utenteId)
        .is("deleted_at", null);

    if (commenti) {
        for (const c of commenti) {
            await markDeleted("commenti", "id", c.id);
            await markDeleted("commenti_destinatari", "commento_id", c.id);
            await markDeleted("notifiche", "commento_id", c.id);
        }
    }

    // Commenti ricevuti
    await markDeleted("commenti_destinatari", "utente_id", utenteId);

    // Notifiche
    await markDeleted("notifiche", "creatore_id", utenteId);
    await markDeleted("notifiche_utenti", "utente_id", utenteId);
    await markDeleted("notifiche_preferenze", "utente_id", utenteId);

    // Time tracking
    await markDeleted("time_entries", "utente_id", utenteId);
    await markDeleted("task_durate_totali", "utente_id", utenteId);
}

/**
 * 🔹 4. Eliminazione di un Cliente (ora include anche le task dei progetti)
 */
export async function softDeleteCliente(clienteId: string): Promise<void> {
    await markDeleted("clienti", "id", clienteId);

    // Trova progetti del cliente
    const { data: progetti } = await supabase
        .from("progetti")
        .select("id")
        .eq("cliente_id", clienteId)
        .is("deleted_at", null);

    if (progetti) {
        for (const p of progetti) {
            await softDeleteProgetto(p.id);

            // Task legate al progetto
            const { data: tasks } = await supabase
                .from("progetti_task")
                .select("task_id")
                .eq("progetti_id", p.id);

            if (tasks) {
                for (const t of tasks) {
                    await softDeleteTask(t.task_id);
                }
            }
        }
    }
}
