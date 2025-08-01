// import { useEffect, useState } from 'react';
// import { NavLink, useNavigate, useParams } from 'react-router-dom';
// import { supabase } from '../supporto/supabaseClient';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// export type Stato = {
//     id: number;
//     nome: string;
// };

// type Raggruppamento = 'stato' | 'assegnatario' | 'priorita';

// type Task = {
//     stato_id: number;
//     id: string;
//     nome: string;
//     note?: string | null;
//     consegna?: string | null;
//     tempo_stimato?: string | null;
//     stati?: { nome: string } | null;
//     priorita?: { nome: string } | null;
//     utenti_task?: { utente?: { id: string; nome: string } }[];
// };

// export default function BachecaProgetto() {
//     const { id } = useParams<{ id: string }>();
//     const navigate = useNavigate();

//     const [taskList, setTaskList] = useState<Task[]>([]);
//     const [stati, setStati] = useState<Stato[]>([]);
//     const [soloMieTask, setSoloMieTask] = useState(false);
//     const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
//     const [groupBy, setGroupBy] = useState<Raggruppamento>('stato');
//     const [filtroData, setFiltroData] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchUtente = async () => {
//             const { data: session } = await supabase.auth.getSession();
//             setUtenteLoggatoId(session?.session?.user.id || null);
//         };
//         fetchUtente();
//     }, []);

//     useEffect(() => {
//         const fetchStati = async () => {
//             const { data, error } = await supabase.from('stati').select('id, nome').is('deleted_at', null);
//             if (!error && data) setStati(data);
//         };

//         const fetchTasks = async () => {
//             const { data, error } = await supabase
//                 .from('progetti_task')
//                 .select(`tasks!inner(id, stato_id, nome, note, consegna, tempo_stimato, stati(id, nome), priorita(id, nome), utenti_task(utente(id, nome)))`)
//                 .eq('progetti_id', id);

//             if (!error && data) {
//                 const tasksPulite: Task[] = (data as any[]).map(row => ({
//                     ...row.tasks,
//                     stati: row.tasks.stati ?? null,
//                     priorita: row.tasks.priorita ?? null,
//                     utenti_task: row.tasks.utenti_task ?? [],
//                 }));
//                 setTaskList(tasksPulite);
//             }
//         };

//         if (id) {
//             fetchStati();
//             fetchTasks();
//         }
//     }, [id]);

//     type Colonna = {
//         chiave: string;
//         label: string;
//     };

//     let colonne: Colonna[] = [];

//     if (groupBy === 'stato') {
//         colonne = stati.map(s => ({ chiave: String(s.id), label: s.nome }));
//     } else if (groupBy === 'assegnatario') {
//         const assegnatariUnici = Array.from(new Set(
//             taskList.flatMap(t => t.utenti_task?.map(ut => ut.utente?.nome || 'Non assegnata') ?? [])
//         )).filter((nome): nome is string => !!nome);
//         colonne = assegnatariUnici.map(nome => ({ chiave: nome, label: nome }));
//     } else if (groupBy === 'priorita') {
//         const prioritaUniche = Array.from(new Set(taskList.map(t => t.priorita?.nome || 'Nessuna')));
//         colonne = prioritaUniche.map(p => ({ chiave: p, label: p }));
//     }

//     return (
//         <div className="min-h-screen bg-theme text-theme">
//             <div className="border-b bg-theme px-6 py-4 flex items-center justify-between shadow-sm">
//                 <button
//                     onClick={() => navigate('/progetti')}
//                     className="text-sm flex items-center gap-2 text-theme hover:text-blue-500"
//                 >
//                     <FontAwesomeIcon icon={faArrowLeft} className="icon-color" /> <span>Torna indietro</span>
//                 </button>

