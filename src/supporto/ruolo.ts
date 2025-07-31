// supporto/ruolo.ts
import { supabase } from "./supabaseClient";

let ruoloAdminCache: boolean | null = null;

export async function isUtenteAdmin(): Promise<boolean> {
    if (ruoloAdminCache !== null) return ruoloAdminCache;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from("utenti")
        .select("ruolo")
        .eq("id", user.id)
        .single();

    if (!error && data?.ruolo === 1) {
        ruoloAdminCache = true;
        return true;
    }

    ruoloAdminCache = false;
    return false;
}
