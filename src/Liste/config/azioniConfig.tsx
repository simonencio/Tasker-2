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
} from "@fortawesome/free-solid-svg-icons";
import type { JSX } from "react";

/**
 * Utility per notificare tutte le viste di un cambiamento
 */
export function dispatchResourceEvent(
    tipo: "update" | "remove" | "add" | "replace", // 👈 aggiunto "replace"
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
 */
export const azioni = {
    edit: (onClick: () => void, title = "Modifica") => (
        <button onClick={onClick} className="icon-color hover:text-blue-600" title={title}>
            <FontAwesomeIcon icon={faPen} />
        </button>
    ),
    trashSoft: (onClick: () => Promise<void> | void, title = "Elimina"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="icon-color hover:text-red-600"
            title={title}
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    restore: (onClick: () => Promise<void> | void, title = "Ripristina"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="icon-color hover:text-green-600"
            title={title}
        >
            <FontAwesomeIcon icon={faUndo} />
        </button>
    ),
    trashHard: (onClick: () => Promise<void> | void, title = "Elimina definitivamente"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="icon-color hover:text-red-700"
            title={title}
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    ),
    openFolder: (onClick: () => void, title = "Apri"): JSX.Element => (
        <button onClick={onClick} className="icon-color hover:text-violet-600" title={title}>
            <FontAwesomeIcon icon={faFolderOpen} />
        </button>
    ),
    navigateTo: (onClick: () => void, title = "Vai al dettaglio"): JSX.Element => (
        <button onClick={onClick} className="icon-color hover:text-green-600" title={title}>
            <FontAwesomeIcon icon={faProjectDiagram} />
        </button>
    ),
    complete: (onClick: () => Promise<void> | void, title = "Segna come completato"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="icon-color hover:text-emerald-600"
            title={title}
        >
            <FontAwesomeIcon icon={faCheckCircle} />
        </button>
    ),
    play: (onClick: () => Promise<void> | void, title = "Avvia timer"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="icon-color hover:text-green-600"
            title={title}
        >
            <FontAwesomeIcon icon={faPlay} />
        </button>
    ),
    stop: (onClick: () => Promise<void> | void, title = "Ferma timer"): JSX.Element => (
        <button
            onClick={async () => await onClick()}
            className="icon-color hover:text-red-600"
            title={title}
        >
            <FontAwesomeIcon icon={faStop} />
        </button>
    ),
};
