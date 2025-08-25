// src/supporto/restore.ts
import { supabase } from "./supabaseClient";

export async function restoreRecord(
    tipo: "tasks" | "progetti" | "clienti" | "utenti" | "stati" | "priorita" | "ruoli",
    id: number | string
) {
    try {
        const { error } = await supabase
            .from(tipo)
            .update({ deleted_at: null })
            .eq("id", id);

        if (error) {
            console.error("Errore nel ripristino:", error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Eccezione nel ripristino:", err.message);
        return { success: false, error: err.message };
    }
}
