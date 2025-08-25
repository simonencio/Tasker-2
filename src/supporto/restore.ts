// src/supporto/restore.ts
import { supabase } from "./supabaseClient";

/** Tabelle ripristinabili (hanno `deleted_at`). */
export type RestorableTable =
    | "tasks"
    | "progetti"
    | "clienti"
    | "utenti"
    | "stati"
    | "priorita"
    | "ruoli"
    | "time_entries"
    | "utenti_task"
    | "utenti_progetti"
    | "progetti_task"
    | "commenti"
    | "commenti_destinatari"
    | "notifiche"
    | "notifiche_preferenze"
    | "notifiche_tipi"
    | "notifiche_utenti"
    | "permessi"
    | "ruoli_permessi";

/** Ripristina un singolo record (deleted_at = null) per PK `id`. */
export async function restoreRecord(
    tipo: RestorableTable,
    id: number | string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from(tipo)
            .update({ deleted_at: null })
            .eq("id", id);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/** Ripristino bulk (inverse del softDeleteWhere). */
export async function restoreWhere(
    tipo: RestorableTable,
    match: Record<string, string | number | null>
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        let query: any = supabase.from(tipo).update({ deleted_at: null });

        for (const [k, v] of Object.entries(match)) {
            query = v === null ? query.is(k, null) : query.eq(k, v);
        }

        // In supabase-js v2, select accetta max 1 argomento
        const { error, data } = await query.select("*");
        if (error) return { success: false, count: 0, error: error.message };

        return { success: true, count: Array.isArray(data) ? data.length : 0 };
    } catch (err: any) {
        return { success: false, count: 0, error: err.message };
    }
}

/* ===================== Helper specifici: time_entries ===================== */

/** Ripristina UNA time entry (PK bigint). */
export async function restoreTimeEntry(
    id: number
): Promise<{ success: boolean; error?: string }> {
    return restoreRecord("time_entries", id);
}

/** Ripristina TUTTE le time entries di una task. */
export async function restoreTimeEntriesByTask(
    taskId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    return restoreWhere("time_entries", { task_id: taskId });
}

/** Ripristina TUTTE le time entries di un progetto. */
export async function restoreTimeEntriesByProject(
    progettoId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    return restoreWhere("time_entries", { progetto_id: progettoId });
}

/** Ripristina TUTTE le time entries di un utente. */
export async function restoreTimeEntriesByUser(
    utenteId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    return restoreWhere("time_entries", { utente_id: utenteId });
}
