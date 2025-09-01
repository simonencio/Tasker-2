import { faUser } from "@fortawesome/free-solid-svg-icons";
import { fetchUtenti, fetchUtentiDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDeleteUtente } from "../../supporto/softDeleteRecursive";
import type { ResourceConfig, Utente } from "../typesLista";
import { azioni, dispatchResourceEvent } from "./azioniConfig";
import { AvatarFallback } from "./common";

export const utentiConfig: ResourceConfig<Utente> = {
    key: "utenti",
    titolo: "Lista Utenti",
    icona: faUser,
    coloreIcona: "text-purple-500",
    fetch: async () => await fetchUtenti(),
    cestino: {
        fetch: async () => await fetchUtentiDeleted(),
        actions: cestinoActions.utenti,
    },
    colonne: [
        {
            chiave: "avatar",
            label: "",
            className: "w-10 shrink-0",
            render: (u) =>
                u.avatar_url ? (
                    <img src={u.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                    <AvatarFallback text={u.nome ?? "?"} />
                ),
        },
        {
            chiave: "nomeCompleto",
            label: "Nome",
            className: "flex-1 font-medium truncate",
            render: (u) => `${u.nome} ${u.cognome}`,
        },
    ],
    azioni: (utente) => (
        <>
            {azioni.edit(() => (window as any).__openMiniEdit("utenti", utente.id))}
            {azioni.trashSoft(async () => {
                if (!window.confirm("Eliminare questo utente?")) return;
                await softDeleteUtente(utente.id);
                dispatchResourceEvent("remove", "utenti", { id: utente.id });
            })}
        </>
    ),
    renderDettaglio: (u) => (
        <div>
            <p>Email: {u.email}</p>
            <p>Ruolo: {u.ruolo?.nome}</p>
        </div>
    ),
};
