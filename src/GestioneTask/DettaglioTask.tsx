// 📁 src/GestioneTask/TaskDettaglio.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCheck, faCalendarDay, faFlag, faClock, faStickyNote, faTasks, faPlus, faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import { isUtenteAdmin } from "../supporto/ruolo";


type UtenteTask = {
  utente?: { id: string; nome: string } | null;
};

type SubTask = {
  id: string;
  nome: string;
  completata: boolean;
  consegna?: string | null;
};

type TaskDettaglioData = {
  id: string;
  stato_id: number;
  nome: string;
  note?: string | null;
  consegna?: string | null;
  tempo_stimato?: string | null;
  stati?: { nome: string } | null;
  priorita?: { nome: string } | null;
  utenti_task: UtenteTask[];
  sub_tasks: SubTask[];
};

export default function DettaglioTask() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDettaglioData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
          id, stato_id, nome, note, consegna, tempo_stimato,
          stati ( nome ),
          priorita ( nome ),
          utenti_task ( utente:utenti ( id, nome ) ),
          sub_tasks ( id, nome, completata, consegna )
        `)
        .eq("id", id)
        .single();
      if (!error && data) {
        setTask({
          ...data,
          utenti_task: data.utenti_task ?? [],
          sub_tasks: data.sub_tasks ?? [],
        });
      }
      setLoading(false);
    };
    fetchTask();
  }, [id]);

  const toggleSubTask = async (subTaskId: string, completata: boolean) => {
    await supabase
      .from("sub_tasks")
      .update({ completata: !completata })
      .eq("id", subTaskId);
    // Aggiorna stato locale
    setTask((prev) =>
      prev
        ? {
            ...prev,
            sub_tasks: prev.sub_tasks.map((st) =>
              st.id === subTaskId ? { ...st, completata: !completata } : st
            ),
          }
        : prev
    );
  };

  if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
  if (!task) return <div className="p-6 text-theme">Task non trovata</div>;

  return (
    <div className="min-h-screen bg-theme text-theme p-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faTasks} className="icon-color" />
        {task.nome}
      </h1>

      <div className="space-y-2 text-[15px]">
        {task.consegna && (
          <p>
            <FontAwesomeIcon icon={faCalendarDay} className="icon-color mr-1" />
            <strong>Consegna:</strong>{" "}
            {new Date(task.consegna).toLocaleDateString()}
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
            {task.utenti_task.map((ut) => ut.utente?.nome).join(", ")}
          </p>
        )}
        {task.note && (
          <p>
            <FontAwesomeIcon icon={faStickyNote} className="icon-color mr-1" />
            <strong>Note:</strong> {task.note}
          </p>
        )}
      </div>

      {/* Sotto-task */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faCheckSquare} className="icon-color" />
          Sotto‑task
        </h2>
        {task.sub_tasks.length === 0 ? (
          <p className="italic text-gray-500 mt-2">Nessuna sotto‑task</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {task.sub_tasks.map((st) => (
              <li
                key={st.id}
                className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={st.completata}
                    onChange={() => toggleSubTask(st.id, st.completata)}
                  />
                  <span className={st.completata ? "line-through" : ""}>
                    {st.nome}
                  </span>
                  {st.consegna && (
                    <span className="text-xs text-gray-500 ml-2">
                      📅 {new Date(st.consegna).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
