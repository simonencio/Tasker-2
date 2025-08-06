export type Task = {
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    created_at: string;
    modified_at: string;
    stato?: { id: number; nome: string; colore?: string | null } | null;
    priorita?: { id: number; nome: string } | null;
    progetto?: { id: string; nome: string } | null;
    assegnatari: { id: string; nome: string; cognome?: string | null }[];
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