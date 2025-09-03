import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPen,
    faTrash,
    faUndo,
    faFolderOpen,
    faProjectDiagram,
    faCheckCircle,
    faPlay,
    faStop,
    faIdCard, // 👈 nuova icona per dettaglio cliente
} from "@fortawesome/free-solid-svg-icons";
import type { JSX } from "react";

/**
 * Utility per notificare tutte le viste di un cambiamento
 */
export function dispatchResourceEvent(
    tipo: "update" | "remove" | "add" | "replace",
    resource: string,
    payload: any
) {
    window.dispatchEvent(
        new CustomEvent("resource:event", {
            detail: { tipo, resource, payload },
        })
    );
}

/**
 * Tutte le azioni standard UI (senza logica di business).
 * ✅ Tutte con `.clickable`, tooltip e colori centralizzati.
 */
export const azioni = {
    edit: (onClick: () => void, title = "Modifica"): JSX.Element => (
        <button
            onClick={onClick}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faPen} className="clickable icon-edit" />
        </button>
    ),

    trashSoft: (onClick: () => Promise<void> | void, title = "Elimina"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faTrash} className="clickable icon-delete" />
        </button>
    ),

    restore: (onClick: () => Promise<void> | void, title = "Ripristina"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faUndo} className="clickable icon-restore" />
        </button>
    ),

    trashHard: (onClick: () => Promise<void> | void, title = "Elimina definitivamente"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faTrash} className="clickable icon-delete" />
        </button>
    ),

    openFolder: (onClick: () => void, title = "Apri cartella"): JSX.Element => (
        <button
            onClick={onClick}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faFolderOpen} className="clickable icon-folder" />
        </button>
    ),

    navigateTo: (onClick: () => void, title = "Vai al dettaglio"): JSX.Element => (
        <button
            onClick={onClick}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faProjectDiagram} className="clickable icon-navigate" />
        </button>
    ),

    dettaglioCliente: (onClick: () => void, title = "Dettaglio Cliente"): JSX.Element => (
        <button
            onClick={onClick}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faIdCard} className="clickable icon-detail" />
        </button>
    ),

    complete: (onClick: () => Promise<void> | void, title = "Segna come completato"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faCheckCircle} className="clickable icon-complete" />
        </button>
    ),

    play: (onClick: () => Promise<void> | void, title = "Avvia timer"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faPlay} className="clickable icon-play" />
        </button>
    ),

    stop: (onClick: () => Promise<void> | void, title = "Ferma timer"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="clickable icon-action tooltip"
            data-tooltip={title}
        >
            <FontAwesomeIcon icon={faStop} className="clickable icon-stop" />
        </button>
    ),
};

/**
 * Utility per ascoltare eventi globali di risorsa
 */
export function listenResourceEvents(
    resource: string,
    callback: (tipo: "update" | "remove" | "add" | "replace", payload: any) => void
) {
    function handler(e: Event) {
        const custom = e as CustomEvent;
        if (custom.detail.resource !== resource) return;
        callback(custom.detail.tipo, custom.detail.payload);
    }
    window.addEventListener("resource:event", handler);
    return () => window.removeEventListener("resource:event", handler);
}
