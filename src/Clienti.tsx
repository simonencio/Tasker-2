import { useState } from 'react';
import { supabase } from './supporto/supabaseClient';




// type da poter spostare in un eventuale file entities
export type Cliente = {
  id: string
  nome: string
  email?: string | null
  telefono?: string | null
  avatar_url?: string | null
  note?: string | null
  created_at: string  //timestamp ISO
  modified_at: string //timestamp ISO
  deleted_at?: string | null
}



export default function AggiungiCliente() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [note, setNote] = useState('')

  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)
  



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrore('')
    setSuccesso(false)

    if (!nome.trim()) {
      setErrore('il campo è obbligatorio')
      return
    }

    const { error } = await supabase.from('clienti').insert([
      {
        nome,
        email,
        telefono,
        avatar_url: avatarUrl,
        note,
      },
    ])

    if (error) {
      setErrore(`Errore nell'inserimento: ${error.message}`)
    } else {
      // reset campi e mostra conferma
      setNome('')
      setEmail('')
      setTelefono('')
      setAvatarUrl('')
      setNote('')
      setSuccesso(true)
    }
  }



  return (
    <div className="max-w-xl mx-auto p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Nuovo Cliente</h2>
      {errore && <p className="text-red-500 mb-2">{errore}</p>}
      {successo && <p className="text-green-600 mb-2">Cliente inserito con successo!</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Nome *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Avatar URL"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <textarea
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Salva Cliente
        </button>
      </form>
    </div>
  )
}