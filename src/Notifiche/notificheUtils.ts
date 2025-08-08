// notificheUtils.ts
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
    tipo_codice?: string; // per logica formattazione
};

// opzionale: se vuoi riusare il tipo anche altrove
export type NotificaExtra = {
    progetto_id?: string;
    task_id?: string;
    commento_id?: string;
    parent_id?: string;
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

        // Formattazione speciale per commenti
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

        // Default
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
    contesto?: NotificaExtra // <-- ora include commento_id e parent_id
): Promise<void> {
    // 1) trova tipo_id dal codice
    const { data: tipo, error: tipoError } = await supabase
        .from("notifiche_tipi")
        .select("id")
        .eq("codice", tipo_codice)
        .single();

    if (tipoError || !tipo) {
        console.error("Tipo notifica non trovato:", tipo_codice, tipoError);
        return;
    }

    const tipo_id = tipo.id;

    // 2) inserisci notifica principale
    const { data: nuovaNotifica, error: notificaError } = await supabase
        .from("notifiche")
        .insert({
            tipo_id,
            messaggio,
            creatore_id: creatore_id || null,
            progetto_id: contesto?.progetto_id || null,
            task_id: contesto?.task_id || null,
            // campi extra collegati ai commenti/risposte
            commento_id: contesto?.commento_id || null,
            parent_id: contesto?.parent_id || null,
        })
        .select()
        .single();

    if (notificaError || !nuovaNotifica) {
        console.error("Errore inserimento notifica:", notificaError);
        return;
    }

    const notifica_id = nuovaNotifica.id;

    // 3) deduplica destinatari ed escludi il creatore (niente auto-notifica)
    const destUnici = Array.from(new Set(destinatari)).filter(
        (u) => !!u && u !== creatore_id
    );

    if (destUnici.length === 0) return;

    // 4) per ciascun destinatario, crea riga notifiche_utenti e invia eventuale email
    for (const userId of destUnici) {
        // preferenze per questo tipo
        const { data: pref, error: prefErr } = await supabase
            .from("notifiche_preferenze")
            .select("invia_email")
            .eq("utente_id", userId)
            .eq("tipo_id", tipo_id)
            .maybeSingle();

        if (prefErr) {
            console.warn("Preferenze notifica non disponibili:", prefErr);
        }

        const inviaEmail = pref?.invia_email === true;

        // inserisci assegnazione all'utente
        const { error: insUtenteErr } = await supabase.from("notifiche_utenti").insert({
            notifica_id,
            utente_id: userId,
            inviato: inviaEmail,
            inviato_al: inviaEmail ? new Date().toISOString() : null,
            visualizzato: false,
            visualizzato_al: null,
        });

        if (insUtenteErr) {
            console.error("Errore inserimento notifiche_utenti:", insUtenteErr);
            continue;
        }

        // email (se preferenze lo consentono)
        if (inviaEmail) {
            const [{ data: user }, { data: tipoDett }] = await Promise.all([
                supabase
                    .from("utenti")
                    .select("email, nome, cognome")
                    .eq("id", userId)
                    .maybeSingle(),
                supabase
                    .from("notifiche_tipi")
                    .select("descrizione")
                    .eq("id", tipo_id)
                    .maybeSingle(),
            ]);

            if (user?.email && tipoDett?.descrizione) {
                const { subject, body } = generaContenutoEmail({
                    nomeUtente: user.nome,
                    descrizioneTipo: tipoDett.descrizione,
                    messaggio,
                });

                try {
                    await inviaEmailNotifica({
                        to: user.email,
                        subject,
                        body,
                    });
                } catch (e) {
                    console.error("Invio email fallito:", e);
                }
            }
        }
    }
}
