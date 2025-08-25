// src/supporto/hardDelete.ts
import { supabase } from "./supabaseClient";

/**
 * Sostituisce tutti i riferimenti a un vecchio ID con un nuovo ID
 * @param table "stati" | "priorita" | "ruoli"
 * @param oldId ID che deve essere eliminato
 * @param newId ID che lo sostituirà
 */
export async function replaceReferences(
    table: "stati" | "priorita" | "ruoli",
    oldId: number,
    newId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        if (table === "stati") {
            // tasks.stato_id
            await supabase.from("tasks").update({ stato_id: newId }).eq("stato_id", oldId);
            // progetti.stato_id
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
 * Elimina definitivamente un record da stati, priorita, ruoli.
 * Prima di chiamarlo devi aver sostituito i riferimenti con un altro ID valido.
 */
export async function hardDelete(
    table: "stati" | "priorita" | "ruoli",
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
