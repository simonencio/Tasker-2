import { useState, useEffect } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen } from '@fortawesome/free-solid-svg-icons'
import { supabase } from './supporto/supabaseClient'


export type Task = {
    id: string
    nome: string
    note?: string | null
    consegna?: string | null             // formato "YYYY-MM-DD"
    tempo_stimato?: string | null        // formato "HH:mm:ss"
    created_at: string                   // ISO timestamp
    modified_at: string                  // ISO timestamp
    stato?: {
        nome: string
    } | null
    priorita?: {
        nome: string
    } | null
}


export default function ListaTask() {

    const [task, setTask] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        const caricaTask = async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
        id, nome, note, consegna, tempo_stimato, created_at, modified_at,
        stato:stato_id (nome),
        priorita:priorita_id (nome)
      `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Errore nel caricamento task:', error)
            } else if (data) {
                const taskPulite = data.map((item) => ({
                    ...item,
                    stato: item.stato?.[0] ?? item.stato ?? null,
                    priorita: item.priorita?.[0] ?? item.priorita ?? null,
                }))
                setTask(taskPulite)
            }

            setLoading(false)
        }

        caricaTask()
    }, [])



    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Task</h1>

            {loading ? (
                <p>Caricamento...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {task.map((proj) => (
                        <div
                            key={proj.id}
                            className="relative bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-all"
                        >
                            <button
                                onClick={() => console.log('Modifica Task:', proj.id)} // poi lo colleghi al modal/modifica
                                className="absolute top-2 right-2 text-gray-500 hover:text-blue-600"
                                aria-label="Modifica"
                            >
                                <FontAwesomeIcon icon={faPen} />
                            </button>
                            <h2 className="text-lg font-bold text-gray-800">{proj.nome}</h2>

                            {proj.consegna && (
                                <p className="text-sm text-gray-600">Consegna: {proj.consegna}</p>
                            )}

                            <div className="flex gap-2 mt-2 text-sm">
                                {proj.stato && (
                                    <span
                                        className="px-2 py-1 rounded-full text-white bg-gray-500"
                                    >
                                        {proj.stato.nome}
                                    </span>
                                )}
                                {proj.priorita && (
                                    <span
                                        className="px-2 py-1 rounded-full text-white bg-gray-400"
                                    >
                                        {proj.priorita.nome}
                                    </span>
                                )}
                            </div>

                            {proj.note && (
                                <p className="text-xs text-gray-500 mt-3 italic">{proj.note}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}







