// src/components/hooks/useChatCommenti.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, AVATAR_BASE_URL } from "../supporto/supabaseClient";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import type { Commento, Utente } from "./tipi";



/* =========================================================
   Costanti
========================================================= */
export const PREVIEW_LEN = 240;

/* =========================================================
   Helpers string & avatar
========================================================= */
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

/* =========================================================
   Helpers data
========================================================= */
export const formatDay = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });

export const sameDay = (a: string, b: string) =>
    new Date(a).toDateString() === new Date(b).toDateString();

/* =========================================================
   UUID & regex
========================================================= */
export const isUuid = (v: unknown): v is string =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* =========================================================
   Mention helpers
========================================================= */
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

export const removeMentionEverywhere = (testo: string, user: Utente): string => {
    const name = fullName(user);
    const re = new RegExp(`(^|\\s)@${escapeRegex(name)}(?:\\s|\\b)`, "g");
    return testo
        .replace(re, (_m, p1) => p1)
        .replace(/\s{2,}/g, " ")
        .trimStart();
};

/* =========================================================
   Trasformazioni commenti
========================================================= */
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

/* =========================================================
   Supabase I/O helpers
========================================================= */
// Tipizza “any” per non importare i tipi del client; puoi specializzarla se vuoi.
export const validateFK = async (sb: any, taskId: string, utenteId: string) => {
    const [{ data: taskRow }, { data: userRow }] = await Promise.all([
        sb.from("tasks").select("id").eq("id", taskId).maybeSingle(),
        sb.from("utenti").select("id").eq("id", utenteId).maybeSingle(),
    ]);
    return !!taskRow && !!userRow;
};

