import {
    hardDeleteTask,
    hardDeleteProgetto,
    hardDeleteUtente,
    hardDeleteCliente,
} from "./hardDeleteRecursive";
import { hardDelete } from "./hardDelete";
import { supabase } from "./supabaseClient";
import { dispatchResourceEvent } from "../Liste/config/azioniConfig";

export const cestinoActions = {
    tasks: {
        restore: async (id: string | number) => {
            await supabase.from("tasks").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "tasks", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteTask(String(id));
            dispatchResourceEvent("remove", "tasks", { id });
        },
    },
    progetti: {
        restore: async (id: string | number) => {
            await supabase.from("progetti").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "progetti", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteProgetto(String(id));
            dispatchResourceEvent("remove", "progetti", { id });
        },
    },
    utenti: {
        restore: async (id: string | number) => {
            await supabase.from("utenti").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "utenti", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteUtente(String(id));
            dispatchResourceEvent("remove", "utenti", { id });
        },
    },
    clienti: {
        restore: async (id: string | number) => {
            await supabase.from("clienti").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "clienti", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDeleteCliente(String(id));
            dispatchResourceEvent("remove", "clienti", { id });
        },
    },
    stati: {
        restore: async (id: string | number) => {
            await supabase.from("stati").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "stati", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("stati", Number(id));
            dispatchResourceEvent("remove", "stati", { id });
        },
    },
    priorita: {
        restore: async (id: string | number) => {
            await supabase.from("priorita").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "priorita", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("priorita", Number(id));
            dispatchResourceEvent("remove", "priorita", { id });
        },
    },
    ruoli: {
        restore: async (id: string | number) => {
            await supabase.from("ruoli").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "ruoli", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("ruoli", Number(id));
            dispatchResourceEvent("remove", "ruoli", { id });
        },
    },
    time_entries: {
        restore: async (id: string | number) => {
            await supabase.from("time_entries").update({ deleted_at: null }).eq("id", id);
            dispatchResourceEvent("remove", "time_entries", { id });
        },
        hardDelete: async (id: string | number) => {
            await hardDelete("time_entries", Number(id));
            dispatchResourceEvent("remove", "time_entries", { id });
        },
    },
};
