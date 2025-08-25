import { useState, type JSX } from "react";
import IntestazioneLista from "./IntestazioneLista";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPen, faRotateLeft } from "@fortawesome/free-solid-svg-icons";

import { softDelete } from "../supporto/softDelete";
import { softDeleteTask, softDeleteProgetto, softDeleteUtente, softDeleteCliente } from "../supporto/softDeleteRecursive";

import { restoreRecord } from "../supporto/restore";
import { restoreTask, restoreProgetto, restoreUtente, restoreCliente } from "../supporto/restoreRecursive";

import { replaceReferences, hardDelete } from "../supporto/hardDelete";
import ConfermaSostituzioneModal from "../supporto/ConfermaSostituzioneModal";
import { hardDeleteCliente, hardDeleteProgetto, hardDeleteTask, hardDeleteUtente } from "../supporto/hardDeleteRecursive";

type Colonna<T> = {
    chiave: keyof T | string;
    label: string;
    className?: string;
    render?: (item: T) => JSX.Element | string | null;
};

type ListaGenericaProps<T> = {
    titolo: string | JSX.Element;
    icona: any;
    coloreIcona: string;
    tipo: "tasks" | "progetti" | "clienti" | "utenti" | "stati" | "priorita" | "ruoli";
    dati: T[];
    loading: boolean;
    colonne: Colonna<T>[];
    azioni?: (item: T) => JSX.Element;
    renderDettaglio?: (item: T) => JSX.Element | null;
    azioniExtra?: JSX.Element;
    filtri?: JSX.Element;
    renderModaleModifica?: (id: string, onClose: () => void) => JSX.Element;
    modalitaCestino?: boolean;
};

