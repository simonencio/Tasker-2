import { useParams, useNavigate, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supporto/supabaseClient'
import {
    format, startOfWeek, addDays, isSameDay,
    startOfMonth, endOfMonth, eachDayOfInterval, addMonths
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { Task } from './DettaglioProgetto'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

type VistaCalendario = 'settimana' | 'lista' | 'mese'

export default function CalendarioProgetto() {
    const { id } = useParams<{ id: string }>()
    const [taskList, setTaskList] = useState<Task[]>([])
    const [settimanaBase, setSettimanaBase] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
    const navigate = useNavigate()
    //Gestione cambio tabella Task
    const [soloMieTask, setSoloMieTask] = useState(false)
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null)
    //Gestione Vista Calendario
    const [vista, setVista] = useState<VistaCalendario>('settimana')
    const [meseCorrente, setMeseCorrente] = useState<Date>(new Date())

    // Vista Mese Calendario
    const giorniMese = vista === 'mese'
        ? eachDayOfInterval({
            start: startOfWeek(startOfMonth(meseCorrente), { weekStartsOn: 1 }),
            end: addDays(endOfMonth(meseCorrente), 6)
        })
        : []

    useEffect(() => {
        const fetchTask = async () => {
            const { data, error } = await supabase
                .from('progetti_task')
                .select(`
                    task:tasks (
                        id, stato_id, nome, consegna,
                        utenti_task:utenti_task (
                            utente:utenti (id, nome)
                        )
                    )
                `)
                .eq('progetti_id', id)

            if (!error && data) {
                const tasksPulite = (data as unknown as { task: Task }[])
                    .filter(row => row.task)
                    .map(row => row.task)

                setTaskList(tasksPulite)
            }
        }

        if (id) fetchTask()
    }, [id])

    //Utente Loggato
    useEffect(() => {
        const fetchUtente = async () => {
            const { data: session } = await supabase.auth.getSession()
            setUtenteLoggatoId(session?.session?.user.id || null)
        }

        fetchUtente()
    }, [])


    const giorniSettimana = Array.from({ length: 7 }, (_, i) => addDays(settimanaBase, i))

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
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Calendario settimanale</h1>

                {/*toggle per vista Calendario*/}
                <div className="flex justify-end mb-4">
                    <select
                        value={vista}
                        onChange={(e) => setVista(e.target.value as VistaCalendario)}
                        className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300"
                    >
                        <option value="settimana">Vista Settimana</option>
                        <option value="lista">Vista Lista</option>
                        <option value="mese">Vista Mese</option>
                    </select>
                </div>



                {/* Barra di navigazione settimana */}
                {(vista === 'settimana' || vista === 'lista') && (
                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            onClick={() => setSettimanaBase(prev => addDays(prev, -7))}
                            className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
                        >
                            ← Settimana precedente
                        </button>

                        <button
                            onClick={() => setSettimanaBase(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded hover:bg-blue-200 font-semibold"
                        >
                            Oggi
                        </button>

                        <button
                            onClick={() => setSettimanaBase(prev => addDays(prev, 7))}
                            className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
                        >
                            Settimana successiva →
                        </button>
                    </div>
                )}

                {/*Barra navigazione Mese*/}
                {vista === 'mese' && (
                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            onClick={() => setMeseCorrente(prev => addMonths(prev, -1))}
                            className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
                        >
                            ← Mese precedente
                        </button>

                        <div className="px-3 py-1 text-sm font-semibold text-gray-700">
                            {format(meseCorrente, "MMMM yyyy", { locale: it }).replace(/^./, c => c.toUpperCase())}
                        </div>

                        <button
                            onClick={() => setMeseCorrente(new Date())}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded hover:bg-blue-200 font-semibold"
                        >
                            Oggi
                        </button>

                        <button
                            onClick={() => setMeseCorrente(prev => addMonths(prev, 1))}
                            className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
                        >
                            Mese successivo →
                        </button>
                    </div>
                )}


                {/* Calendario a colonne */}
                {vista === 'settimana' ? (
                    <div className="grid grid-cols-7 gap-2">
                        {giorniSettimana.map((giorno) => (
                            <div key={giorno.toISOString()} className="border rounded p-2 h-40 overflow-auto">
                                <div className="text-sm font-semibold text-gray-700 text-center mb-2">
                                    {format(giorno, 'EEEE dd/MM', { locale: it }).replace(/^./, c => c.toUpperCase())}
                                </div>
                                {taskList
                                    .filter(task => {
                                        const assegnataAme = task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId)
                                        const stessoGiorno = task.consegna && isSameDay(new Date(task.consegna), giorno)
                                        return stessoGiorno && (!soloMieTask || assegnataAme)
                                    })
                                    .map(task => (
                                        <div key={task.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                                            {task.nome}
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                ) : vista === 'lista' ? (
                    <div className="space-y-4">
                        {giorniSettimana.map((giorno) => (
                            <div key={giorno.toISOString()} className="border rounded p-4">
                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                    {format(giorno, 'EEEE dd/MM', { locale: it }).replace(/^./, c => c.toUpperCase())}
                                </div>
                                {taskList
                                    .filter(task => {
                                        const assegnataAme = task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId)
                                        const stessoGiorno = task.consegna && isSameDay(new Date(task.consegna), giorno)
                                        return stessoGiorno && (!soloMieTask || assegnataAme)
                                    })
                                    .map(task => (
                                        <div key={task.id} className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                                            {task.nome}
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {giorniMese.map((giorno) => (
                            <div key={giorno.toISOString()} className="border rounded p-2 h-36 overflow-auto bg-white">
                                <div className="text-xs font-semibold text-gray-700 mb-1 text-right">
                                    {format(giorno, 'd', { locale: it })}
                                </div>
                                {taskList
                                    .filter(task => {
                                        const assegnataAme = task.utenti_task?.some(ut => ut.utente?.id === utenteLoggatoId)
                                        const stessoGiorno = task.consegna && isSameDay(new Date(task.consegna), giorno)
                                        return stessoGiorno && (!soloMieTask || assegnataAme)
                                    })
                                    .map(task => (
                                        <div key={task.id} className="text-[10px] bg-blue-100 text-blue-800 px-1 py-[2px] rounded mb-1 truncate">
                                            {task.nome}
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                )}


            </div>
        </div>
    )
}
