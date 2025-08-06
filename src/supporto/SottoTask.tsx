import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { Task } from "../supporto/tipi";

export default function RenderSottoTask({
    task,
    allTasks,
    livello,
}: {
    task: Task;
    allTasks: Task[];
    livello: number;
}) {
    const [espansa, setEspansa] = useState(false);
    const children = allTasks.filter(t => t.parent_id === task.id);
    const paddingLeft = livello * 16;
    const cliccabile = children.length > 0;

    return (
        <div className="space-y-1">
            <div
                className={`
                    flex items-center justify-between pr-2 py-1 rounded-md
                    ${cliccabile ? "cursor-pointer hover-bg-theme" : ""}
                `}
                style={{ paddingLeft }}
                onClick={cliccabile ? () => setEspansa(e => !e) : undefined}
            >
                <div className="flex items-center gap-2 flex-1 text-theme truncate">
                    <span className="w-4 flex justify-center items-center">
                        {task.fine_task && (
                            <FontAwesomeIcon
                                icon={faCheckCircle}
                                className="w-4 h-4 text-green-600"
                                title="Completata"
                            />
                        )}
                    </span>
                    <span className="truncate">
                        {task.nome}
                        {task.assegnatari?.length > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                                ({task.assegnatari.map(u => `${u.nome} ${u.cognome || ""}`).join(", ")})
                            </span>
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <FontAwesomeIcon
                        icon={faTrash}
                        className="w-4 h-4 text-red-600 cursor-pointer"
                        title="Elimina"
                        onClick={(e) => {
                            e.stopPropagation();
                            // TODO: gestione eliminazione futura
                        }}
                    />
                </div>
            </div>

            {espansa && cliccabile && (
                <div className="space-y-1">
                    {children.map((sotto) => (
                        <RenderSottoTask
                            key={sotto.id}
                            task={sotto}
                            allTasks={allTasks}
                            livello={livello + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
