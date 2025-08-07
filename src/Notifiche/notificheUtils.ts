import { supabase } from "../supporto/supabaseClient";
import { inviaEmailNotifica } from "./emailUtils";
import { generaContenutoEmail } from "./emailTemplates";

export type Notifica = {
    id: string;
    letto: boolean;
    visualizzato: boolean;
    messaggio: string;
    data_creazione: string;
    notifica_id: string;
    task_nome?: string;
    progetto_nome?: string;
    creatore_nome?: string;
    tipo_codice?: string; // aggiunto per logica formattazione
};

// ✅ Recupera notifiche visibili per l'utente corrente
export async function getNotificheUtente(userId: string): Promise<Notifica[]> {
    const { data, error } = await supabase
        .from("notifiche_utenti")
        .select(`
            id,
            letto,
            visualizzato,
            notifica_id,
            notifiche (
                id,
                tipo: tipo_id ( codice ),
                messaggio,
                data_creazione,
                tasks ( nome ),
                progetti ( nome ),
                creatore: creatore_id ( nome, cognome )
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

    return data.map((row: any) => {
        const notifica = row.notifiche;

        // Se è notifica commento, formattala diversamente
        if (notifica?.tipo?.codice === "commento_task") {
            const contenuto = notifica.messaggio ?? "(nessun commento)";
            const dataOra = notifica.data_creazione
                ? new Date(notifica.data_creazione).toLocaleString()
                : "";

            const messaggioFormattato =
                `💬 Nuovo commento:\n` +
                `"${contenuto}"\n` +
                `🕒 ${dataOra}`;

            return {
                id: String(row.id),
                letto: row.letto,
                visualizzato: row.visualizzato,
                notifica_id: row.notifica_id,
                messaggio: messaggioFormattato,
                data_creazione: notifica.data_creazione ?? "",
                task_nome: notifica.tasks?.nome,
                progetto_nome: notifica.progetti?.nome,
                creatore_nome: undefined,
                tipo_codice: notifica.tipo.codice,
            };
        }

        // Altri tipi di notifiche mantengono formattazione standard
        return {
            id: String(row.id),
            letto: row.letto,
            visualizzato: row.visualizzato,
            notifica_id: row.notifica_id,
            messaggio: notifica?.messaggio ?? "(nessun messaggio)",
            data_creazione: notifica?.data_creazione ?? "",
            task_nome: notifica?.tasks?.nome ?? undefined,
            progetto_nome: notifica?.progetti?.nome ?? undefined,
            creatore_nome: notifica?.creatore
                ? `${notifica.creatore.nome} ${notifica.creatore.cognome}`
                : undefined,
            tipo_codice: notifica?.tipo?.codice,
        };
    });
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
            visualizzato: false,
            visualizzato_al: null,
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
