import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { fetchPriorita, fetchPrioritaDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDelete } from "../../supporto/softDelete";
import type { ResourceConfig, Priorita } from "../typesLista";
import { azioni, dispatchResourceEvent } from "./azioniConfig";

export const prioritaConfig: ResourceConfig<Priorita> = {
    key: "priorita",
    titolo: "Lista Priorità",
    icona: faExclamationTriangle,
    coloreIcona: "text-red-500",
    fetch: async () => await fetchPriorita(),
    cestino: {
        fetch: async () => await fetchPrioritaDeleted(),
        actions: cestinoActions.priorita,
    },
    colonne: [
        { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
        {
            chiave: "colore",
            label: "Colore",
            className: "w-20 text-center",
            render: (p) =>
                p.colore ? (
                    <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: p.colore }} />
                ) : (
                    "-"
                ),
        },
    ],
    azioni: (priorita) => (
        <>
            {azioni.edit(() => (window as any).__openMiniEdit("priorita", priorita.id))}
            {azioni.trashSoft(async () => {
                if (!window.confirm("Eliminare questa priorità?")) return;
                const res = await softDelete("priorita", Number(priorita.id));
                if (res.success) dispatchResourceEvent("remove", "priorita", { id: priorita.id });
                else alert("Errore eliminazione: " + res.error);
            })}
        </>
    ),
};
