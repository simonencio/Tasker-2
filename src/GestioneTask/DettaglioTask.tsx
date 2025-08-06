import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCheck, faCalendarDay, faFlag, faClock, faStickyNote, faTasks } from "@fortawesome/free-solid-svg-icons";
import { isUtenteAdmin } from "../supporto/ruolo";
import IntestazioneTask from "./IntestazioneTask";

type UtenteTask = {
    utente?: { id: string; nome: string; cognome?: string | null } | null;
};

type TaskDettaglioData = {
    id: string;
    stato_id: number | null;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    stati?: { nome: string } | null;
    priorita?: { nome: string } | null;
    utenti_task: UtenteTask[];
};

export default function DettaglioTask() {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<TaskDettaglioData | null>(null);
    const [, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then((res) => {
            if (mounted) setIsAdmin(res);
        });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const fetchTask = async () => {
            if (!id) return;
            setLoading(true);
            const { data, error } = await supabase
                .from("tasks")
                .select(`
          id,
          stato_id,
          nome,
          note,
          consegna,
          tempo_stimato,
          stati ( nome ),
          priorita ( nome ),
          utenti_task (
            utenti ( id, nome, cognome )
          )
        `)
                .eq("id", id)
                .single();
            if (!error && data) {
                const utentiTaskMappati: UtenteTask[] = (data.utenti_task ?? []).map((ut: any) => ({
                    utente: ut.utenti ? ut.utenti[0] ?? null : null
                }));
                setTask({
                    ...data,
                    utenti_task: utentiTaskMappati,
                    stati: Array.isArray(data.stati) ? data.stati[0] ?? null : data.stati ?? null,
                    priorita: Array.isArray(data.priorita) ? data.priorita[0] ?? null : data.priorita ?? null,
                });
            }

            setLoading(false);
        };
        fetchTask();
    }, [id]);

    if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
    if (!task) return <div className="p-6 text-theme">Task non trovata</div>;

    return (
        <div className="min-h-screen bg-theme text-theme">
            <IntestazioneTask id={id!} />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faTasks} className="icon-color" />
                    {task.nome}
                </h1>

                <div className="space-y-2 text-[15px]">
                    {task.consegna && (
                        <p>
                            <FontAwesomeIcon icon={faCalendarDay} className="icon-color mr-1" />
                            <strong>Consegna:</strong> {new Date(task.consegna).toLocaleDateString()}
                        </p>
                    )}
                    {task.stati?.nome && (
                        <p>
                            <FontAwesomeIcon icon={faFlag} className="icon-color mr-1" />
                            <strong>Stato:</strong> {task.stati.nome}
                        </p>
                    )}
                    {task.priorita?.nome && (
                        <p>
                            <FontAwesomeIcon icon={faFlag} className="icon-color mr-1" />
                            <strong>Priorità:</strong> {task.priorita.nome}
                        </p>
                    )}
                    {task.tempo_stimato && (
                        <p>
                            <FontAwesomeIcon icon={faClock} className="icon-color mr-1" />
                            <strong>Tempo stimato:</strong> {task.tempo_stimato}
                        </p>
                    )}
                    {task.utenti_task.length > 0 && (
                        <p>
                            <FontAwesomeIcon icon={faUserCheck} className="icon-color mr-1" />
                            <strong>Assegnata a:</strong>{" "}
                            {task.utenti_task.map((ut) => `${ut.utente?.nome} ${ut.utente?.cognome || ""}`).join(", ")}
                        </p>
                    )}
                    {task.note && (
                        <p>
                            <FontAwesomeIcon icon={faStickyNote} className="icon-color mr-1" />
                            <strong>Note:</strong> {task.note}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}