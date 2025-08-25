import { supabase } from "./supabaseClient";

/**
 * Imposta deleted_at = null per una tabella/record specifico
 */
async function markRestored(table: string, column: string, value: string) {
    return supabase
        .from(table)
        .update({ deleted_at: null })
        .eq(column, value);
}

/**
 * 🔹 1. Ripristino ricorsivo di una Task
 */
export async function restoreTask(taskId: string): Promise<void> {
    await markRestored("tasks", "id", taskId);

    // Ricorsione: sotto-task
    const { data: subtasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_id", taskId);

    if (subtasks) {
        for (const st of subtasks) {
            await restoreTask(st.id);
        }
    }

    // Associazioni
    await markRestored("utenti_task", "task_id", taskId);
    await markRestored("progetti_task", "task_id", taskId);

    // Commenti
    const { data: commenti } = await supabase
        .from("commenti")
        .select("id")
        .eq("task_id", taskId);

    if (commenti) {
        for (const c of commenti) {
            await markRestored("commenti", "id", c.id);
            await markRestored("commenti_destinatari", "commento_id", c.id);
            await markRestored("notifiche", "commento_id", c.id);
        }
    }

    // Time tracking
    await markRestored("time_entries", "task_id", taskId);
    await markRestored("task_durate_totali", "task_id", taskId);

    // Notifiche collegate
    await markRestored("notifiche", "task_id", taskId);
}

/**
 * 🔹 2. Ripristino di un Progetto (ora include anche le task del progetto)
 */
export async function restoreProgetto(progettoId: string): Promise<void> {
    await markRestored("progetti", "id", progettoId);

    // Utenti assegnati
    await markRestored("utenti_progetti", "progetto_id", progettoId);

    // Link a task
    await markRestored("progetti_task", "progetti_id", progettoId);

    // Time tracking
    await markRestored("time_entries", "progetto_id", progettoId);
    await markRestored("task_durate_totali", "progetto_id", progettoId);

    // Notifiche
    await markRestored("notifiche", "progetto_id", progettoId);

    // Trova le task collegate e ripristina ricorsivamente
    const { data: tasks } = await supabase
        .from("progetti_task")
        .select("task_id")
        .eq("progetti_id", progettoId);

    if (tasks) {
        for (const t of tasks) {
            await restoreTask(t.task_id);
        }
    }
}

/**
 * 🔹 3. Ripristino di un Utente
 */
export async function restoreUtente(utenteId: string): Promise<void> {
    await markRestored("utenti", "id", utenteId);

    // Associazioni
    await markRestored("utenti_task", "utente_id", utenteId);
    await markRestored("utenti_progetti", "utente_id", utenteId);

    // Commenti scritti
    const { data: commenti } = await supabase
        .from("commenti")
        .select("id")
        .eq("utente_id", utenteId);

    if (commenti) {
        for (const c of commenti) {
            await markRestored("commenti", "id", c.id);
            await markRestored("commenti_destinatari", "commento_id", c.id);
            await markRestored("notifiche", "commento_id", c.id);
        }
    }

    // Commenti ricevuti
    await markRestored("commenti_destinatari", "utente_id", utenteId);

    // Notifiche
    await markRestored("notifiche", "creatore_id", utenteId);
    await markRestored("notifiche_utenti", "utente_id", utenteId);
    await markRestored("notifiche_preferenze", "utente_id", utenteId);

    // Time tracking
    await markRestored("time_entries", "utente_id", utenteId);
    await markRestored("task_durate_totali", "utente_id", utenteId);
}

/**
 * 🔹 4. Ripristino di un Cliente (ora include anche le task dei progetti)
 */
export async function restoreCliente(clienteId: string): Promise<void> {
    await markRestored("clienti", "id", clienteId);

    // Trova progetti del cliente
    const { data: progetti } = await supabase
        .from("progetti")
        .select("id")
        .eq("cliente_id", clienteId);

    if (progetti) {
        for (const p of progetti) {
            await restoreProgetto(p.id);

            // Task legate al progetto
            const { data: tasks } = await supabase
                .from("progetti_task")
                .select("task_id")
                .eq("progetti_id", p.id);

            if (tasks) {
                for (const t of tasks) {
                    await restoreTask(t.task_id);
                }
            }
        }
    }
}
