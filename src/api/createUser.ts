import { supabaseUrl } from "../supporto/supabaseClient"

export async function createUserWithReset(data: {
    email: string
    first_name: string
    last_name: string
    avatar_url?: string
    role_id: number
}) {
    const res = await fetch(`${supabaseUrl}/functions/v1/create_user_and_reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            redirectTo: window.location.origin + '/reset-password'
        })
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Errore API')
    return json
}
