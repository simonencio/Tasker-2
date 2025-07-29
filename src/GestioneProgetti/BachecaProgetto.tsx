import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supporto/supabaseClient'
import type { Task } from './DettaglioProgetto'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

type Stato = {
    id: number
    nome: string
}

type Raggruppamento = 'stato' | 'assegnatario' | 'priorita'

export default function BachecaProgetto() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [taskList, setTaskList] = useState<Task[]>([])
    const [stati, setStati] = useState<Stato[]>([])

    const [soloMieTask, setSoloMieTask] = useState(false)
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null)

    //Filtri
    const [groupBy, setGroupBy] = useState<Raggruppamento>('stato')
    const [filtroAssegnatario, setFiltroAssegnatario] = useState<string | null>(null)
    const [filtroPriorita, setFiltroPriorita] = useState<string | null>(null)
    const [filtroData, setFiltroData] = useState<string | null>(null)

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession()
            setUtenteLoggatoId(session?.session?.user.id ?? null)
        }

        fetchUtente()
    }, [])

    useEffect(() => {
        const fetchStati = async () => {
            const { data, error } = await supabase.from('stati').select('id, nome')
            if (!error && data) setStati(data)
        }

        const fetchTasks = async () => {
            const { data, error } = await supabase
                .from('progetti_task')
                .select(`
                    task:tasks (
                    id, nome, stato_id, note, consegna, tempo_stimato,
                    stati (nome),
                    priorita (nome),
                    utenti_task:utenti_task (
                        utente:utenti (id, nome)
                    )
                    )
                `)
                .eq('progetti_id', id)

            if (error) {
                console.error('Errore nel caricamento task:', error)
            } else {
                console.log('DATA TASK:', data)

                const tasksPulite = (data as unknown as { task: Task }[])
                    .filter(row => row.task) // filtriamo eventuali null
                    .map(row => row.task)

                setTaskList(tasksPulite)
            }
        }




        if (id) {
            fetchStati()
            fetchTasks()
        }
    }, [id])


    //Colonne 
    type Colonna = {
        chiave: string
        label: string
    }

    let colonne: Colonna[] = []

    if (groupBy === 'stato') {
        colonne = stati.map(s => ({ chiave: String(s.id), label: s.nome }))
    } else if (groupBy === 'assegnatario') {
        const assegnatariUnici = Array.from(new Set(
            taskList.flatMap(t => t.utenti_task?.map(ut => ut.utente?.nome || 'Non assegnata'))
        )).filter(Boolean)
        colonne = assegnatariUnici.map(nome => ({ chiave: nome ?? 'Non assegnata', label: nome ?? 'Non assegnata' }))
    } else if (groupBy === 'priorita') {
        const prioritaUniche = Array.from(new Set(taskList.map(t => t.priorita?.nome || 'Nessuna')))
        colonne = prioritaUniche.map(p => ({ chiave: p, label: p }))
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* SOTTO-HEADER */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => navigate('/progetti')}
                    className="text-gray-600 hover:text-blue-600 flex items-center gap-2 text-sm"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>

                <div className="flex gap-6 text-sm">
                    <NavLink
                        to={`/progetti/${id}`}
                        end
                        className={({ isActive }) =>
                            `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-gray-700'}`
                        }
                    >
                        Dashboard
                    </NavLink>

                    <button
                        onClick={() => setSoloMieTask(prev => !prev)}
                        className={`hover:text-blue-600 ${soloMieTask ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}
                    >
                        {soloMieTask ? 'Tutte le Task' : 'Le mie Task'}
                    </button>

                    <NavLink
                        to={`/progetti/${id}/calendario`}
                        className={({ isActive }) =>
                            `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-gray-700'}`
                        }
                    >
                        Calendario
                    </NavLink>

                    <NavLink
                        to={`/progetti/${id}/bacheca`}
                        className={({ isActive }) =>
                            `hover:text-blue-600 ${isActive ? 'text-blue-700 font-semibold' : 'text-gray-700'}`
                        }
                    >
                        Bacheca
                    </NavLink>
                </div>
            </div>

            {/* CONTENUTO */}
            <div className="p-6 bg-gray-100 min-h-screen">
                <div className="flex justify-end mb-4">
                    <label className="text-sm text-gray-700 mr-2">Visualizza per:</label>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as Raggruppamento)}
                        className="text-sm border px-2 py-1 rounded"
                    >
                        <option value="stato">Stato</option>
                        <option value="assegnatario">Assegnatario</option>
                        <option value="priorita">Priorità</option>
                    </select>
                

                {/* Filtro per Data */}
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Data di scadenza</label>
                    <input
                        type="date"
                        value={filtroData ?? ''}
                        onChange={(e) => setFiltroData(e.target.value || null)}
                        className="text-sm border px-2 py-1 rounded"
                    />
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-6">Bacheca</h1>

            <div className="flex gap-4 overflow-x-auto">
                {colonne.map(col => (
                    <div key={col.chiave} className="w-64 bg-white rounded shadow flex-shrink-0">
                        <div className="bg-gray-200 px-3 py-2 font-semibold text-sm text-gray-700">
                            {col.label}
                        </div>
                        <div className="p-2 space-y-2">
                            {taskList
                                .filter((task) => {
                                    const assegnataAme = task.utenti_task?.some(
                                        (ut: any) => ut.utente?.id === utenteLoggatoId
                                    )

                                    const passaMieTask = !soloMieTask || assegnataAme

                                    if (!passaMieTask) return false

                                    if (groupBy === 'stato') return String(task.stato_id) === col.chiave
                                    if (groupBy === 'assegnatario') {
                                        const nomi = task.utenti_task?.map(ut => ut.utente?.nome) ?? ['Non assegnata']
                                        return nomi.includes(col.chiave)
                                    }
                                    if (groupBy === 'priorita') return (task.priorita?.nome || 'Nessuna') === col.chiave

                                    return false
                                })
                                .map(task => (
                                    <div
                                        key={task.id}
                                        className="bg-white border border-gray-200 p-3 rounded shadow text-sm space-y-1"
                                    >
                                        <div className="font-semibold text-gray-800">{task.nome}</div>

                                        {Array.isArray(task.utenti_task) && task.utenti_task.length > 0 && (
                                            <div className="text-xs text-gray-600">
                                                👤 <span className="font-medium">Assegnata a:</span>{' '}
                                                {task.utenti_task?.map(ut => ut.utente?.nome).filter(Boolean).join(', ')}
                                            </div>
                                        )}

                                        {task.consegna && (
                                            <div className="text-xs text-gray-600">
                                                📅 <span className="font-medium">Scadenza:</span>{' '}
                                                {new Date(task.consegna).toLocaleDateString()}
                                            </div>
                                        )}

                                        {task.stati?.nome && (
                                            <div className="text-xs text-gray-500 italic">📌 Stato: {task.stati.nome}</div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
    )
}







