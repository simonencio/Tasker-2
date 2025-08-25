// notificheUtils.ts
import { supabase } from "../supporto/supabaseClient";

export type DettagliNotifica = {
    campo?: "nome" | "descrizione" | string;
    da?: string | null;
    a?: string | null;
    // in futuro puoi aggiungere altre chiavi senza cambiare il tipo
    [k: string]: any;
};


export type Notifica = {
    // pivot notifiche_utenti
    id: string;                       // id di notifiche_utenti (lo usi per eliminare/leggere)
    utente_id: string;

    // notifica master
    notifica_id: string;
    messaggio: string;
    data_creazione: string;
    tipo_codice?: string | null;      // es. "PROGETTO_MODIFICATO"
    tipo_descrizione?: string | null; // es. "Un progetto è stato modificato"
    dettagli?: DettagliNotifica | null;

    // meta utili per la UI
    progetto_id?: string | null;
    progetto_nome?: string | null;
    task_id?: string | null;
    task_nome?: string | null;
    creatore_id?: string | null;
    creatore_nome?: string | null;

    // stato utente-notifica
    letto: boolean;
    visualizzato?: boolean | null;
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
            utente_id,                 
            letto,
            visualizzato,
            notifica_id,
            notifiche (
            id,
            tipo: tipo_id ( codice ),
            messaggio,
            data_creazione,
            dettagli,                
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

    function parseDettagli(val: unknown): DettagliNotifica | null {
        if (!val) return null;
        if (typeof val === "object") return val as DettagliNotifica;
        if (typeof val === "string") {
            try { return JSON.parse(val) as DettagliNotifica; } catch { return null; }
        }
        return null;
    }


    return data.map((row: any) => {
        const notifica = row.notifiche;
        const dettagli = parseDettagli(notifica?.dettagli);

        // Caso speciale: commento_task
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
                utente_id: row.utente_id,                 // <== ora c’è
                letto: row.letto,
                visualizzato: row.visualizzato,
                notifica_id: row.notifica_id,
                messaggio: messaggioFormattato,
                data_creazione: notifica.data_creazione ?? "",
                task_nome: notifica.tasks?.nome,
                progetto_nome: notifica.progetti?.nome,
                creatore_nome: undefined,
                tipo_codice: notifica.tipo.codice,
                dettagli,                                 // <== passa comunque i dettagli
            } as Notifica;
        }

        // Default
        return {
            id: String(row.id),
            utente_id: row.utente_id,                   // <== ora c’è
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
            dettagli,                                   // <== qui useremo {campo,da,a}
        } as Notifica;
    });
}


// ✅ Crea una nuova notifica per destinatari con controllo invio mail
export async function inviaNotifica(
    tipo_codice: string,
    destinatari: string[],
    messaggio: string,
    creatore_id?: string,
    contesto?: NotificaExtra, // <-- ora include commento_id e parent_id
    dettagli?: DettagliNotifica
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
            dettagli: dettagli ?? null,
        })
        .select()
        .single();

    if (notificaError || !nuovaNotifica) {
        console.error("Errore inserimento notifica:", notificaError);
        return;
    }

    const notifica_id = nuovaNotifica.id;

    // 3) deduplica destinatari (NON escludere il creatore se è auto-assegnato)
    const destUnici = Array.from(new Set(destinatari)).filter((u) => !!u);

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
export async function inviaEmailNotifica({
    to,
    subject,
    body,
}: {
    to: string;
    subject: string;
    body: string;
}) {
    const response = await fetch("https://kieyhhmxinmdsnfdglrm.supabase.co/functions/v1/sendEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: to, subject, body }),
    });

    const text = await response.text();
    if (!response.ok) {
        console.error("❌ Errore invio email:", text);
    } else {
        console.log("✅ Email inviata:", text);
    }
}


export function generaContenutoEmail({
    nomeUtente,
    descrizioneTipo,
    messaggio,
}: {
    nomeUtente: string;
    descrizioneTipo: string;
    messaggio: string;
}): { subject: string; body: string } {
    const subject = `📢 ${descrizioneTipo}`;

    const body = `
Ciao ${nomeUtente},

Hai ricevuto una nuova notifica sulla piattaforma *Tasker*:

──────────────────────────────
📌 Tipo: ${descrizioneTipo}
💬 Messaggio: ${messaggio}
──────────────────────────────

🔗 Puoi accedere a Tasker per maggiori dettagli al seguente link:
http://localhost:5173/home

Se non desideri ricevere queste email, puoi aggiornare le tue preferenze di notifica direttamente dal tuo profilo utente.

Grazie per utilizzare Tasker!

—
Questa email è stata inviata automaticamente in base alle tue impostazioni di notifica.
  `.trim();

    return { subject, body };
}


export async function richiediPermessoNotificheBrowser() {
    if (!("Notification" in window)) {
        console.warn("Questo browser non supporta le notifiche desktop.");
        return;
    }

    if (Notification.permission === "default") {
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                console.log("Permesso notifiche concesso.");
            } else if (permission === "denied") {
                console.warn("Permesso notifiche negato dall'utente.");
            }
        } catch (error) {
            console.error("Errore nella richiesta di permesso per le notifiche:", error);
        }
    }
}

export function mostraNotificaBrowser(titolo: string, opzioni?: NotificationOptions) {
    if (Notification.permission === "granted") {
        const body = opzioni?.body
            ? opzioni.body.length > 150
                ? opzioni.body.slice(0, 150) + "..."
                : opzioni.body
            : undefined;

        new Notification(titolo, {
            ...opzioni,
            body,
        });
    }
}

export function renderDettaglio(n: Notifica): string | null {
    const d = n.dettagli || {};
    switch (d.campo) {
        case "nome":
            if (d.da || d.a) return `Nome cambiato da "${d.da ?? ""}" a "${d.a ?? ""}"`.trim();
            return "Nome progetto modificato";
        case "descrizione":
            if (d.da || d.a) return `Descrizione aggiornata da "${d.da ?? ""}" a "${d.a ?? ""}"`.trim();
            return "Descrizione progetto aggiornata";
        default:
            return null;
    }
}

