import { useState } from 'react';
import { supabase } from './supporto/supabaseClient';



export type Progetti = {
    id: string
    cliente_id: string
    nome: string
    note?: string | null
    stato_id: string
    priorita_id: string
    consegna: string //date
    tempo_stimato: string //time
    created_at: string  //timestamp ISO
    modified_at: string //timestamp ISO
    deleted_at?: string | null

}



export default function Progetti() {
    const [progetti, setProgetti] = useState()
}