
import { useState } from 'react';
import { supabase } from '../supporto/supabaseClient';


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

type Props = {
  onClose: () => void;
};



export default function AggiungiCliente({ onClose }: Props) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [note, setNote] = useState('')

  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrore('')
    setSuccesso(false)
    setLoading(true);

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

    setLoading(false);

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
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-xl shadow-lg p-4 w-[350px] z-50">
      <h3 className="text-lg font-semibold mb-2">Nuovo Cliente</h3>
      {errore && <p className="text-red-500 mb-2">{errore}</p>}
      {successo && <p className="text-green-600 mb-2">Cliente inserito con successo!</p>}
      <form onSubmit={handleSubmit} className="space-y-3 text-sm ">
        <div className="h-[300px]">

          <div>
            <label className="block mb-1 font-medium">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Telefono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Avatar</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border p-1 rounded"
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-black text-sm"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            {loading ? "Salvataggio..." : "Crea"}
          </button>
        </div>
      </form>
    </div>
  )
}