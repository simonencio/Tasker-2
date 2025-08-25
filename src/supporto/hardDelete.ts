// src/supporto/hardDelete.ts
import { supabase } from "./supabaseClient";

/**
 * Sostituisce tutti i riferimenti a un vecchio ID con un nuovo ID
 * Valido solo per: "stati" | "priorita" | "ruoli"
 */
export async function replaceReferences(
    table: "stati" | "priorita" | "ruoli",
    oldId: number,
    newId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        if (table === "stati") {
            await supabase.from("tasks").update({ stato_id: newId }).eq("stato_id", oldId);
            await supabase.from("progetti").update({ stato_id: newId }).eq("stato_id", oldId);
        }

        if (table === "priorita") {
            await supabase.from("tasks").update({ priorita_id: newId }).eq("priorita_id", oldId);
            await supabase.from("progetti").update({ priorita_id: newId }).eq("priorita_id", oldId);
        }

        if (table === "ruoli") {
            await supabase.from("utenti").update({ ruolo: newId }).eq("ruolo", oldId);
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Hard delete generico per tabelle con PK numerica.
 * Aggiunta "time_entries".
 */
export async function hardDelete(
    table: "stati" | "priorita" | "ruoli" | "time_entries",
    id: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Helpers specifici per time_entries
 */
export async function hardDeleteTimeEntry(
    id: number
): Promise<{ success: boolean; error?: string }> {
    return hardDelete("time_entries", id);
}

/** Cancella TUTTE le time entries di una task */
export async function hardDeleteTimeEntriesByTask(
    taskId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const { error, count } = await supabase
            .from("time_entries")
            .delete({ count: "exact" })
            .eq("task_id", taskId);

        if (error) return { success: false, count: 0, error: error.message };
        return { success: true, count: count ?? 0 };
    } catch (err: any) {
        return { success: false, count: 0, error: err.message };
    }
}

/** Cancella TUTTE le time entries di un progetto */
export async function hardDeleteTimeEntriesByProject(
    progettoId: string
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const { error, count } = await supabase
            .from("time_entries")
            .delete({ count: "exact" })
            .eq("progetto_id", progettoId);

        if (error) return { success: false, count: 0, error: error.message };
        return { success: true, count: count ?? 0 };
    } catch (err: any) {
        return { success: false, count: 0, error: err.message };
    }
}
