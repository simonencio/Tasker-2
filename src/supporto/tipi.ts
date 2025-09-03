// supporto/tipi.ts

export type Task = {
    utenti_task?: any;
    id: string;
    slug: string; // ✅ aggiunto per URL e navigazione
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    fine_task?: string | null;
    created_at?: string;
    modified_at?: string;
    parent_id?: string | null; // ✅ Campo per sotto-task
    stato?: {
        id: number;
        nome: string;
        colore?: string | null;
    } | null;
    priorita?: {
        id: number;
        nome: string;
    } | null;
    progetto?: {
        id: string;
        nome: string;
        slug?: string;   // 👈 facciamolo opzionale
    } | null;
    assegnatari: {
        id: string;
        nome: string;
        cognome?: string | null;
    }[];
};

export type FiltroAvanzato = {
    progetto?: string | null;
    utente?: string | null;
    stato?: number | null;
    priorita?: number | null;
    dataInizio?: string | null;
    dataFine?: string | null;
    ordine?: string | null;
};

export type Commento = {
    id: string;
    utente_id: string;
    task_id: string;
    parent_id: string | null;
    descrizione: string;
    created_at: string;
    modified_at: string;
    deleted_at?: string | null;
    utente: {
        id: string;
        nome: string;
        cognome: string | null;
    };
};

// Support types
export type Utente = { id: string; nome: string; cognome: string | null };
export type Cliente = { id: string; nome: string };
export type Stato = { id: number; nome: string; colore?: string | null };
export type Priorita = { id: number; nome: string };

export type Progetto = {
    id: string;
    nome: string;
    slug: string; // ✅ nuovo campo usato nell’URL
    consegna: string | null;
    stato: Stato | null;
    priorita: Priorita | null;
    cliente: Cliente | null;
    membri: Utente[];
    note?: string | null;
    tempo_stimato?: string | null;
};
