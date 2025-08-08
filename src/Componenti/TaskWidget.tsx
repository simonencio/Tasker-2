import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supporto/supabaseClient";

interface Task { id: string; nome: string; }

export default function TaskWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Errore fetch utente:', userError);
        setErrorMsg('Impossibile ottenere utente');
        setLoading(false);
        return;
      }

      // Recupera tutti i task assegnati all’utente
      const { data, error } = await supabase
        .from('utenti_task')
        .select('tasks(id, nome, parent_id)')
        .eq('utente_id', user.id);

      if (error) {
        console.error('Errore fetch tasks da mapping:', error);
        setErrorMsg(error.message || 'Errore caricamento task');
        setTasks([]);
      } else if (data) {
        const fetched: Task[] = data
          .map((row: any) => row.tasks)
          .filter((t: any) => t && t.parent_id === null)
          .slice(0, 3); // limitiamo lato client

        console.log('Task principali trovati:', fetched);
        setTasks(fetched);
      }
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const handleTitleClick = () => {
    navigate('/tasks');
  };

  return (
    <div className="card-theme p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 cursor-default max-w-xs">
      <h3
        className="text-lg font-semibold mb-2 text-theme dark:text-theme cursor-pointer hover:underline"
        onClick={handleTitleClick}
      >
        Task
      </h3>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Caricamento...</p>
      ) : errorMsg ? (
        <p className="text-sm text-red-500">{errorMsg}</p>
      ) : tasks.length > 0 ? (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li key={task.id} className="text-sm truncate text-theme dark:text-theme">
              {task.nome}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nessun task</p>
      )}
    </div>
  );
}

