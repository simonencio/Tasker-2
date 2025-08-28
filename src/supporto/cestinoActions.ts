import {
    hardDeleteTask,
    hardDeleteProgetto,
    hardDeleteUtente,
    hardDeleteCliente,
} from "./hardDeleteRecursive";
import { hardDelete } from "./hardDelete";
import { supabase } from "./supabaseClient";

export const cestinoActions = {
    tasks: {
        restore: async (id: string | number) => {
            await supabase.from("tasks").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteTask(String(id));
        },
    },
    progetti: {
        restore: async (id: string | number) => {
            await supabase.from("progetti").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteProgetto(String(id));
        },
    },
    utenti: {
        restore: async (id: string | number) => {
            await supabase.from("utenti").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteUtente(String(id));
        },
    },
    clienti: {
        restore: async (id: string | number) => {
            await supabase.from("clienti").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteCliente(String(id));
        },
    },
    stati: {
        restore: async (id: string | number) => {
            await supabase.from("stati").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("stati", Number(id));
        },
    },
    priorita: {
        restore: async (id: string | number) => {
            await supabase.from("priorita").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("priorita", Number(id));
        },
    },
    ruoli: {
        restore: async (id: string | number) => {
            await supabase.from("ruoli").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("ruoli", Number(id));
        },
    },
    time_entries: {
        restore: async (id: string | number) => {
            await supabase.from("time_entries").update({ deleted_at: null }).eq("id", id);
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("time_entries", Number(id));
        },
    },
};
