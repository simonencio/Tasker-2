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
import type { Task } from '../GestioneProgetto/DettaglioProgetto';

export const filtraTask = (
    taskList: Task[],
    giorno: Date,
    soloMieTask: boolean,
    utenteLoggatoId: string | null
) =>
    taskList.filter(
        t =>
            t.consegna &&
            isSameDay(new Date(t.consegna), giorno) &&
            (!soloMieTask || t.utenti_task?.some(u => u.utente?.id === utenteLoggatoId))
    );

export const getColorClass = (giorno: Date, oggi: Date) => {
    const g = startOfDay(giorno);
    const o = startOfDay(oggi);
    if (isSameDay(g, o)) return 'bg-oggi';
    if (isBefore(g, o)) return 'bg-passato';
    return 'bg-futuro';
};

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

export const calcolaMeseEsteso = (mese: Date): Date[] =>
    eachDayOfInterval({
        start: startOfWeek(startOfMonth(mese), { weekStartsOn: 1 }),
        end: addDays(endOfMonth(mese), 6),
    });

export const generaTaskScadute = (taskList: Task[]) => {
    const oggi = new Date();
    const raggruppate: Record<string, Set<string>> = {};
    taskList.forEach(t => {
        if (t.consegna && new Date(t.consegna) < oggi) {
            const giorno = format(new Date(t.consegna), 'dd/MM/yyyy');
            if (!raggruppate[giorno]) raggruppate[giorno] = new Set();
            t.utenti_task?.forEach(u => {
                const nomeCompleto = `${u.utente?.nome ?? ''} ${u.utente?.cognome ?? ''}`.trim();
                if (nomeCompleto) raggruppate[giorno].add(nomeCompleto);
            });
        }
    });
    return Object.entries(raggruppate).map(([giorno, utenti]) => ({
        giorno,
        utenti: Array.from(utenti),
    }));
};
