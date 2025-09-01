import { faUserShield } from "@fortawesome/free-solid-svg-icons";
import { fetchRuoli, fetchRuoliDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDelete } from "../../supporto/softDelete";
import type { ResourceConfig, Ruolo } from "../typesLista";
import { azioni, dispatchResourceEvent } from "./azioniConfig";

export const ruoliConfig: ResourceConfig<Ruolo> = {
    key: "ruoli",
    titolo: "Lista Ruoli",
    icona: faUserShield,
    coloreIcona: "text-blue-500",
    fetch: async () => await fetchRuoli(),
    cestino: {
        fetch: async () => await fetchRuoliDeleted(),
        actions: cestinoActions.ruoli,
    },
    colonne: [{ chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" }],
    azioni: (ruolo) => (
        <>
            {azioni.edit(() => (window as any).__openMiniEdit("ruoli", ruolo.id))}
            {azioni.trashSoft(async () => {
                if (!window.confirm("Eliminare questo ruolo?")) return;
                const res = await softDelete("ruoli", Number(ruolo.id));
                if (res.success) dispatchResourceEvent("remove", "ruoli", { id: ruolo.id });
                else alert("Errore eliminazione: " + res.error);
            })}
        </>
    ),
};
