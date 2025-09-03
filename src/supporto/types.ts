export type Cliente = { id: string; nome: string };
export type Utente = { id: string; nome: string; cognome: string };
export type Stato = { id: number; nome: string };
export type Priorita = { id: number; nome: string };

export type PopupType = "cliente" | "utenti" | "stato" | "priorita" | "consegna" | "tempo";
export type MiniProjectModalProps = { onClose: () => void };









