// Tipi unificati per Liste, Card, Bacheca e resourceConfigs
import type { JSX } from "react";
import type { FiltroAvanzatoGenerico } from "../supporto/FiltriGenericiAvanzati";

/** Filtro combinato emesso dall'intestazione */
export type FiltroIntestazione = FiltroAvanzatoGenerico & {
    soloMie?: boolean;
    soloCompletate?: boolean;   // tasks
    soloCompletati?: boolean;   // progetti
    [k: string]: any;           // pass-through per filtri extra
};

/** Colonna generica per tabella/lista */
export type Colonna<T> = {
    chiave: keyof T | string;
    label: string;
    className?: string;
    render?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element | string | null;
};

/** Context passato ai renderer/azioni delle config */
export type ResourceRenderCtx<T> = {
    filtro: FiltroIntestazione;
    setFiltro: (f: FiltroIntestazione) => void;
    items: T[];
    utenteId: string | null;
    navigate: (to: string) => void;
    extra?: any;
    patchItem?: (id: string | number, patch: Partial<T>) => void;
    removeItem?: (id: string | number) => void;   // 👈 AGGIUNGI
    addItem?: (item: T) => void;                  // 👈 AGGIUNGI
    cestino?: CestinoConfig<T>;
};



/** Azioni per la modalità cestino */
export type CestinoActions = {
    restore: (id: string | number) => Promise<void>;
    hardDelete: (id: string | number) => Promise<void>;
};

export type CestinoConfig<T> = {
    fetch: (args: {
        filtro: FiltroIntestazione;
        utenteId: string | null;
        paramKey?: string;              // 👈 aggiunto
    }) => Promise<T[]>;
    actions: CestinoActions;
};

/** Config base riusabile da tutte le risorse */
export type ResourceConfig<T extends { id: string | number }> = {
    key: string;
    titolo: string | JSX.Element;
    icona: any;
    coloreIcona: string;
    fetch: (args: {
        filtro: FiltroIntestazione;
        utenteId: string | null;
        paramKey?: string;              // 👈 aggiunto
    }) => Promise<T[]>;
    useHeaderFilters?: boolean;
    colonne: Colonna<T>[];
    azioni?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element;
    renderDettaglio?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element | null;
    renderModaleModifica?: (id: string, onClose: () => void) => JSX.Element;
    azioniExtra?: JSX.Element;
    modalitaCestino?: boolean;
    setup?: (deps: { utenteId: string | null }) => {
        extra: any;
        dispose?: () => void;
    };
    cestino?: CestinoConfig<T>;
    filtroIniziale?: Partial<FiltroIntestazione>;
    // 👇 per compatibilità con CardDinamiche e BachecaDinamica
    card?: (item: T, ctx: ResourceRenderCtx<T>) => JSX.Element;
    groupBy?: Record<string, GroupByDef>;
};


/** Tipi per bacheca/kanban */
export type KanbanColumn = { key: string; label: string };

export type GroupByDef = {
    label?: string;
    staticColumns?: KanbanColumn[];
    getKey?: (item: any) => string;
    getLabel?: (key: string, item?: any) => string;
    getStaticColumns?: () => KanbanColumn[];
};

/** Tipi dominio minimi (quelli che avevi locali in resourceConfigs) */
export type Stato = { id: number; nome: string; colore?: string | null };
export type Ruolo = { id: number; nome: string };
export type Priorita = { id: number; nome: string; colore?: string | null };

export type Cliente = {
    id: string;
    nome: string;
    email?: string | null;
    telefono?: string | null;
    avatar_url?: string | null;
    note?: string | null;
    progetti?: { id: string; nome: string; slug?: string }[];
};

export type Utente = {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    avatar_url?: string | null;
    ruolo: { id: number; nome: string };
    progetti: { id: string; nome: string; slug?: string }[];
};

export type Progetto = {
    id: string;
    nome: string;
    slug?: string;
    consegna: string | null;
    stato?: { id: number; nome: string } | null;
    priorita?: { id: number; nome: string } | null;
    cliente?: { id: string; nome: string } | null;
    membri: { id: string; nome: string; cognome?: string | null }[];
    completato?: boolean;
    fine_progetto?: string | null;
    tempo_stimato?: string | null;
    note?: string | null;
};

export type Task = {
    id: string;
    nome: string;
    slug?: string;
    parent_id?: string | null;
    consegna: string | null;
    stato?: { id: number; nome: string } | null;
    priorita?: { id: number; nome: string } | null;
    progetto?: { id: string; nome: string } | null;
    tempo_stimato?: number | null;
    note?: string | null;
    fine_task?: string | null;
    assegnatari?: { id: string; nome: string; cognome?: string | null }[];
};

export type TimeEntry = {
    id: string | number; // in supabase è bigint → number in TS può servire
    utente?: { id: string; nome: string; cognome: string };
    progetto?: { id: string; nome: string };
    task?: { id: string; nome: string };
    data_inizio: string;
    data_fine: string;
    durata: number;
};

/** Opzioni globali filtri intestazione */
export type OpzioniGlobali = {
    progetto?: { id: string; nome: string }[];
    utente?: { id: string; nome: string }[];
    membri?: { id: string; nome: string }[];
    cliente?: { id: string; nome: string }[];
    stato?: { id: number; nome: string }[];
    priorita?: { id: number; nome: string }[];
};