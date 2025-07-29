import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supporto/supabaseClient'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import type { Task } from './DettaglioProgetto'



export default function CalendarioProgetto() {
    const { id } = useParams<{ id: string }>()
    const [taskList, setTaskList] = useState<Task[]>([])
    const [settimanaBase, setSettimanaBase] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))


    useEffect(() => {
        const fetchTask = async () => {
            const { data, error } = await supabase
                .from('progetti_task')
                .select(`
                    task:tasks (
                    id, nome, consegna
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


    const giorniSettimana = Array.from({ length: 7 }, (_, i) => addDays(settimanaBase, i))

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Calendario</h1>

            <div className="grid grid-cols-7 gap-2">
                {giorniSettimana.map((giorno) => (
                    <div key={giorno.toISOString()} className="border rounded p-2 h-40 overflow-auto">
                        <div className="text-sm font-semibold text-gray-700 text-center mb-2">
                            {format(giorno, 'EEEE dd/MM')}
                        </div>
                        {taskList
                            .filter(task =>
                                task.consegna && isSameDay(new Date(task.consegna), giorno)
                            )
                            .map(task => (
                                <div key={task.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                                    {task.nome}
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    )

}