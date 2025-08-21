
/* =========================================================
   Utente
========================================================= */
export type Utente = {
    id: string;
    nome: string;
    cognome?: string | null;
    avatar_url?: string | null;
};
/* =========================================================
   Commento
========================================================= */
export type Commento = {
    id: string;
    parent_id?: string | null;
    descrizione: string;
    created_at: string;
    utente?: {
        id: string;
        nome: string;
        cognome?: string | null;
        avatar_url?: string | null;
    } | null;
    destinatari?: { id: string; nome: string; cognome?: string | null }[] | null;
};
/* =========================================================
   Props
========================================================= */

export type Props = {
    commenti: Commento[];
    utenteId: string;
    taskId: string;
    utentiProgetto: Utente[];
    onClose: () => void;
    onNuovoCommento: (c: Commento) => void;

};