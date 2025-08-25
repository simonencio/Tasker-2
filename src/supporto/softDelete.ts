// src/supporto/softDelete.ts
import { supabase } from "./supabaseClient";

/**
 * Soft delete su un record di una tabella con colonna `deleted_at`.
 * @param table Nome tabella (es. "stati", "priorita", "ruoli")
 * @param id ID del record da marcare come eliminato
 */
export async function softDelete(
    table: "stati" | "priorita" | "ruoli",
    id: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from(table)
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
