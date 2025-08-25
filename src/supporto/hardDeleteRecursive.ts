// src/supporto/hardDeleteRecursive.ts
import { supabase } from "./supabaseClient";

/**
 * Esegue una DELETE definitiva su tabella/record specifico
 */
async function hardRemove(table: string, column: string, value: string) {
    return supabase.from(table).delete().eq(column, value);
}

/**
 * 🔹 1. Eliminazione definitiva di una Task (ricorsiva)
 */
export async function hardDeleteTask(taskId: string): Promise<void> {
    // Ricorsione: elimina prima eventuali sotto-task
    const { data: subtasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_id", taskId);

    if (subtasks) {
        for (const st of subtasks) {
            await hardDeleteTask(st.id);
        }
    }

    // Commenti collegati
    const { data: commenti } = await supabase
        .from("commenti")
        .select("id")
        .eq("task_id", taskId);

    if (commenti) {
        for (const c of commenti) {
            await hardRemove("commenti_destinatari", "commento_id", c.id);
            await hardRemove("notifiche", "commento_id", c.id);
            await hardRemove("commenti", "id", c.id);
        }
    }

    // Associazioni
    await hardRemove("utenti_task", "task_id", taskId);
    await hardRemove("progetti_task", "task_id", taskId);

    // Time tracking
    await hardRemove("time_entries", "task_id", taskId);
    await hardRemove("task_durate_totali", "task_id", taskId);

    // Notifiche collegate alla task
    await hardRemove("notifiche", "task_id", taskId);

    // Infine la task stessa
    await hardRemove("tasks", "id", taskId);
}

/**
 * 🔹 2. Eliminazione definitiva di un Progetto (con tutte le sue task)
 */
export async function hardDeleteProgetto(progettoId: string): Promise<void> {
    // Trova le task del progetto e cancellale
    const { data: tasks } = await supabase
        .from("progetti_task")
        .select("task_id")
        .eq("progetti_id", progettoId);

    if (tasks) {
        for (const t of tasks) {
            await hardDeleteTask(t.task_id);
        }
    }

    // Associazioni
    await hardRemove("utenti_progetti", "progetto_id", progettoId);
    await hardRemove("progetti_task", "progetti_id", progettoId);

    // Time tracking
    await hardRemove("time_entries", "progetto_id", progettoId);
    await hardRemove("task_durate_totali", "progetto_id", progettoId);

    // Notifiche
    await hardRemove("notifiche", "progetto_id", progettoId);

    // Infine il progetto
    await hardRemove("progetti", "id", progettoId);
}

/**
 * 🔹 3. Eliminazione definitiva di un Utente
 */
export async function hardDeleteUtente(utenteId: string): Promise<void> {
    // Commenti scritti
    const { data: commenti } = await supabase
        .from("commenti")
        .select("id")
        .eq("utente_id", utenteId);

    if (commenti) {
        for (const c of commenti) {
            await hardRemove("commenti_destinatari", "commento_id", c.id);
            await hardRemove("notifiche", "commento_id", c.id);
            await hardRemove("commenti", "id", c.id);
        }
    }

    // Commenti ricevuti
    await hardRemove("commenti_destinatari", "utente_id", utenteId);

    // Associazioni
    await hardRemove("utenti_task", "utente_id", utenteId);
    await hardRemove("utenti_progetti", "utente_id", utenteId);

    // Notifiche
    await hardRemove("notifiche", "creatore_id", utenteId);
    await hardRemove("notifiche_utenti", "utente_id", utenteId);
    await hardRemove("notifiche_preferenze", "utente_id", utenteId);

    // Time tracking
    await hardRemove("time_entries", "utente_id", utenteId);
    await hardRemove("task_durate_totali", "utente_id", utenteId);

    // Infine l'utente
    await hardRemove("utenti", "id", utenteId);
}

/**
 * 🔹 4. Eliminazione definitiva di un Cliente (con tutti i suoi progetti e task)
 */
export async function hardDeleteCliente(clienteId: string): Promise<void> {
    // Trova progetti del cliente
    const { data: progetti } = await supabase
        .from("progetti")
        .select("id")
        .eq("cliente_id", clienteId);

    if (progetti) {
        for (const p of progetti) {
            await hardDeleteProgetto(p.id);
        }
    }

    // Infine il cliente
    await hardRemove("clienti", "id", clienteId);
}
