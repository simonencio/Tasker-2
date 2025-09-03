import {
    isSameDay,
    isBefore,
    startOfDay,
    addDays,
    startOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
} from 'date-fns';
import type { Task } from './tipi';
import { it } from "date-fns/locale";



/** Parsing robusto della data di consegna */
function parseDueDate(d: string | Date | null | undefined): Date | null {
    if (!d) return null;
    const dt = typeof d === "string" ? new Date(d) : d;
    return isNaN(dt as unknown as number) ? null : dt;
}

// versione generica: preserva i campi extra come "progetto_nome"
export const filtraTask = <T extends Task>(
    taskList: T[],
    giorno: Date,
    soloMieTask: boolean,
    utenteLoggatoId: string | null,
    _isAdmin?: boolean,
    mostraCompletate: boolean = true
): T[] => {

    const gStart = startOfDay(giorno);
    const gEnd = addDays(gStart, 1);

    return taskList.filter(t => {
        const due = parseDueDate(t.consegna);
        // Mostra SOLO se ha una data di consegna compresa nel giorno
        if (!due || !(due >= gStart && due < gEnd)) return false;

        // Filtro "solo mie" (se non sei admin)
        if (soloMieTask) {
            const assegnataAllUtente =
                !!t.utenti_task?.some((u: { utente?: { id?: string | null } }) => u?.utente?.id === utenteLoggatoId);
            if (!assegnataAllUtente) return false;
        }

        // 3) Filtro "Completate": se disattivo, nascondi le task complete
        if (!mostraCompletate && t.fine_task) return false;

        return true;
    });
};


/**
 * Colore per il riquadro del giorno:
 * - Verde  -> tutte le task del giorno sono completate
 * - Giallo -> almeno 1 task incompleta con scadenza oggi o domani
 * - Rosso  -> almeno 1 task incompleta con scadenza prima di oggi
 */
export function getColorClass(
    giorno: Date,
    oggi: Date,
    tasks: Task[] = []
): string {
    const gStart = startOfDay(giorno);
    const gEnd = addDays(gStart, 1);
    const todayStart = startOfDay(oggi);
    const dayAfterTomorrowStart = addDays(todayStart, 2);

    // Considera solo le task effettivamente "di quel giorno" (robusto anche se
    // in futuro passeremo tasks non filtrate).
    const tasksOfDay = tasks.filter(t => {
        const due = parseDueDate(t.consegna);
        return !!due && due >= gStart && due < gEnd;
    });

    if (tasksOfDay.length === 0) return "";

    const allCompleted = tasksOfDay.every(t => !!t.fine_task);
    if (allCompleted) {
        return "cal-ok";
    }

    const hasIncompleteSoon = tasksOfDay.some(t => {
        if (t.fine_task) return false;
        const due = parseDueDate(t.consegna);
        if (!due) return false;
        // oggi <= due < dopodomani  (quindi 'oggi' o 'domani')
        return due >= todayStart && due < dayAfterTomorrowStart;
    });

    if (hasIncompleteSoon) {
        return "cal-warn";
    }

    const hasIncompleteExpired = tasksOfDay.some(t => {
        if (t.fine_task) return false;
        const due = parseDueDate(t.consegna);
        if (!due) return false;
        return isBefore(due, todayStart);
    });

    if (hasIncompleteExpired) {
        return "cal-danger";
    }

    return "";
}



export const getIconColor = (giorno: Date, oggi: Date) => {
    const g = startOfDay(giorno);
    const o = startOfDay(oggi);
    if (isSameDay(g, o)) return 'icon-oggi';
    if (isBefore(g, o)) return 'icon-passato';
    return 'icon-futuro';
};


export const getMessaggio = (giorno: Date, oggi: Date) => {
    const g = startOfDay(giorno);
    const o = startOfDay(oggi);
    if (isSameDay(g, o)) return 'Ci sono task in scadenza oggi';
    if (isBefore(g, o)) return 'Hai delle task scadute per questo giorno';
    return 'Ci sono delle task in scadenza per questo giorno';
};

export const calcolaSettimana = (base: Date): Date[] => {
    const inizio = startOfWeek(base, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(inizio, i));
};

export const calcolaMesePuro = (mese: Date): Date[] =>
    eachDayOfInterval({
        start: startOfMonth(mese),
        end: endOfMonth(mese),
    });


/** Popup scadenze: raggruppa SOLO task INCOMPLETE e scadute prima di oggi */
export function generaTaskScadute(
    tasks: Task[],
    oggi: Date = new Date()
): { giorno: string; utenti: string[] }[] {
    const todayStart = startOfDay(oggi);
    const byDay = new Map<string, Set<string>>();

    for (const t of tasks) {
        if (t.fine_task) continue;                      // 🔴 escludi completate
        const due = parseDueDate(t.consegna);
        if (!due) continue;
        if (!isBefore(due, todayStart)) continue;       // non è scaduta

        // Etichetta giorno (locale IT)
        const dayLabel = format(due, "EEEE dd/MM", { locale: it })
            .replace(/^./, c => c.toUpperCase());

        // Raccogli nomi utenti assegnati (fallback su "Senza assegnatario")
        const utenti = (t as any).utenti_task?.map(
            (u: any) => [u?.utente?.nome, u?.utente?.cognome].filter(Boolean).join(" ")
        ).filter(Boolean) as string[] | undefined;

        const names = (utenti && utenti.length ? utenti : ["Senza assegnatario"]);
        if (!byDay.has(dayLabel)) byDay.set(dayLabel, new Set());
        const set = byDay.get(dayLabel)!;
        names.forEach(n => set.add(n));
    }

    // Converti in array ordinato per data (ricava data dall’etichetta)
    const result = Array.from(byDay.entries()).map(([giorno, set]) => ({
        giorno,
        utenti: Array.from(set)
    }));

    // Ordina cronologicamente (ricostruendo una data parsabile)
    result.sort((a, b) => {
        // "EEEE dd/MM" → prendi "dd/MM"
        const da = a.giorno.slice(-5), db = b.giorno.slice(-5);
        const [daD, daM] = da.split("/").map(Number);
        const [dbD, dbM] = db.split("/").map(Number);
        const A = new Date(oggi.getFullYear(), daM - 1, daD).getTime();
        const B = new Date(oggi.getFullYear(), dbM - 1, dbD).getTime();
        return A - B;
    });

    return result;
}