export const insertCommento = async (
    sb: any,
    {
        taskId,
        utenteId,
        descrizione,
        parentId,
    }: { taskId: string; utenteId: string; descrizione: string; parentId: string | null }
): Promise<string | null> => {
    const { data, error } = await sb
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

export const insertDestinatari = async (sb: any, commentoId: string, destinatariIds: string[]) => {
    if (!commentoId || destinatariIds.length === 0) return;
    const rows = Array.from(new Set(destinatariIds)).map((uid) => ({
        commento_id: commentoId,
        utente_id: uid,
    }));
    const { error } = await sb.from("commenti_destinatari").insert(rows);
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

/* =========================================================
   Browser & media-query helpers
========================================================= */
export const isBrowser = typeof window !== "undefined";

export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function addMQListener(
    mq: MediaQueryList,
    handler: (this: MediaQueryList, ev: MediaQueryListEvent) => any
) {
    // Safari vecchi
    // @ts-ignore
    if (mq.addEventListener) mq.addEventListener("change", handler);
    // @ts-ignore
    else mq.addListener?.(handler);
}

export function removeMQListener(
    mq: MediaQueryList,
    handler: (this: MediaQueryList, ev: MediaQueryListEvent) => any
) {
    // @ts-ignore
    if (mq.removeEventListener) mq.removeEventListener("change", handler);
    // @ts-ignore
    else mq.removeListener?.(handler);
}

export function usePreferNativeEmoji() {
    const [prefer, setPrefer] = useState(false);

    useEffect(() => {
        if (!isBrowser || !window.matchMedia) return;

        const coarse = window.matchMedia("(any-pointer: coarse)");
        const noHover = window.matchMedia("(any-hover: none)");

        const update = () => setPrefer(coarse.matches && noHover.matches);
        update();

        const handler = () => update();
        addMQListener(coarse, handler);
        addMQListener(noHover, handler);
        return () => {
            removeMQListener(coarse, handler);
            removeMQListener(noHover, handler);
        };
    }, []);

    return prefer;
}

export function useIsSmallScreen(maxWidthPx = 1024) {
    const [small, setSmall] = useState(false);

    useEffect(() => {
        if (!isBrowser || !window.matchMedia) return;
        const mq = window.matchMedia(`(max-width: ${maxWidthPx - 1}px)`);
        const update = () => setSmall(mq.matches);
        update();

        const handler = () => update();
        addMQListener(mq, handler);
        return () => removeMQListener(mq, handler);
    }, [maxWidthPx]);

    return small;
}

/* =========================================================
   Utility: tronca senza spezzare le “grapheme” (emoji/ZJW)
========================================================= */
export function troncaSafeGraphemes(input: string, max = PREVIEW_LEN): string {
    // @ts-ignore – Segmenter non tipizzato in alcune TS lib.
    const S = typeof Intl !== "undefined" && (Intl as any).Segmenter
        ? // @ts-ignore
        new (Intl as any).Segmenter("it", { granularity: "grapheme" })
        : null;
    if (!S) return input.length <= max ? input : input.slice(0, max);

    const it = S.segment(input)[Symbol.iterator]();
    let count = 0, out = "", step = it.next();
    while (!step.done && count < max) {
        out += (step as any).value.segment;
        count++;
        step = it.next();
    }
    return out;
}

/* =========================================================
   Hook principale
========================================================= */
export type UseChatCommentiOptions = {
    commenti: Commento[];
    utentiProgetto: Utente[];
    utenteId: string;
    taskId: string;
    onNuovoCommento: (c: Commento) => void; // ✅ allineato a Props
    onClose?: () => void;
};


export function useChatCommenti({
    commenti,
    utentiProgetto,
    utenteId,
    taskId,
    onNuovoCommento,
    onClose,
}: UseChatCommentiOptions) {
    // -------------------- Input & refs --------------------
    const [testo, setTesto] = useState("");
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);

    // -------------------- Reply --------------------
    const [parentId, setParentId] = useState<string | null>(null);
    const [expandedAnteprime, setExpandedAnteprime] = useState<Record<string, boolean>>({});
    const isExpanded = useCallback(
        (id?: string | null) => !!(id && expandedAnteprime[id]),
        [expandedAnteprime]
    );
    const toggleExpanded = useCallback((id?: string | null) => {
        if (!id) return;
        setExpandedAnteprime((p) => ({ ...p, [id]: !p[id] }));
    }, []);

    // -------------------- Mentions --------------------
    const utentiById = useMemo(
        () => new Map(utentiProgetto.map((u) => [u.id, u] as const)),
        [utentiProgetto]
    );
    const [destinatarioIds, setDestinatarioIds] = useState<string[]>([]);

    const [mentionActive, setMentionActive] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    const mentionSuggestions = useMemo(
        () => (mentionActive ? buildMentionSuggestions(utentiProgetto, mentionQuery) : []),
        [mentionActive, mentionQuery, utentiProgetto]
    );

    const handleDetectMention = useCallback((value: string, caret: number) => {
        const { active, query, start } = detectMention(value, caret);
        setMentionActive(active);
        setMentionQuery(query);
        setMentionStart(start);
        if (!active) setMentionIndex(0);
    }, []);

    const insertMention = useCallback(
        (user: Utente) => {
            if (mentionStart == null || !inputRef.current) return;
            const el = inputRef.current;
            const caret = el.selectionStart ?? testo.length;

            const before = testo.slice(0, mentionStart);
            const after = testo.slice(caret);
            const label = "@" + fullName(user);

            setDestinatarioIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
            const next = before + label + " " + after;
            setTesto(next);

            setMentionActive(false);
            setMentionQuery("");
            setMentionStart(null);
            setMentionIndex(0);

            const pos = (before + label + " ").length;
            requestAnimationFrame(() => {
                el.focus();
                el.setSelectionRange(pos, pos);
            });
        },
        [mentionStart, testo]
    );

    // -------------------- Lista messaggi (enrichment + mappe) --------------------
    const commentiEnriched = useMemo(
        () => computeCommentiEnriched(commenti, utentiById),
        [commenti, utentiById]
    );
    const commentiOrdinati = useMemo(
        () => sortCommentiByDate(commentiEnriched),
        [commentiEnriched]
    );
    const mappaById = useMemo(
        () => new Map(commentiEnriched.map((c) => [c.id, c] as const)),
        [commentiEnriched]
    );

    // -------------------- ESC per chiudere --------------------
    useEffect(() => {
        if (!isBrowser || !onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // -------------------- Invio --------------------
    const [sending, setSending] = useState(false);

    const handleInvia = useCallback(async () => {
        const t = testo.trim();
        if (!t || sending) return;
        if (!isUuid(taskId) || !isUuid(utenteId)) return;

        setSending(true);
        try {
            const parent = parentId && isUuid(parentId) ? parentId : null;

            // FK di sicurezza
            const ok = await validateFK(supabase as any, taskId, utenteId);
            if (!ok) return;

            // Insert commento
            const commentoId = await insertCommento(supabase as any, {
                taskId,
                utenteId,
                descrizione: t,
                parentId: parent,
            });
            if (!commentoId) return;

            // Insert destinatari dalle mentions
            const menzionatiValidi = destinatarioIds.filter(isUuid);
            if (menzionatiValidi.length > 0) {
                await insertDestinatari(supabase as any, commentoId, menzionatiValidi);
            }

            // Notifiche — separa menzionati vs altri assegnati
            const destinatariNotifica = computeDestinatariNotifica({
                assegnatari: utentiProgetto,
                utenteId,
                parentId: parent,
                mappaById,
                menzionati: menzionatiValidi,
            });

            // autore e nome task
            const autore = utentiById.get(utenteId);
            const autoreNome = autore ? fullName(autore) : "Qualcuno";

            const { data: taskRow } = await supabase
                .from("tasks")
                .select("nome")
                .eq("id", taskId)
                .maybeSingle();

            const taskNome = taskRow?.nome || "Task";

            // menzionati: solo loro
            const menzionatiOnly = Array.from(new Set(menzionatiValidi))
                //.filter((id) => id && id !== utenteId);
                .filter((id) => !!id); // permetti auto-mention

            // generali: tutti i destinatari esclusi i menzionati
            const generali = destinatariNotifica.filter((id) => !menzionatiOnly.includes(id) && id !== utenteId);

            if (menzionatiOnly.length > 0) {
                await inviaNotifica(
                    "COMMENTO_MENZIONE",
                    menzionatiOnly,
                    `${autoreNome} ti ha menzionato in un commento in '${taskNome}'`,
                    utenteId,
                    { task_id: taskId, commento_id: commentoId, parent_id: parent ?? undefined }
                );
            }

            if (generali.length > 0) {
                await inviaNotifica(
                    "COMMENTO_TASK",
                    generali,
                    `${autoreNome} ha commentato '${taskNome}'`,
                    utenteId,
                    { task_id: taskId, commento_id: commentoId, parent_id: parent ?? undefined }
                );
            }


            // reset UI
            setTesto("");
            setParentId(null);
            setDestinatarioIds([]);
            // dopo l'insert e prima del reset UI
            const nuovo: Commento = {
                id: commentoId,
                parent_id: parent,
                descrizione: t,
                created_at: new Date().toISOString(),
                utente: utentiById.get(utenteId) || { id: utenteId, nome: "", cognome: null, avatar_url: null },
                destinatari: menzionatiValidi.map(id => utentiById.get(id)!).filter(Boolean),
            };

            onNuovoCommento(nuovo);


            requestAnimationFrame(() => {
                const el = inputRef.current;
                if (el) {
                    el.style.height = "0px";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }
                const body = bodyRef.current;
                if (body) body.scrollTop = body.scrollHeight;
            });

            inputRef.current?.focus();
        } finally {
            setSending(false);
        }
    }, [
        destinatarioIds,
        mappaById,
        onNuovoCommento,
        taskId,
        testo,
        utentiProgetto,
        utenteId,
        parentId,
        sending,
    ]);

    // -------------------- Handlers input --------------------
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Navigazione nel menu mentions
            if (mentionActive && mentionSuggestions.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                    return;
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    insertMention(mentionSuggestions[mentionIndex]);
                    return;
                }
                if (e.key === "Escape") {
                    setMentionActive(false);
                    return;
                }
            }
            // Invio rapido (Shift+Enter = newline)
            if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                handleInvia();
            }
        },
        [handleInvia, insertMention, mentionActive, mentionIndex, mentionSuggestions]
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            setTesto(value);
            const caret = e.target.selectionStart ?? value.length;
            handleDetectMention(value, caret);
        },
        [handleDetectMention]
    );

    const canSend = testo.trim().length > 0 && !sending;

    // -------------------- Utils per destinatari UI --------------------
    const removeDestinatario = useCallback((u: Utente) => {
        setDestinatarioIds((prev) => prev.filter((x) => x !== u.id));
        setTesto((prev) => removeMentionEverywhere(prev, u));
    }, []);

    return {
        // state + refs
        testo,
        setTesto,
        inputRef,
        bodyRef,
        parentId,
        setParentId,
        destinatarioIds,
        setDestinatarioIds,

        // mentions
        mentionActive,
        mentionSuggestions,
        mentionIndex,
        setMentionIndex,
        insertMention,

        // anteprime
        isExpanded,
        toggleExpanded,

        // computed
        commentiOrdinati,
        mappaById,
        utentiById,

        // actions
        handleChange,
        handleKeyDown,
        handleInvia,
        canSend,
        removeDestinatario,

        // helpers
        troncaSafeGraphemes,
        cx,
        fullName,
        PREVIEW_LEN,
    };
}
export function useAutosize(
    ref: React.RefObject<HTMLTextAreaElement | null>,
    dep: string,
    max = 120 // abbassato a 120px per non avere barre giganti
) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Se vuota, altezza minima e niente scroll
        if (!dep.trim()) {
            el.style.height = "auto";
            el.style.overflowY = "hidden";
            return;
        }

        // Reset e ricalcolo
        el.style.height = "0px";
        el.style.height = Math.min(el.scrollHeight, max) + "px";

        // Mostra scroll solo se supera il max
        el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    }, [ref, dep, max]);
}

/**
 * Auto-scroll alla fine quando arrivano nuovi elementi.
 */
export function useAutoScroll(
    listRef: React.RefObject<HTMLDivElement | null>,
    itemsCount: number
) {
    const lastCountRef = useRef(0);

    // on mount
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    }, []);

    // on new items
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const prev = lastCountRef.current;
        lastCountRef.current = itemsCount;
        if (itemsCount > prev) el.scrollTop = el.scrollHeight;
    }, [itemsCount, listRef]);
}
