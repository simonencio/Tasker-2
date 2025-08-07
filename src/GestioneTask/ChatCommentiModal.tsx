import { useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faReply } from "@fortawesome/free-solid-svg-icons";
import type { JSX } from "react";
import { mostraNotificaBrowser } from "../Notifiche/notificheBrowserUtils";

export type Commento = {
    id: string;
    parent_id?: string | null;
    descrizione: string;
    created_at: string;
    utente?: {
        id: string;
        nome: string;
        cognome?: string | null;
    } | null;
    destinatario?: {
        id: string;
        nome: string;
        cognome?: string | null;
    } | null;
};

type Utente = {
    id: string;
    nome: string;
    cognome?: string | null;
};

type Props = {
    commenti: Commento[];
    utenteId: string;
    taskId: string;
    assegnatari: Utente[];
    onClose: () => void;
    onNuovoCommento: () => void;
};

export default function ChatCommentiModal({
    commenti,
    utenteId,
    taskId,
    assegnatari,
    onClose,
    onNuovoCommento,
}: Props) {
    const [testo, setTesto] = useState("");
    const [parentId, setParentId] = useState<string | null>(null);
    const [destinatarioId, setDestinatarioId] = useState<string | null>(null);

    const handleInvia = async () => {
        if (!testo.trim()) return;

        const { error } = await supabase.from("commenti").insert({
            task_id: taskId,
            utente_id: utenteId,
            descrizione: testo,
            parent_id: parentId,
            destinatario_id: destinatarioId,
        });

        if (!error) {
            if (destinatarioId) {
                // Invia notifica via backend
                await inviaNotifica(
                    "commento_task",  // codice tipo notifica
                    [destinatarioId], // destinatari
                    testo,            // messaggio breve
                    utenteId,         // creatore
                    { task_id: taskId } // contesto
                );

                // Invia notifica browser al destinatario (se è utente corrente)
                if (destinatarioId === utenteId) {
                    mostraNotificaBrowser("💬 Nuovo commento", {
                        body: testo.length > 150 ? testo.slice(0, 150) + "..." : testo,
                    });
                }
            }

            setTesto("");
            setParentId(null);
            setDestinatarioId(null);
            onNuovoCommento();
        }
    };


    const renderCommenti = (parentId: string | null, livello = 0): JSX.Element[] => {
        const figli = commenti.filter(c => c.parent_id === parentId);
        return figli.flatMap(c => {
            const isMio = c.utente?.id === utenteId;
            const marginLeft = livello * 16;

            return [
                <div
                    key={c.id}
                    className={`flex ${isMio ? "justify-end" : "justify-start"} mb-2`}
                    style={{ marginLeft }}
                >
                    <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow text-sm whitespace-pre-line card-theme
                        ${isMio ? "bg-blue-100 dark:bg-blue-900 text-right" : "bg-theme"}`}
                    >
                        {c.parent_id && (
                            <div className="text-xs text-gray-400 italic mb-1">↪️ In risposta a...</div>
                        )}
                        <div className="text-xs font-semibold text-theme mb-1">
                            👤 {c.utente?.nome} {c.utente?.cognome || ""}
                        </div>
                        <div className="text-theme">{c.descrizione}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(c.created_at).toLocaleString()}
                        </div>
                        <div className="mt-2 text-right">
                            <button
                                className="text-xs text-blue-600 hover:underline"
                                onClick={() => {
                                    setParentId(c.id);
                                    setDestinatarioId(c.utente?.id || null);
                                }}
                            >
                                <FontAwesomeIcon icon={faReply} className="mr-1" />
                                Rispondi
                            </button>
                        </div>
                    </div>
                </div>,
                ...renderCommenti(c.id, livello + 1),
            ];
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="modal-container w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-scale-fade">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-300 dark:border-gray-600 bg-theme">
                    <h2 className="text-lg font-bold text-theme">💬 Commenti</h2>
                    <FontAwesomeIcon
                        icon={faTimes}
                        className="cursor-pointer text-gray-500 hover:text-red-500 icon-color text-xl"
                        onClick={onClose}
                    />
                </div>

                {/* Corpo scrollabile */}
                <div className="flex-1 overflow-y-auto hide-scrollbar p-5 bg-theme">
                    {commenti.length > 0 ? (
                        renderCommenti(null)
                    ) : (
                        <div className="text-sm text-gray-500 text-center mt-8">Nessun commento</div>
                    )}
                </div>

                {/* Footer scrittura */}
                <div className="p-4 border-t border-gray-300 dark:border-gray-600 bg-theme space-y-2">
                    {parentId && (
                        <div className="text-xs text-blue-600">
                            Rispondendo a un commento...{" "}
                            <button className="ml-2 text-red-500" onClick={() => setParentId(null)}>
                                Annulla
                            </button>
                        </div>
                    )}
                    <textarea
                        value={testo}
                        onChange={e => setTesto(e.target.value)}
                        placeholder="Scrivi un messaggio..."
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-theme text-theme text-sm resize-none"
                        rows={2}
                    />
                    <div className="flex items-center justify-between">
                        <select
                            className="text-sm text-theme border rounded px-2 py-1 bg-theme"
                            value={destinatarioId || ""}
                            onChange={e => setDestinatarioId(e.target.value || null)}
                        >
                            <option value="">📬 Nessun destinatario</option>
                            {assegnatari.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.nome} {u.cognome || ""}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleInvia}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                        >
                            Invia
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
