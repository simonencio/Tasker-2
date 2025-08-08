import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supporto/supabaseClient';

interface Project { id: string; nome: string; }

export default function ProgettiWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Errore fetch utente:', userError);
        setErrorMsg('Impossibile ottenere utente');
        setProjects([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('utenti_progetti')
        .select('progetti(id, nome)')
        .eq('utente_id', user.id)
        .limit(3);

      if (error) {
        console.error('Errore fetch progetti da mapping:', error);
        setErrorMsg(error.message);
        setProjects([]);
      } else if (data) {
        const fetched = data.map((row: any) => row.progetti);
        setProjects(fetched);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  const handleTitleClick = () => {
    navigate('/progetti');
  };

  return (
    <div className="card-theme p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 max-w-xs">
      <h3
        className="text-lg font-semibold mb-2 text-theme dark:text-theme cursor-pointer hover:underline"
        onClick={handleTitleClick}
      >
        Progetti
      </h3>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Caricamento...</p>
      ) : errorMsg ? (
        <p className="text-sm text-red-500">{errorMsg}</p>
      ) : projects.length > 0 ? (
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.id} className="text-sm truncate text-theme dark:text-theme">
              {p.nome}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nessun progetto</p>
      )}
    </div>
  );
}
