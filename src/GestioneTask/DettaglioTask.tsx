import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faPen, faThumbtack, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
import { Toast } from "toaster-js";
import type { Task, Utente, Stato, Priorita } from "../supporto/tipi";

function formatIntervalToHM(interval: string | null | undefined): string {
    if (!interval) return "—";
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (!match) return interval;
    const ore = parseInt(match[1], 10);
    const minuti = parseInt(match[2], 10);
    return `${ore > 0 ? `${ore}h ` : ""}${minuti}m`;
}

export default function DettaglioTask() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [modaleAperta, setModaleAperta] = useState(false);
    const [timerAttivo, setTimerAttivo] = useState(false);
    const [timeEntryId, setTimeEntryId] = useState<number | null>(null);

    const utenteId = localStorage.getItem("user_id");

    useEffect(() => {
        const caricaTask = async () => {
            if (!id) return;

            const { data, error } = await supabase
                .from("tasks")
                .select(`
                    id, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
                    stato:stato_id (id, nome, colore),
                    priorita:priorita_id (id, nome),
                    utenti_task ( utenti ( id, nome, cognome ) )
                `)
                .eq("id", id)
                .is("deleted_at", null)
                .single();

            if (error || !data) {
                console.error("Errore caricamento task:", error);
                return;
            }

            const assegnatari: Utente[] =
                data.utenti_task?.map((u: any) => u.utenti) ?? [];

            const stato: Stato | null = Array.isArray(data.stato)
                ? data.stato[0]
                : data.stato ?? null;

            const priorita: Priorita | null = Array.isArray(data.priorita)
                ? data.priorita[0]
                : data.priorita ?? null;

            setTask({
                id: data.id,
                nome: data.nome,
                note: data.note,
                consegna: data.consegna,
                tempo_stimato: data.tempo_stimato,
                created_at: data.created_at,
                modified_at: data.modified_at,
                fine_task: data.fine_task,
                parent_id: data.parent_id,
                stato,
                priorita,
                progetto: null,
                assegnatari,
            });
        };

        caricaTask();
    }, [id]);

    const avviaTimer = async () => {
        if (!id || !utenteId) return;

        const { data, error } = await supabase.from("time_entries").insert({
            utente_id: utenteId,
            task_id: id,
            progetto_id: task?.progetto?.id ?? null,
            data_inizio: new Date().toISOString(),
            data_fine: null,
            durata: 0,
        }).select("id").single();

        if (error || !data) {
            new Toast("Errore nell'avvio del timer", Toast.TYPE_ERROR);
            return;
        }

        setTimeEntryId(data.id);
        setTimerAttivo(true);
    };

    const fermaTimer = async () => {
        if (!timeEntryId) return;

        const { error } = await supabase
            .from("time_entries")
            .update({
                data_fine: new Date().toISOString(),
                durata: null, // valorizzato da trigger/DB o aggiornalo tu dopo
            })
            .eq("id", timeEntryId);


        if (error) {
            new Toast("Errore nel salvataggio del timer", Toast.TYPE_ERROR);
            return;
        }

        setTimeEntryId(null);
        setTimerAttivo(false);
    };

    if (!task) return <div className="p-6 text-theme">Task non trovata</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto text-theme">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <FontAwesomeIcon
                    icon={task.fine_task ? faCheckCircle : faThumbtack}
                    className={`w-5 h-5 ${task.fine_task ? "text-green-500" : "text-gray-500"}`}
                />
                {task.nome}

                <button
                    onClick={() => setModaleAperta(true)}
                    className="text-yellow-500 hover:text-yellow-600 transition"
                    aria-label="Modifica task"
                >
                    <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                </button>

                {timerAttivo ? (
                    <button
                        onClick={fermaTimer}
                        className="text-red-500 hover:text-red-600 transition"
                        aria-label="Ferma timer"
                    >
                        <FontAwesomeIcon icon={faStop} className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={avviaTimer}
                        className="text-green-500 hover:text-green-600 transition"
                        aria-label="Avvia timer"
                    >
                        <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
                    </button>
                )}
            </h1>

            <div className="space-y-2 text-[15px]">
                {task.consegna && (
                    <p><span className="font-semibold">Consegna:</span> {new Date(task.consegna).toLocaleDateString()}</p>
                )}
                {task.stato?.nome && (
                    <p><span className="font-semibold">Stato:</span> {task.stato.nome}</p>
                )}
                {task.priorita?.nome && (
                    <p><span className="font-semibold">Priorità:</span> {task.priorita.nome}</p>
                )}
                {task.tempo_stimato && (
                    <p><span className="font-semibold">Tempo stimato:</span> {formatIntervalToHM(task.tempo_stimato)}</p>
                )}
                {task.assegnatari.length > 0 && (
                    <div>
                        <p className="font-semibold">Assegnata a:</p>
                        <ul className="ml-5 list-disc">
                            {task.assegnatari.map(u => (
                                <li key={u.id}>{u.nome} {u.cognome || ''}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {task.note && (
                    <p><span className="font-semibold">Note:</span> {task.note}</p>
                )}
            </div>

            {modaleAperta && (
                <MiniTaskEditorModal
                    taskId={task.id}
                    onClose={() => setModaleAperta(false)}
                />
            )}
        </div>
    );
}
