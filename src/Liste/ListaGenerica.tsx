import { useState, type JSX } from "react";
import IntestazioneLista from "./IntestazioneLista";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPen } from "@fortawesome/free-solid-svg-icons";

type Colonna<T> = {
    chiave: keyof T | string;
    label: string;
    className?: string;
    render?: (item: T) => JSX.Element | string | null;
};

type ListaGenericaProps<T> = {
    titolo: string;
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
}: ListaGenericaProps<T>) {
    const [itemEspansoId, setItemEspansoId] = useState<string | null>(null);
    const [itemDaModificareId, setItemDaModificareId] = useState<string | null>(null);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
            <IntestazioneLista
                titolo={titolo}
                icona={icona}
                coloreIcona={coloreIcona}
                tipo={tipo}
                azioniExtra={azioniExtra}
            />

            {filtri && <div className="mb-6">{filtri}</div>}

            {loading ? (
                <p className="text-center text-theme text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme max-w-7xl mx-auto">
                    {/* header tabella */}
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        {colonne.map((col) => (
                            <div
                                key={col.chiave as string}
                                className={col.className ?? "flex-1"}
                            >
                                {col.label}
                            </div>
                        ))}
                        <div className="w-20 text-center">Azioni</div>
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
                                    onClick={() =>
                                        setItemEspansoId(isOpen ? null : itemId)
                                    }
                                >
                                    {colonne.map((col) => (
                                        <div
                                            key={col.chiave as string}
                                            className={col.className ?? "flex-1"}
                                        >
                                            {col.render
                                                ? col.render(item)
                                                : (item as any)[col.chiave]}
                                        </div>
                                    ))}

                                    <div
                                        className="w-20 flex justify-end items-center gap-3 shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* azioni custom */}
                                        {azioni && azioni(item)}

                                        {/* pulsante modifica */}
                                        {renderModaleModifica && (
                                            <button
                                                onClick={() =>
                                                    setItemDaModificareId(itemId)
                                                }
                                                className="icon-color hover:text-blue-600"
                                                title="Modifica"
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                        )}

                                        {/* pulsante eliminazione */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // TODO: logica di eliminazione
                                            }}
                                            className="icon-color hover:text-red-600"
                                            title="Elimina"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>

                                        <button className="text-theme text-xl font-bold">
                                            {isOpen ? "−" : "+"}
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
                renderModaleModifica?.(itemDaModificareId, () =>
                    setItemDaModificareId(null)
                )}
        </div>
    );
}
