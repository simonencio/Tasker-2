// src/utils/chatCommenti.utils.ts
import { AVATAR_BASE_URL } from "../supporto/supabaseClient";

// —— Tipi condivisi (se preferisci tenerli nel componente, esportali da lì e importali qui)
export type Utente = {
    id: string;
    nome: string;
    cognome?: string | null;
    avatar_url?: string | null;
};

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

// —— Costanti
export const PREVIEW_LEN = 240;

// —— String & avatar helpers
export const lower = (s: string) => (s || "").toLocaleLowerCase();
export const fullName = (u: Pick<Utente, "nome" | "cognome">) =>
    `${u.nome} ${u.cognome || ""}`.trim();

export const urlForAvatar = (avatar?: string | null) => {
    const v = (avatar || "").trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return encodeURI(v);
    const base = AVATAR_BASE_URL.replace(/\/+$/, "");
    const path = v.replace(/^\/+/, "");
    return `${base}/${encodeURI(path)}`;
};

export const tronca = (t: string, L = PREVIEW_LEN) =>
    (t || "").length > L ? (t || "").slice(0, L) + "…" : t || "";

export const getInitials = (nome?: string | null, cognome?: string | null) => {
    const n = (nome || "").trim();
    const c = (cognome || "").trim();
    if (!n && !c) return "??";
    return (n[0] || "").toUpperCase() + (c[0] || "").toUpperCase();
};

// —— Date helpers
export const formatDay = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });

export const sameDay = (a: string, b: string) =>
    new Date(a).toDateString() === new Date(b).toDateString();

// —— UUID & regex
export const isUuid = (v: unknown): v is string =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// —— Mention helpers
export type MentionDetection = {
    active: boolean;
    query: string;
    start: number | null; // posizione della '@'
};

export const detectMention = (value: string, caret: number): MentionDetection => {
    const left = value.slice(0, caret);
    const m = left.match(/(?:^|\s)@([^\s@]*)$/);
    if (!m) return { active: false, query: "", start: null };
    return { active: true, query: m[1], start: caret - m[1].length - 1 };
};

export const buildMentionSuggestions = (assegnatari: Utente[], query: string) => {
    const q = lower(query);
    if (!q) return assegnatari;
    return assegnatari.filter((u) =>
        lower(fullName(u)).includes(q) ||
        lower(u.nome).includes(q) ||
        lower(u.cognome || "").includes(q)
    );
};

export const removeMentionEverywhere = (
    testo: string,
    user: Utente
): string => {
    const name = fullName(user);
    const re = new RegExp(`(^|\\s)@${escapeRegex(name)}(?:\\s|\\b)`, "g");
    return testo
        .replace(re, (_m, p1) => p1)
        .replace(/\s{2,}/g, " ")
        .trimStart();
};

// —— Commenti transforms
export const computeCommentiEnriched = (
    commenti: Commento[],
    assegnatariById: Map<string, Utente>
): Commento[] =>
    commenti.map((c) => {
        if (c.utente && !c.utente.avatar_url) {
            const fromAss = assegnatariById.get(c.utente.id);
            if (fromAss?.avatar_url) {
                return { ...c, utente: { ...c.utente, avatar_url: fromAss.avatar_url } };
            }
        }
        return c;
    });

export const sortCommentiByDate = (commenti: Commento[]): Commento[] =>
    [...commenti].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

// —— Supabase I/O helpers (non vincolanti, usali se vuoi incapsulare)
// Tipizza “any” per non importare la client type; puoi specializzarla se vuoi.
export const validateFK = async (
    supabase: any,
    taskId: string,
    utenteId: string
) => {
    const [{ data: taskRow }, { data: userRow }] = await Promise.all([
        supabase.from("tasks").select("id").eq("id", taskId).maybeSingle(),
        supabase.from("utenti").select("id").eq("id", utenteId).maybeSingle(),
    ]);
    return !!taskRow && !!userRow;
};

export const insertCommento = async (
    supabase: any,
    {
        taskId,
        utenteId,
        descrizione,
        parentId,
    }: { taskId: string; utenteId: string; descrizione: string; parentId: string | null }
): Promise<string | null> => {
    const { data, error } = await supabase
        .from("commenti")
        .insert({ task_id: taskId, utente_id: utenteId, descrizione, parent_id: parentId })
        .select("id")
        .single();

    if (error) {
        console.error("Insert commento failed:", {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: error.code,
        });
        return null;
    }
    return data?.id ?? null;
};

export const insertDestinatari = async (
    supabase: any,
    commentoId: string,
    destinatariIds: string[]
) => {
    if (!commentoId || destinatariIds.length === 0) return;
    const rows = Array.from(new Set(destinatariIds)).map((uid) => ({
        commento_id: commentoId,
        utente_id: uid,
    }));
    const { error } = await supabase.from("commenti_destinatari").insert(rows);
    if (error) console.error("Insert destinatari failed:", error);
};

export const computeDestinatariNotifica = ({
    assegnatari,
    utenteId,
    parentId,
    mappaById,
    menzionati,
}: {
    assegnatari: Utente[];
    utenteId: string;
    parentId: string | null;
    mappaById: Map<string, Commento>;
    menzionati: string[];
}) => {
    const destinatariSet = new Set<string>(menzionati.filter(isUuid));
    for (const a of assegnatari) {
        if (isUuid(a.id) && a.id !== utenteId) destinatariSet.add(a.id);
    }
    if (parentId) {
        const parent = mappaById.get(parentId);
        const autorePadre = parent?.utente?.id;
        if (isUuid(autorePadre) && autorePadre !== utenteId) destinatariSet.add(autorePadre);
    }
    return Array.from(destinatariSet);
};
