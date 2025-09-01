import { faFlag } from "@fortawesome/free-solid-svg-icons";
import { fetchStati, fetchStatiDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDelete } from "../../supporto/softDelete";
import type { ResourceConfig, Stato } from "../typesLista";
import { azioni, dispatchResourceEvent } from "./azioniConfig";

export const statiConfig: ResourceConfig<Stato> = {
    key: "stati",
    titolo: "Lista Stati",
    icona: faFlag,
    coloreIcona: "text-green-500",
    fetch: async () => await fetchStati(),
    cestino: {
        fetch: async () => await fetchStatiDeleted(),
        actions: cestinoActions.stati,
    },
    colonne: [
        { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
        {
            chiave: "colore",
            label: "Colore",
            className: "w-20 text-center",
            render: (s) =>
                s.colore ? (
                    <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: s.colore }} />
                ) : (
                    "-"
                ),
        },
    ],
    azioni: (stato) => (
        <>
            {azioni.edit(() => (window as any).__openMiniEdit("stati", stato.id))}
            {azioni.trashSoft(async () => {
                if (!window.confirm("Eliminare questo stato?")) return;
                const res = await softDelete("stati", Number(stato.id));
                if (res.success) dispatchResourceEvent("remove", "stati", { id: stato.id });
                else alert("Errore eliminazione: " + res.error);
            })}
        </>
    ),
};
