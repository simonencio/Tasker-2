// src/supporto/softDelete.ts
import { supabase } from "./supabaseClient";

/**
 * Tabelle con colonna `deleted_at`.
 * Aggiungi/rimuovi qui in base al tuo schema.
 */
export type SoftDeletableTable =
    | "stati"
    | "priorita"
    | "ruoli"
    | "clienti"
    | "progetti"
    | "tasks"
    | "time_entries"
    | "utenti"
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

/**
 * Soft delete singolo record per PK `id`.
 */
export async function softDelete(
    table: SoftDeletableTable,
    id: number | string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from(table)
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Soft delete bulk con filtro dinamico (es. { task_id, utente_id }).
 * NB: niente count in select(); usiamo data.length per contare.
 */
export async function softDeleteWhere(
    table: SoftDeletableTable,
    match: Record<string, string | number | null>
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        let query: any = supabase
            .from(table)
            .update({ deleted_at: new Date().toISOString() });

        for (const [k, v] of Object.entries(match)) {
            query = v === null ? query.is(k, null) : query.eq(k, v);
        }

        const { error, data } = await query.select("*"); // <- un solo argomento
        if (error) return { success: false, count: 0, error: error.message };

        return { success: true, count: Array.isArray(data) ? data.length : 0 };
    } catch (err: any) {
        return { success: false, count: 0, error: err.message };
    }
}

/* ===================== Helpers specifici: time_entries ===================== */

export async function softDeleteTimeEntry(
    id: number
): Promise<{ success: boolean; error?: string }> {
    return softDelete("time_entries", id);
}

export async function softDeleteTimeEntriesByTask(
    taskId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    return softDeleteWhere("time_entries", { task_id: taskId });
}

export async function softDeleteTimeEntriesByProject(
    progettoId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    return softDeleteWhere("time_entries", { progetto_id: progettoId });
}

export async function softDeleteTimeEntriesByUser(
    utenteId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    return softDeleteWhere("time_entries", { utente_id: utenteId });
}

/* ===================== Ripristino (undo) ===================== */

export async function restoreSoftDeleted(
    table: SoftDeletableTable,
    id: number | string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from(table)
            .update({ deleted_at: null })
            .eq("id", id);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function restoreSoftDeletedWhere(
    table: SoftDeletableTable,
    match: Record<string, string | number | null>
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        let query: any = supabase.from(table).update({ deleted_at: null });

        for (const [k, v] of Object.entries(match)) {
            query = v === null ? query.is(k, null) : query.eq(k, v);
        }

        const { error, data } = await query.select("*"); // <- un solo argomento
        if (error) return { success: false, count: 0, error: error.message };

        return { success: true, count: Array.isArray(data) ? data.length : 0 };
    } catch (err: any) {
        return { success: false, count: 0, error: err.message };
    }
}
