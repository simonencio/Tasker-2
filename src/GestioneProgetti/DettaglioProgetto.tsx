import { useLocation, useNavigate, useParams, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supporto/supabaseClient'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPen } from '@fortawesome/free-solid-svg-icons'

type ProgettoDettaglio = {
    nome: string
    note?: string | null
    consegna?: string | null
    tempo_stimato?: string | null
    clienti?: { nome: string } | null
    stati?: { nome: string } | null
    priorita?: { nome: string } | null
}

export type Task = {
    stato_id: number
    id: string
    nome: string
    note?: string | null
    consegna?: string | null
    tempo_stimato?: string | null
    stati?: { nome: string } | null
    priorita?: { nome: string } | null
    utenti_task?: { utente?: { id: string; nome: string } }[] // lista di assegnazioni
}



export default function DettaglioProgetto() {
    const { id } = useParams<{ id: string }>()
    const location = useLocation()
    const navigate = useNavigate()

    const [progetto, setProgetto] = useState<ProgettoDettaglio | null>(null)
    const [taskList, setTaskList] = useState<Task[]>([])

    const [loading, setLoading] = useState(true)

    //Gestione cambio tabella Task
    const [soloMieTask, setSoloMieTask] = useState(false)
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null)

    useEffect(() => {
        const fetchProgetto = async () => {
            if (!id) return
            const { data, error } = await supabase
                .from('progetti')
                .select(`
                    nome, note, consegna, tempo_stimato,
                    clienti(nome),
                    stati(nome),
                    priorita(nome)
                `)
                .eq('id', id)
                .single<ProgettoDettaglio>()

            if (!error && data) setProgetto(data)
            setLoading(false)
        }

        fetchProgetto()
    }, [id])


    useEffect(() => {
        const fetchTasks = async () => {
            const { data, error } = await supabase
                .from('progetti_task')
                .select(`
                    task:tasks (
                    id, nome, note, consegna, tempo_stimato,
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


        if (id) fetchTasks()


    }, [id])

    //Utente Loggato
    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession()
            setUtenteLoggatoId(session?.session?.user.id || null)
        }

        fetchUtente()
    }, [])




    if (loading) return <div className="p-6">Caricamento...</div>
    if (!progetto) return <div className="p-6">Progetto non trovato</div>



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

                    <div className="flex items-center gap-2">
                        <span className="text-theme font-medium text-sm">👤 Mie</span>
                        <div
                            onClick={() => setSoloMieTask((v) => !v)}
                            className={`toggle-theme ${soloMieTask ? "active" : ""}`}
                        >
                            <div
                                className={`toggle-thumb ${soloMieTask ? "translate" : ""} ${document.documentElement.classList.contains("dark") ? "dark" : ""
                                    }`}
                            ></div>
                        </div>
                    </div>


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
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">{progetto.nome}</h1>

                <div className="space-y-1 mb-4 text-gray-700 text-sm">
                    {progetto.clienti?.nome && (
                        <p>
                            <span className="font-semibold">Cliente:</span> {progetto.clienti.nome}
                        </p>
                    )}
                    {progetto.consegna && (
                        <p>
                            <span className="font-semibold">Consegna:</span>{' '}
                            {new Date(progetto.consegna).toLocaleDateString()}
                        </p>
                    )}
                    {progetto.stati?.nome && (
                        <p>
                            <span className="font-semibold">Stato:</span> {progetto.stati.nome}
                        </p>
                    )}
                    {progetto.priorita?.nome && (
                        <p>
                            <span className="font-semibold">Priorità:</span> {progetto.priorita.nome}
                        </p>
                    )}
                    {progetto.tempo_stimato && (
                        <p>
                            <span className="font-semibold">Tempo stimato:</span>{' '}
                            {progetto.tempo_stimato}
                        </p>
                    )}
                </div>

                {progetto.note && <p className="text-gray-600 italic">{progetto.note}</p>}


                <div className="mt-10 max-w-3xl mx-auto">
                    <h2 className="text-xl font-semibold mb-4 text-center">
                        {taskList.length > 0 ? 'Task del progetto' : 'Nessuna Task Assegnata'}
                    </h2>


                    <div className="border rounded-md overflow-hidden shadow-sm">
                        {/* intestazione tabella */}
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 text-xs text-gray-500 uppercase font-semibold">
                            <div className="flex-1">Nome</div>
                            <div className="w-32">Consegna</div>
                            <div className="w-24">Stato</div>
                            <div className="w-6"></div>
                        </div>

                        {/* righe task */}
                        {taskList
                            .filter(task => {
                                if (!soloMieTask) return true
                                return task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId)
                            })
                            .map((task) => (
                                <TaskRow key={task.id} task={task} soloMieTask={soloMieTask} />
                            ))
                        }
                    </div>
                </div>

            </div>
        </div>
    )
}

// Tabella Task

function TaskRow({ task, soloMieTask }: { task: Task; soloMieTask: boolean }) {
    const [aperta, setAperta] = useState(false)

    return (
        <div className="border-b last:border-0">
            <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                <div className="flex-1 text-sm font-medium">{task.nome}</div>
                <div className="w-32 text-sm text-gray-600">
                    {task.consegna ? new Date(task.consegna).toLocaleDateString() : '—'}
                </div>
                <div className="w-24 text-sm text-gray-600">
                    {task.stati?.nome || '—'}
                </div>
                <button
                    onClick={() => setAperta(prev => !prev)}
                    className="text-blue-600 text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100"
                >
                    {aperta ? '−' : '+'}
                </button>
                {soloMieTask && (
                    <button
                        className="text-gray-600 hover:text-blue-600 text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100"
                        title="Modifica task"
                        onClick={() => console.log("Vai alla modifica della task", task.id)}
                    >
                        <FontAwesomeIcon icon={faPen} />
                    </button>
                )}
            </div>

            {aperta && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-700 space-y-1 border-t border-gray-200">
                    {task.utenti_task && task.utenti_task.length > 0 && (
                        <p>
                            <span className="font-semibold">Assegnato a:</span>{' '}
                            {task.utenti_task.map((ut, i) => ut.utente?.nome).filter(Boolean).join(', ')}
                        </p>
                    )}
                    {task.tempo_stimato && (
                        <p><span className="font-semibold">Tempo stimato:</span> {task.tempo_stimato}</p>
                    )}
                    {task.note && (
                        <p><span className="font-semibold">Note:</span> {task.note}</p>
                    )}
                </div>
            )}

        </div>
    )
}
