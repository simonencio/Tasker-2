import { useState, useEffect } from 'react'
import { supabase } from './supporto/supabaseClient'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen } from '@fortawesome/free-solid-svg-icons'


export type Progetto = {
    id: string
    nome: string
    note?: string | null
    consegna?: string | null
    tempo_stimato?: string | null
    created_at: string
    modified_at: string
    cliente?: {
        nome: string
    } | null
    stato?: {
        nome: string
    } | null
    priorita?: {
        nome: string
    } | null
}

export default function ListaProgetti() {
    const [progetti, setProgetti] = useState<Progetto[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const caricaProgetti = async () => {
            const { data, error } = await supabase
                .from('progetti')
                .select(`
                    id, nome, note, consegna, tempo_stimato, created_at, modified_at,
                    clienti (nome),
                    stati (nome),
                    priorita (nome)
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
            if (error) {
                console.error('Errore nel caricamento:', error)
            } else if (data) {
                const progettiPuliti = data.map((item) => ({
                    ...item,
                    cliente: item.clienti?.[0] ?? null,
                    stato: item.stati?.[0] ?? null,
                    priorita: item.priorita?.[0] ?? null,
                }))
                setProgetti(progettiPuliti)
            }

            setLoading(false)
        }

        caricaProgetti()
    }, [])


    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Progetti</h1>

            {loading ? (
                <p>Caricamento...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {progetti.map((proj) => (
                        <div
                            key={proj.id}
                            className="relative bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-all"
                        >
                            <button
                                onClick={() => console.log('Modifica progetto:', proj.id)} // poi lo colleghi al modal/modifica
                                className="absolute top-2 right-2 text-gray-500 hover:text-blue-600"
                                aria-label="Modifica"
                            >
                                <FontAwesomeIcon icon={faPen} />
                            </button>
                            <h2 className="text-lg font-bold text-gray-800">{proj.nome}</h2>

                            {proj.cliente?.nome && (
                                <p className="text-sm text-gray-600">Cliente: {proj.cliente.nome}</p>
                            )}

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

