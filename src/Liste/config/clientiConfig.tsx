import { faAddressBook, faEnvelope, faPhone, faStickyNote, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetchClienti, fetchClientiDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDeleteCliente } from "../../supporto/softDeleteRecursive";
import type { ResourceConfig, Cliente } from "../typesLista";
import { azioni, dispatchResourceEvent } from "./azioniConfig";
import { AvatarFallback } from "./common";

export const clientiConfig: ResourceConfig<Cliente> = {
    key: "clienti",
    titolo: "Lista Clienti",
    icona: faAddressBook,
    coloreIcona: "text-orange-500",
    fetch: async () => await fetchClienti(),
    cestino: {
        fetch: async () => await fetchClientiDeleted(),
        actions: cestinoActions.clienti,
    },
    colonne: [
        {
            chiave: "avatar",
            label: "",
            className: "w-10 shrink-0",
            render: (c) =>
                c.avatar_url ? (
                    <img src={c.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                    <AvatarFallback text={c.nome ?? "?"} />
                ),
        },
        { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
    ],
    azioni: (cliente, ctx) => (
        <>
            {azioni.edit(() => (window as any).__openMiniEdit("clienti", cliente.id))}
            {/* Nuova icona per aprire DettaglioCliente */}
            <button
                className="icon-color hover:text-blue-600"
                title="Dettaglio Cliente"
                onClick={() => ctx.navigate(`/clienti/${cliente.id}`)}
            >
                <FontAwesomeIcon icon={faUpRightFromSquare} />
            </button>
            {azioni.trashSoft(async () => {
                if (!window.confirm("Eliminare questo cliente?")) return;
                await softDeleteCliente(cliente.id);
                dispatchResourceEvent("remove", "clienti", { id: cliente.id });
            })}
        </>
    ),
    renderDettaglio: (c) => (
        <div className="space-y-1">
            {c.email && (
                <p>
                    <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-500" />
                    {c.email}
                </p>
            )}
            {c.telefono && (
                <p>
                    <FontAwesomeIcon icon={faPhone} className="mr-2 text-gray-500" />
                    {c.telefono}
                </p>
            )}
            {c.note && (
                <p>
                    <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-500" />
                    {c.note}
                </p>
            )}
        </div>
    ),
};