//                 <div className="flex gap-6 text-sm items-center">
//                     <NavLink to={`/progetti/${id}`} end className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>
//                         Dashboard
//                     </NavLink>
//                     <button
//                         onClick={() => setSoloMieTask(prev => !prev)}
//                         className={`hover:text-blue-600 ${soloMieTask ? 'text-blue-700 font-semibold' : 'text-theme'}`}
//                     >
//                         {soloMieTask ? 'Tutte le Task' : 'Le mie Task'}
//                     </button>
//                     <NavLink to={`/progetti/${id}/calendario`} className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>
//                         Calendario
//                     </NavLink>
//                     <NavLink to={`/progetti/${id}/bacheca`} className={({ isActive }) => `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-theme'}`}>
//                         Bacheca
//                     </NavLink>
//                 </div>
//             </div>

//             <div className="p-6">
//                 <div className="flex justify-end mb-4 gap-4 items-end">
//                     <div>
//                         <label className="text-sm font-medium mr-2">Visualizza per:</label>
//                         <select
//                             value={groupBy}
//                             onChange={(e) => setGroupBy(e.target.value as Raggruppamento)}
//                             className="input-style"
//                         >
//                             <option value="stato">Stato</option>
//                             <option value="assegnatario">Assegnatario</option>
//                             <option value="priorita">Priorità</option>
//                         </select>
//                     </div>

//                     <div>
//                         <label className="text-sm font-medium mr-2">Data di scadenza:</label>
//                         <input
//                             type="date"
//                             value={filtroData ?? ''}
//                             onChange={(e) => setFiltroData(e.target.value || null)}
//                             className="input-style"
//                         />
//                     </div>
//                 </div>

//                 <h1 className="text-2xl font-bold mb-6">📋 Bacheca</h1>

//                 <div className="flex gap-4 overflow-x-auto hide-scrollbar">
//                     {colonne.map(col => (
//                         <div key={col.chiave} className="w-64 card-theme flex-shrink-0">
//                             <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 font-semibold text-sm text-gray-700 dark:text-gray-200">
//                                 {col.label}
//                             </div>
//                             <div className="p-2 space-y-2">
//                                 {taskList.filter(task => {
//                                     const assegnataAme = task.utenti_task?.some((ut): boolean => ut.utente?.id === utenteLoggatoId) ?? false;
//                                     const passaMieTask = !soloMieTask || assegnataAme;
//                                     if (!passaMieTask) return false;

//                                     if (filtroData && task.consegna !== filtroData) return false;

//                                     if (groupBy === 'stato') return String(task.stato_id) === col.chiave;
//                                     if (groupBy === 'assegnatario') {
//                                         const nomi = task.utenti_task?.map(ut => ut.utente?.nome) ?? ['Non assegnata'];
//                                         return nomi.includes(col.chiave);
//                                     }
//                                     if (groupBy === 'priorita') return (task.priorita?.nome || 'Nessuna') === col.chiave;

//                                     return false;
//                                 }).map(task => (
//                                     <div key={task.id} className="bg-theme border border-gray-200 dark:border-gray-600 p-3 rounded shadow text-sm space-y-1">
//                                         <div className="font-semibold text-theme">{task.nome}</div>
//                                         {Array.isArray(task.utenti_task) && task.utenti_task.length > 0 && (
//                                             <div className="text-xs text-gray-600 dark:text-gray-400">
//                                                 👤 <span className="font-medium">Assegnata a:</span>{' '}
//                                                 {task.utenti_task.map(ut => ut.utente?.nome).filter(Boolean).join(', ')}
//                                             </div>
//                                         )}
//                                         {task.consegna && (
//                                             <div className="text-xs text-gray-600 dark:text-gray-400">
//                                                 📅 <span className="font-medium">Scadenza:</span>{' '}
//                                                 {new Date(task.consegna).toLocaleDateString()}
//                                             </div>
//                                         )}
//                                         {task.stati?.nome && (
//                                             <div className="text-xs text-gray-500 italic dark:text-gray-300">
//                                                 📌 Stato: {task.stati.nome}
//                                             </div>
//                                         )}
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// }
