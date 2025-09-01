import { inviaNotifica } from "../Notifiche/notificheUtils";

export type NotificaContext = {
    progetto_id?: string;
    progettoNome?: string;
    task_id?: string;
    taskNome?: string;
    commento_id?: string;
    parent_id?: string;
    modifiche?: Array<{ campo: string; da?: string | null; a?: string | null }>;
    testoCommento?: string;
    [k: string]: any;
};

type Template = {
    buildMsg: (ctx: NotificaContext) => string;
    buildDettagli?: (ctx: NotificaContext) => any;
};

/**
 * Template riutilizzabili per OGNI codice.
 * Ogni voce definisce come formattare messaggio e dettagli.
 */
export const notificheTemplates: Record<string, Template> = {
    // --- TASK ---
    TASK_ASSEGNATO: {
        buildMsg: ({ taskNome }) => `Ti è stata assegnata la task "${taskNome ?? ""}"`,
    },
    TASK_RIMOSSO: {
        buildMsg: ({ taskNome }) => `Sei stato rimosso dalla task "${taskNome ?? ""}"`,
    },
    TASK_MODIFICATO: {
        buildMsg: ({ taskNome }) => `La task "${taskNome ?? ""}" è stata modificata`,
        buildDettagli: ({ modifiche }) => ({ modifiche }),
    },
    TASK_COMPLETATO: {
        buildMsg: ({ taskNome }) => `La task "${taskNome ?? ""}" è stata completata`,
    },

    // --- PROGETTI ---
    PROGETTO_ASSEGNATO: {
        buildMsg: ({ progettoNome }) => `Sei stato aggiunto al progetto "${progettoNome ?? ""}"`,
    },
    PROGETTO_RIMOSSO: {
        buildMsg: ({ progettoNome }) => `Sei stato rimosso dal progetto "${progettoNome ?? ""}"`,
    },
    PROGETTO_MODIFICATO: {
        buildMsg: ({ progettoNome }) => `Il progetto "${progettoNome ?? ""}" è stato modificato`,
        buildDettagli: ({ modifiche }) => ({ modifiche }),
    },

    // --- COMMENTI ---
    COMMENTO_TASK: {
        buildMsg: ({ taskNome, testoCommento }) =>
            `Nuovo commento su "${taskNome ?? "task"}": ${testoCommento ?? ""}`,
        buildDettagli: ({ commento_id, parent_id }) => ({ commento_id, parent_id }),
    },
    COMMENTO_MENZIONE: {
        buildMsg: ({ testoCommento }) =>
            `Sei stato menzionato in un commento: ${testoCommento ?? ""}`,
        buildDettagli: ({ commento_id, parent_id }) => ({ commento_id, parent_id }),
    },

    // --- HARD DELETE DETTAGLIATE ---
    HARD_DELETE_TASK: {
        buildMsg: ({ taskNome, subtasksCount, commentiCount }) =>
            `La task "${taskNome ?? ""}" è stata eliminata definitivamente insieme a ` +
            `${subtasksCount ?? 0} sotto-task e ${commentiCount ?? 0} commenti`,
        buildDettagli: ({ task_id, subtasksCount, commentiCount }) => ({
            task_id,
            subtasksCount,
            commentiCount,
        }),
    },
    HARD_DELETE_PROGETTO: {
        buildMsg: ({ progettoNome, tasksCount }) =>
            `Il progetto "${progettoNome ?? ""}" è stato eliminato definitivamente ` +
            `(con ${tasksCount ?? 0} task collegate)`,
        buildDettagli: ({ progetto_id, tasksCount }) => ({ progetto_id, tasksCount }),
    },
    HARD_DELETE_UTENTE: {
        buildMsg: ({ utenteNome, taskCount, progettoCount }) =>
            `L'utente "${utenteNome ?? ""}" è stato eliminato definitivamente. ` +
            `Sono stati aggiornati ${taskCount ?? 0} task e ${progettoCount ?? 0} progetti collegati`,
        buildDettagli: ({ utente_id, taskCount, progettoCount }) => ({
            utente_id,
            taskCount,
            progettoCount,
        }),
    },
    HARD_DELETE_CLIENTE: {
        buildMsg: ({ clienteNome, progettiCount }) =>
            `Il cliente "${clienteNome ?? ""}" è stato eliminato definitivamente ` +
            `(con ${progettiCount ?? 0} progetti collegati)`,
        buildDettagli: ({ cliente_id, progettiCount }) => ({ cliente_id, progettiCount }),
    },

    // --- HARD DELETE METADATI ---
    HARD_DELETE_STATO: {
        buildMsg: ({ statoNome, reassignedTo }) =>
            `Lo stato "${statoNome ?? ""}" è stato eliminato. ` +
            (reassignedTo ? `I riferimenti sono stati sostituiti con "${reassignedTo}"` : ""),
    },
    HARD_DELETE_PRIORITA: {
        buildMsg: ({ prioritaNome, reassignedTo }) =>
            `La priorità "${prioritaNome ?? ""}" è stata eliminata. ` +
            (reassignedTo ? `I riferimenti sono stati sostituiti con "${reassignedTo}"` : ""),
    },
    HARD_DELETE_RUOLO: {
        buildMsg: ({ ruoloNome, reassignedTo }) =>
            `Il ruolo "${ruoloNome ?? ""}" è stato eliminato. ` +
            (reassignedTo ? `Il tuo ruolo è stato cambiato in "${reassignedTo}"` : ""),
    },

    // --- TIME ENTRIES ---
    HARD_DELETE_TIME_ENTRY: {
        buildMsg: ({ taskNome }) =>
            `Una time entry collegata alla task "${taskNome ?? ""}" è stata eliminata definitivamente`,
    },
    HARD_DELETE_TIME_ENTRIES_TASK: {
        buildMsg: ({ taskNome, count }) =>
            `${count ?? 0} time entries collegate alla task "${taskNome ?? ""}" sono state eliminate definitivamente`,
    },
    HARD_DELETE_TIME_ENTRIES_PROGETTO: {
        buildMsg: ({ progettoNome, count }) =>
            `${count ?? 0} time entries collegate al progetto "${progettoNome ?? ""}" sono state eliminate definitivamente`,
    },

    // --- HARD DELETE ALL (Svuota cestino) ---
    HARD_DELETE_ALL_TASKS: {
        buildMsg: () => `Tutte le task presenti nel cestino sono state eliminate definitivamente`,
    },
    HARD_DELETE_ALL_PROGETTI: {
        buildMsg: () => `Tutti i progetti presenti nel cestino sono stati eliminati definitivamente`,
    },
    HARD_DELETE_ALL_UTENTI: {
        buildMsg: () => `Tutti gli utenti presenti nel cestino sono stati eliminati definitivamente`,
    },
    HARD_DELETE_ALL_CLIENTI: {
        buildMsg: () => `Tutti i clienti presenti nel cestino sono stati eliminati definitivamente`,
    },
    HARD_DELETE_ALL_STATI: {
        buildMsg: () => `Tutti gli stati presenti nel cestino sono stati eliminati definitivamente`,
    },
    HARD_DELETE_ALL_PRIORITA: {
        buildMsg: () => `Tutte le priorità presenti nel cestino sono state eliminate definitivamente`,
    },
    HARD_DELETE_ALL_RUOLI: {
        buildMsg: () => `Tutti i ruoli presenti nel cestino sono stati eliminati definitivamente`,
    },
    HARD_DELETE_ALL_TIME_ENTRIES: {
        buildMsg: () =>
            `Tutte le time entries presenti nel cestino sono state eliminate definitivamente`,
    },
};

/**
 * Funzione unica per inviare notifiche con template centralizzati
 */
export async function notificaEvento(
    codice: keyof typeof notificheTemplates,
    destinatari: string[],
    creatoreId?: string,
    ctx: NotificaContext = {}
) {
    const tpl = notificheTemplates[codice];
    if (!tpl) {
        console.warn("Template non trovato per", codice);
        return;
    }

    const msg = tpl.buildMsg(ctx);
    const dettagli = tpl.buildDettagli ? tpl.buildDettagli(ctx) : undefined;

    await inviaNotifica(codice, destinatari, msg, creatoreId, ctx, dettagli);
}