export default function ListaGenerica<T extends { id: string | number }>({
    titolo,
    icona,
    coloreIcona,
    tipo,
    dati,
    loading,
    colonne,
    azioni,
    renderDettaglio,
    azioniExtra,
    filtri,
    renderModaleModifica,
    modalitaCestino,
}: ListaGenericaProps<T>) {
    const [itemEspansoId, setItemEspansoId] = useState<string | null>(null);
    const [itemDaModificareId, setItemDaModificareId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState<{ tipo: string; id: number } | null>(null);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <IntestazioneLista
                titolo={titolo}
                icona={icona}
                coloreIcona={coloreIcona}
                tipo={tipo}
                azioniExtra={azioniExtra}
                modalitaCestino={modalitaCestino}
            />

            {filtri && <div className="mb-6">{filtri}</div>}

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-7xl mx-auto">
                    {/* intestazione tabella */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        {colonne.map((col) => (
                            <div key={col.chiave as string} className={col.className ?? "flex-1"}>
                                {col.label}
                            </div>
                        ))}
                        <div className="w-28 text-center">Azioni</div>
                    </div>

                    {/* righe */}
                    {dati.map((item) => {
                        const itemId = String(item.id);
                        const isOpen = itemEspansoId === itemId;
                        return (
                            <div
                                key={itemId}
                                className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme"
                            >
                                {/* riga principale */}
                                <div
                                    className="flex items-center px-4 py-3 text-sm text-theme cursor-pointer"
                                    onClick={() => setItemEspansoId(isOpen ? null : itemId)}
                                >
                                    {colonne.map((col) => (
                                        <div key={col.chiave as string} className={col.className ?? "flex-1"}>
                                            {col.render ? col.render(item) : (item as any)[col.chiave]}
                                        </div>
                                    ))}

                                    <div
                                        className={`w-28 flex items-center shrink-0 ${modalitaCestino ? "justify-center gap-3" : "justify-end gap-3"
                                            }`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {azioni && azioni(item)}

                                        {/* modifica */}
                                        {renderModaleModifica && (
                                            <button
                                                onClick={() => setItemDaModificareId(itemId)}
                                                className="icon-color hover:text-blue-600"
                                                title="Modifica"
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                        )}

                                        {/* ripristino (solo cestino) */}
                                        {modalitaCestino && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        if (tipo === "tasks") await restoreTask(itemId);
                                                        else if (tipo === "progetti") await restoreProgetto(itemId);
                                                        else if (tipo === "utenti") await restoreUtente(itemId);
                                                        else if (tipo === "clienti") await restoreCliente(itemId);
                                                        else {
                                                            const res = await restoreRecord(tipo, itemId);
                                                            if (!res.success) throw new Error(res.error);
                                                        }

                                                    } catch (err: any) {
                                                        alert("Errore ripristino: " + err.message);
                                                    }
                                                }}
                                                className="icon-color hover:text-green-600"
                                                title="Ripristina"
                                            >
                                                <FontAwesomeIcon icon={faRotateLeft} />
                                            </button>
                                        )}

                                        {/* eliminazione */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();

                                                if (modalitaCestino) {
                                                    // 🔹 SOLO per stati/priorità/ruoli → apri modale sostituzione
                                                    if (tipo === "stati" || tipo === "priorita" || tipo === "ruoli") {
                                                        setShowModal({ tipo, id: Number(itemId) });
                                                        return;
                                                    }

                                                    // 🔹 Per tasks, progetti, utenti, clienti → hard delete diretto
                                                    try {
                                                        if (tipo === "tasks") await hardDeleteTask(itemId);
                                                        else if (tipo === "progetti") await hardDeleteProgetto(itemId);
                                                        else if (tipo === "utenti") await hardDeleteUtente(itemId);
                                                        else if (tipo === "clienti") await hardDeleteCliente(itemId);
                                                        else throw new Error("Tipo non supportato per hard delete");


                                                    } catch (err: any) {
                                                        alert("Errore eliminazione definitiva: " + err.message);
                                                    }
                                                    return;
                                                }

                                                // 🔹 Eliminazione soft (fuori dal cestino)
                                                if (!window.confirm("Sei sicuro di voler eliminare questo elemento?")) return;

                                                try {
                                                    if (tipo === "stati" || tipo === "priorita" || tipo === "ruoli") {
                                                        const res = await softDelete(tipo, Number(itemId));
                                                        if (!res.success) throw new Error(res.error);
                                                    } else if (tipo === "tasks") await softDeleteTask(itemId);
                                                    else if (tipo === "progetti") await softDeleteProgetto(itemId);
                                                    else if (tipo === "utenti") await softDeleteUtente(itemId);
                                                    else if (tipo === "clienti") await softDeleteCliente(itemId);
                                                    else throw new Error("Tipo non supportato");


                                                } catch (err: any) {
                                                    alert("Errore eliminazione: " + err.message);
                                                }
                                            }}
                                            className="icon-color hover:text-red-600"
                                            title={modalitaCestino ? "Elimina definitivamente" : "Elimina"}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>

                                    </div>
                                </div>

                                {isOpen && renderDettaglio && (
                                    <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-1">
                                        {renderDettaglio(item)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* modale modifica */}
            {itemDaModificareId &&
                renderModaleModifica?.(itemDaModificareId, () => setItemDaModificareId(null))}

            {/* modale hard delete/sostituzione */}
            {showModal && (
                <ConfermaSostituzioneModal
                    tipo={showModal.tipo as "stati" | "priorita" | "ruoli"}
                    excludeId={showModal.id}
                    onCancel={() => setShowModal(null)}
                    onConfirm={async (newId) => {
                        const rep = await replaceReferences(showModal.tipo as any, showModal.id, newId);
                        if (!rep.success) {
                            alert("Errore sostituzione: " + rep.error);
                            return;
                        }
                        const del = await hardDelete(showModal.tipo as any, showModal.id);
                        if (!del.success) {
                            alert("Errore eliminazione: " + del.error);
                            return;
                        }

                    }}
                />
            )}
        </div>
    );
}
