import { supabase } from "../supporto/supabaseClient";
import { inviaEmailNotifica } from "./emailUtils";
import { generaContenutoEmail } from "./emailTemplates";

export type Notifica = {
    id: string;
    letto: boolean;
    messaggio: string;
    data_creazione: string;
    notifica_id: string;
};

// ✅ Recupera notifiche visibili per l'utente corrente
export async function getNotificheUtente(userId: string): Promise<Notifica[]> {
    const { data, error } = await supabase
        .from("notifiche_utenti")
        .select(`
      id,
      letto,
      notifica_id,
      notifica: notifica_id (
        messaggio,
        data_creazione
      )
    `)
        .eq("utente_id", userId)
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(30);

    if (error || !data) {
        console.error("Errore nel recupero notifiche:", error);
        return [];
    }

    return data.map((row: any) => ({
        id: String(row.id),
        letto: row.letto,
        notifica_id: row.notifica_id,
        messaggio: row.notifica?.messaggio ?? "(nessun messaggio)",
        data_creazione: row.notifica?.data_creazione ?? "",
    }));
}

// ✅ Crea una nuova notifica per destinatari con controllo invio mail
export async function inviaNotifica(
    tipo_codice: string,
    destinatari: string[],
    messaggio: string,
    creatore_id?: string,
    contesto?: { progetto_id?: string; task_id?: string }
): Promise<void> {
    const { data: tipo, error: tipoError } = await supabase
        .from("notifiche_tipi")
        .select("id")
        .eq("codice", tipo_codice)
        .single();

    if (tipoError || !tipo) {
        console.error("Tipo notifica non trovato:", tipo_codice);
        return;
    }

    const tipo_id = tipo.id;

    const { data: nuovaNotifica, error: notificaError } = await supabase
        .from("notifiche")
        .insert({
            tipo_id,
            messaggio,
            creatore_id: creatore_id || null,
            progetto_id: contesto?.progetto_id || null,
            task_id: contesto?.task_id || null,
        })
        .select()
        .single();

    if (notificaError || !nuovaNotifica) {
        console.error("Errore inserimento notifica:", notificaError);
        return;
    }

    const notifica_id = nuovaNotifica.id;

    for (const userId of destinatari) {
        const { data: pref } = await supabase
            .from("notifiche_preferenze")
            .select("invia_email")
            .eq("utente_id", userId)
            .eq("tipo_id", tipo_id)
            .maybeSingle();

        const inviaEmail = pref?.invia_email === true;

        await supabase.from("notifiche_utenti").insert({
            notifica_id,
            utente_id: userId,
            inviato: inviaEmail,
            inviato_al: inviaEmail ? new Date().toISOString() : null,
        });

        if (inviaEmail) {
            const { data: user } = await supabase
                .from("utenti")
                .select("email, nome, cognome")
                .eq("id", userId)
                .maybeSingle();

            const { data: tipoDett } = await supabase
                .from("notifiche_tipi")
                .select("descrizione")
                .eq("id", tipo_id)
                .maybeSingle();

            if (user?.email && tipoDett?.descrizione) {
                const { subject, body } = generaContenutoEmail({
                    nomeUtente: user.nome,
                    descrizioneTipo: tipoDett.descrizione,
                    messaggio,
                });

                await inviaEmailNotifica({
                    to: user.email,
                    subject,
                    body,
                });
            }
        }
    }
}
