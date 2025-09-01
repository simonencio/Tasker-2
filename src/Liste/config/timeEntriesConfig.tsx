import { faClock } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../supporto/supabaseClient";
import type { ResourceConfig, TimeEntry } from "../typesLista";
import { fmt } from "./common";
import { azioni, dispatchResourceEvent } from "./azioniConfig";

export const timeEntriesConfig: ResourceConfig<TimeEntry> = {
    key: "time_entries",
    titolo: "Registro attività",
    icona: faClock,
    coloreIcona: "text-gray-500",
    fetch: async () => {
        const { data, error } = await supabase
            .from("time_entries")
            .select(
                `
        id, data_inizio, data_fine, durata, deleted_at,
        utente:utente_id (id, nome, cognome),
        progetto:progetto_id (id, nome),
        task:task_id (id, nome)
      `
            )
            .is("deleted_at", null)
            .order("data_inizio", { ascending: false });
        if (error) throw error;
        return data as any as TimeEntry[];
    },
    azioni: (t) =>
        azioni.trashSoft(async () => {
            if (!window.confirm("Eliminare questa registrazione di tempo?")) return;
            try {
                await supabase.from("time_entries").update({ deleted_at: new Date().toISOString() }).eq("id", t.id);
                dispatchResourceEvent("remove", "time_entries", { id: t.id });
            } catch (err: any) {
                alert("Errore eliminazione: " + err.message);
            }
        }),
    cestino: {
        fetch: async () => {
            const { data, error } = await supabase
                .from("time_entries")
                .select(
                    `
        id, data_inizio, data_fine, durata, deleted_at,
        utente:utente_id (id, nome, cognome),
        progetto:progetto_id (id, nome),
        task:task_id (id, nome)
      `
                )
                .not("deleted_at", "is", null)
                .order("data_inizio", { ascending: false });
            if (error) throw error;
            return (data || []) as any as TimeEntry[];
        },
        actions: {
            restore: async (id: string | number) => {
                const { error } = await supabase.from("time_entries").update({ deleted_at: null }).eq("id", id);
                if (error) throw error;
                dispatchResourceEvent("add", "time_entries", { id });
            },
            hardDelete: async (id: string | number) => {
                const { error } = await supabase.from("time_entries").delete().eq("id", id);
                if (error) throw error;
                dispatchResourceEvent("remove", "time_entries", { id });
            },
        },
    },
    colonne: [
        {
            chiave: "utente",
            label: "Utente",
            className: "w-40",
            render: (t) => (t.utente ? `${t.utente.nome} ${t.utente.cognome}` : "—"),
        },
        { chiave: "progetto", label: "Progetto", className: "w-40", render: (t) => t.progetto?.nome ?? "—" },
        { chiave: "task", label: "Task", className: "flex-1", render: (t) => t.task?.nome ?? "—" },
        { chiave: "data_inizio", label: "Inizio", className: "w-40", render: (t) => new Date(t.data_inizio).toLocaleString() },
        { chiave: "data_fine", label: "Fine", className: "w-40", render: (t) => (t.data_fine ? new Date(t.data_fine).toLocaleString() : "—") },
        { chiave: "durata", label: "Durata", className: "w-32", render: (t) => fmt.durata(t.durata) },
    ],
};
