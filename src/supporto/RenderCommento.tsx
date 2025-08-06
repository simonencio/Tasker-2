import { useState } from "react";
import type { Commento } from "../supporto/tipi";

export default function RenderCommento({
    commento,
    allCommenti,
    livello,
}: {
    commento: Commento;
    allCommenti: Commento[];
    livello: number;
}) {
    const [espansa, setEspansa] = useState(false);
    const figli = allCommenti.filter(c => c.parent_id === commento.id);
    const paddingLeft = livello * 16;
    const cliccabile = figli.length > 0;

    return (
        <div className="space-y-1">
            <div
                className={`pr-2 py-1 rounded-md ${cliccabile ? "cursor-pointer hover-bg-theme" : ""}`}
                style={{ paddingLeft }}
                onClick={cliccabile ? () => setEspansa(e => !e) : undefined}
            >
                <div className="text-sm text-theme">
                    <p className="font-semibold">
                        {commento.utente?.nome} {commento.utente?.cognome || ""}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(commento.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                        {commento.descrizione}
                    </p>
                </div>
            </div>

            {espansa && cliccabile && (
                <div className="space-y-1">
                    {figli.map(figlio => (
                        <RenderCommento
                            key={figlio.id}
                            commento={figlio}
                            allCommenti={allCommenti}
                            livello={livello + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
