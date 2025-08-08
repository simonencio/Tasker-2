import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTimes,
    faReply,
    faPaperPlane,
    faPaperclip,
    faSmile,
    faXmark
} from "@fortawesome/free-solid-svg-icons";

export type Commento = {
    id: string;
    parent_id?: string | null;
    descrizione: string;
    created_at: string;
    utente?: {
        id: string;
        nome: string;
        cognome?: string | null;
    } | null;
    // popolato dalla view/SELECT: elenco utenti menzionati (destinatari)
    destinatari?: { id: string; nome: string; cognome?: string | null }[] | null;
};

type Utente = {
    id: string;
    nome: string;
    cognome?: string | null;
};

type Props = {
    commenti: Commento[];
    utenteId: string;
    taskId: string;
    assegnatari: Utente[];
    onClose: () => void;
    onNuovoCommento: () => void;
};

export default function ChatCommentiModal({
    commenti,
    utenteId,
    taskId,
    assegnatari,
    onClose,
    onNuovoCommento
}: Props) {
    const [testo, setTesto] = useState("");
    const [parentId, setParentId] = useState<string | null>(null);

    // ✅ Multi-destinatari (menzioni)
    const [destinatarioIds, setDestinatarioIds] = useState<string[]>([]);
    const assegnatariById = useMemo(() => new Map(assegnatari.map(a => [a.id, a])), [assegnatari]);

    // Stato "mostra tutto/comprimi" per le quote
    const PREVIEW_LEN = 240;
    const [expandedAnteprime, setExpandedAnteprime] = useState<Record<string, boolean>>({});
    const isExpanded = (id?: string | null) => !!(id && expandedAnteprime[id!]);
    const toggleExpanded = (id?: string | null) => {
        if (!id) return;
        setExpandedAnteprime(p => ({ ...p, [id]: !p[id] }));
    };

    // Menzioni @
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [mentionActive, setMentionActive] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    const lower = (s: string) => (s || "").toLocaleLowerCase();
    const fullName = (u: Utente) => `${u.nome} ${u.cognome || ""}`.trim();

    const mentionSuggestions = useMemo(() => {
        if (!mentionActive) return [];
        const q = lower(mentionQuery);
        if (!q) return assegnatari;
        return assegnatari.filter(u =>
            lower(fullName(u)).includes(q) ||
            lower(u.nome).includes(q) ||
            lower(u.cognome || "").includes(q)
        );
    }, [mentionActive, mentionQuery, assegnatari]);

    // refs per autoscroll
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const lastCountRef = useRef<number>(0);

    // ordinamento e lookup commenti
    const commentiOrdinati = useMemo(
        () =>
            [...commenti].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
        [commenti]
    );
    const mappaById = useMemo(() => new Map(commenti.map(c => [c.id, c])), [commenti]);

    // helpers chat
    const formatDay = (iso: string) =>
        new Date(iso).toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
        });

    const sameDay = (a: string, b: string) =>
        new Date(a).toDateString() === new Date(b).toDateString();

    const tronca = (t: string, L = PREVIEW_LEN) => (t.length > L ? t.slice(0, L) + "…" : t);

    const getInitials = (nome?: string | null, cognome?: string | null) => {
        const n = (nome || "").trim();
        const c = (cognome || "").trim();
        if (!n && !c) return "??";
        return (n[0] || "").toUpperCase() + (c[0] || "").toUpperCase();
    };

    const renderQuoted = (parent?: Commento | null) => {
        if (!parent) return null;
        const expanded = isExpanded(parent.id);
        const full = parent.descrizione || "";
        const showToggle = full.length > PREVIEW_LEN;

        return (
            <div className="mb-2 text-xs rounded-xl border-l-4 pl-3 pr-2 py-2 bg-black/5 dark:bg-white/5 border-l-emerald-500">
                <div className="font-semibold mb-1">
                    {parent?.utente?.nome} {parent?.utente?.cognome || ""}
                </div>
                <div className="whitespace-pre-line text-[13px]">
                    {expanded ? full : tronca(full)}
                    {showToggle && (
                        <button
                            type="button"
                            className="ml-2 text-[12px] text-emerald-600 hover:underline"
                            onClick={() => toggleExpanded(parent.id)}
                        >
                            {expanded ? "Comprimi" : "Mostra tutto"}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // auto-scroll apertura
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    }, []);

    // auto-scroll su nuovi
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const prev = lastCountRef.current;
        const curr = commentiOrdinati.length;
        lastCountRef.current = curr;
        if (curr > prev) el.scrollTop = el.scrollHeight;
    }, [commentiOrdinati.length]);

    // chiudi con ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // autosize textarea
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "0px";
        const maxH = 160; // ~5-6 righe
        el.style.height = Math.min(el.scrollHeight, maxH) + "px";
    }, [testo]);

    // —————————————————————————————————
    // Rilevamento menzione mentre scrivi
    // —————————————————————————————————
    const detectMention = (value: string, caret: number) => {
        // match "inizio o spazio + @parola_in_costruzione" fino al caret
        const left = value.slice(0, caret);
        const m = left.match(/(?:^|\s)@([^\s@]*)$/);
        if (m) {
            setMentionActive(true);
            setMentionQuery(m[1]);
            setMentionStart(caret - m[1].length - 1); // posizione della '@'
            setMentionIndex(0);
        } else {
            setMentionActive(false);
            setMentionQuery("");
            setMentionStart(null);
            setMentionIndex(0);
        }
    };
    const isUuid = (v: unknown): v is string =>
        typeof v === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const insertMention = (user: Utente) => {
        if (mentionStart == null || !inputRef.current) return;
        const el = inputRef.current;
        const caret = el.selectionStart || testo.length;
        const before = testo.slice(0, mentionStart);
        const after = testo.slice(caret);
        const label = "@" + fullName(user);

        // evita duplicati in destinatari
        setDestinatarioIds(prev => (prev.includes(user.id) ? prev : [...prev, user.id]));

        const next = before + label + " " + after; // spazio dopo menzione
        setTesto(next);

        // reset menzione
        setMentionActive(false);
        setMentionQuery("");
        setMentionStart(null);
        setMentionIndex(0);

        // posiziona il cursore alla fine della menzione
        const pos = (before + label + " ").length;
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(pos, pos);
        });
    };

    const removeMentionEverywhere = (userId: string) => {
        const u = assegnatariById.get(userId);
        if (!u) return;
        const name = fullName(u);
        // rimuove tutte le occorrenze di "@Nome Cognome" con eventuale spazio successivo
        const re = new RegExp(`(^|\\s)@${escapeRegex(name)}(?:\\s|\\b)`, "g");
        setTesto(prev =>
            prev
                .replace(re, (_m, p1) => p1) // conserva lo spazio prima
                .replace(/\s{2,}/g, " ")     // compatta spazi multipli
                .trimStart()
        );
    };

    // Invio messaggio — USA commenti + commenti_destinatari
    const handleInvia = async () => {
        const t = testo.trim();
        if (!t) return;

        // Validazione base per evitare 400 "invalid uuid"
        if (!isUuid(taskId)) {
            console.error("taskId non valido:", taskId);
            return;
        }
        if (!isUuid(utenteId)) {
            console.error("utenteId non valido:", utenteId);
            return;
        }
        const parent = parentId && isUuid(parentId) ? parentId : null; // <-- NULL se non valido

        // Pre-check FK: devono esistere davvero in DB
        const [{ data: taskRow }, { data: userRow }] = await Promise.all([
            supabase.from("tasks").select("id").eq("id", taskId).maybeSingle(),
            supabase.from("utenti").select("id").eq("id", utenteId).maybeSingle(),
        ]);
        if (!taskRow) {
            console.error("FK violata: task_id non esiste in tasks:", taskId);
            return;
        }
        if (!userRow) {
            console.error("FK violata: utente_id non esiste in utenti:", utenteId);
            return;
        }

        // INSERT commento
        const { data: inserted, error } = await supabase
            .from("commenti")
            .insert({
                task_id: taskId,
                utente_id: utenteId,
                descrizione: t,
                parent_id: parent,
            })
            .select("id")
            .single();

        if (error) {
            console.error("Insert commento failed:", {
                message: error.message,
                details: (error as any).details,
                hint: (error as any).hint,
                code: error.code,
            });
            return;
        }

        // Destinatari multipli (menzioni) — tracking
        const destinatariValidi = Array.from(new Set(destinatarioIds)).filter(isUuid);

        if (inserted?.id && destinatariValidi.length > 0) {
            const rows = destinatariValidi.map(uid => ({ commento_id: inserted.id, utente_id: uid }));
            const { error: destErr } = await supabase.from("commenti_destinatari").insert(rows);
            if (destErr) {
                console.error("Insert destinatari failed:", destErr);
            }
        }

        // Lista finale destinatari notifica
        const destinatariSet = new Set<string>(destinatariValidi);

        // tutti gli assegnatari della task, escluso autore
        for (const a of assegnatari) {
            if (isUuid(a.id) && a.id !== utenteId) destinatariSet.add(a.id);
        }

        // autore del commento padre (se risposta), escluso autore
        if (parent) {
            const parentComment = mappaById.get(parent);
            const autorePadre = parentComment?.utente?.id;
            if (isUuid(autorePadre) && autorePadre !== utenteId) destinatariSet.add(autorePadre);
        }

        const destinatariNotifica = Array.from(destinatariSet);

        if (inserted?.id && destinatariNotifica.length > 0) {
            await inviaNotifica(
                "commento_task",
                destinatariNotifica,
                t,
                utenteId,
                { task_id: taskId, commento_id: inserted.id, parent_id: parent ?? undefined }
            );
        }

        // Reset UI
        setTesto("");
        setParentId(null);
        setDestinatarioIds([]);
        onNuovoCommento();
        requestAnimationFrame(() => {
            const el = bodyRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        });
        inputRef.current?.focus();
    };

    // Enter invia; Shift+Enter = a capo; frecce/Enter selezionano menzioni
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionActive && mentionSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex(i => (i + 1) % mentionSuggestions.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
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

        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            handleInvia();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setTesto(value);
        const caret = e.target.selectionStart || value.length;
        detectMention(value, caret);
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl sm:max-w-4xl max-h-[80vh] sm:max-h-[75vh] rounded-2xl shadow-xl overflow-hidden flex flex-col bg-theme animate-scale-fade"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 text-white grid place-items-center font-semibold">
                            💬
                        </div>
                        <div className="leading-tight">
                            <div className="font-bold">Commenti</div>
                        </div>
                    </div>
                    <button
                        className="text-gray-500 hover:text-red-500 p-1"
                        onClick={onClose}
                        aria-label="Chiudi"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                {/* Corpo scorribile */}
                <div ref={bodyRef} className="flex-1 overflow-y-auto hide-scrollbar p-3 sm:p-4">
                    {commentiOrdinati.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center mt-8">Nessun messaggio</div>
                    ) : (
                        <div className="space-y-2">
                            {commentiOrdinati.map((c, i) => {
                                const isMio = c.utente?.id === utenteId;
                                const prev = commentiOrdinati[i - 1];
                                const next = commentiOrdinati[i + 1];

                                const showDay = !prev || !sameDay(prev.created_at, c.created_at);
                                const nextSameUser =
                                    next?.utente?.id === c.utente?.id && sameDay(next.created_at, c.created_at);
                                const prevSameUser =
                                    prev?.utente?.id === c.utente?.id && sameDay(prev.created_at, c.created_at);

                                const radiusBase = "rounded-2xl";
                                const radiusMine = [!prevSameUser ? "rounded-tr-md" : "", !nextSameUser ? "rounded-br-md" : ""].join(" ");
                                const radiusOther = [!prevSameUser ? "rounded-tl-md" : "", !nextSameUser ? "rounded-bl-md" : ""].join(" ");

                                const ageMs = Date.now() - new Date(c.created_at).getTime();
                                const justSent = isMio && ageMs < 2000;
                                const ticks = isMio ? (justSent ? "✓" : "✓✓") : "";

                                return (
                                    <div key={c.id} className="w-full">
                                        {showDay && (
                                            <div className="my-3 flex items-center gap-3">
                                                <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
                                                <div className="text-[11px] text-gray-600 dark:text-gray-400">
                                                    {formatDay(c.created_at)}
                                                </div>
                                                <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
                                            </div>
                                        )}

                                        <div className={`w-full flex ${isMio ? "justify-end" : "justify-start"} items-end gap-2`}>
                                            {/* Avatar SEMPRE visibile per i messaggi non miei */}
                                            {!isMio && (
                                                <div
                                                    className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold
                                                               bg-emerald-600/90 text-white shadow-sm select-none"
                                                    title={`${c.utente?.nome || ""} ${c.utente?.cognome || ""}`}
                                                >
                                                    {getInitials(c.utente?.nome, c.utente?.cognome)}
                                                </div>
                                            )}

                                            <div
                                                className={[
                                                    "max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-2.5 shadow",
                                                    radiusBase,
                                                    isMio ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-zinc-800 text-theme",
                                                    isMio ? radiusMine : radiusOther
                                                ].join(" ")}
                                            >
                                                {/* quote */}
                                                {c.parent_id && renderQuoted(mappaById.get(c.parent_id))}

                                                {/* testo */}
                                                <div className="whitespace-pre-line break-words">
                                                    {c.descrizione}
                                                </div>

                                                {/* meta + spunte + rispondi */}
                                                <div
                                                    className={[
                                                        "mt-1.5 text-[11px] opacity-80 flex items-center gap-3",
                                                        isMio ? "justify-end" : "justify-start"
                                                    ].join(" ")}
                                                >
                                                    <span>
                                                        {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>

                                                    {isMio ? (
                                                        <span
                                                            className={`select-none ${justSent ? "opacity-70" : "opacity-100"} ${justSent ? "" : "font-semibold"}`}
                                                            title={justSent ? "Inviato" : "Consegnato (simulato)"}
                                                        >
                                                            {ticks}
                                                        </span>
                                                    ) : null}

                                                    <button
                                                        className={`ml-1 text-[11px] ${isMio ? "text-white/90" : "text-emerald-700 dark:text-emerald-300"} hover:underline`}
                                                        onClick={() => {
                                                            setParentId(c.id);
                                                            requestAnimationFrame(() => {
                                                                const el = bodyRef.current;
                                                                if (el) el.scrollTop = el.scrollHeight;
                                                            });
                                                            inputRef.current?.focus();
                                                        }}
                                                        title="Rispondi"
                                                    >
                                                        <FontAwesomeIcon icon={faReply} className="mr-1" />
                                                        Rispondi
                                                    </button>
                                                </div>

                                                {/* ✅ DESTINATARI MENZIONATI (se presenti) */}
                                                {Array.isArray(c.destinatari) && c.destinatari.length > 0 && (
                                                    <div className={`mt-1.5 flex flex-wrap gap-1 text-[11px] ${isMio ? "justify-end" : "justify-start"}`}>
                                                        {c.destinatari.map(d => (
                                                            <span
                                                                key={d.id}
                                                                className={`px-2 py-0.5 rounded-full border ${isMio
                                                                    ? "bg-white/10 border-white/20 text-white"
                                                                    : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
                                                                    }`}
                                                            >
                                                                A: {d.nome} {d.cognome || ""}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer input */}
                <div className="border-top border-gray-300 dark:border-gray-700 p-2 sm:p-3 bg-theme">
                    {parentId && (() => {
                        const parent = mappaById.get(parentId || "");
                        return parent ? (
                            <div className="mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
                                <div className="text-xs text-emerald-800 dark:text-emerald-200">
                                    Rispondendo a <strong>{parent.utente?.nome} {parent.utente?.cognome || ""}</strong>
                                </div>
                                <div className="whitespace-pre-line text-[13px] mt-1">
                                    {isExpanded(parent.id) ? parent.descrizione : tronca(parent.descrizione || "")}
                                    {(parent.descrizione?.length || 0) > PREVIEW_LEN && (
                                        <button
                                            className="ml-2 text-[12px] text-emerald-600 hover:underline"
                                            onClick={() => toggleExpanded(parent.id)}
                                        >
                                            {isExpanded(parent.id) ? "Comprimi" : "Mostra tutto"}
                                        </button>
                                    )}
                                </div>
                                <button
                                    className="text-xs text-red-600 hover:underline mt-1"
                                    onClick={() => setParentId(null)}
                                >
                                    Annulla risposta
                                </button>
                            </div>
                        ) : null;
                    })()}

                    {/* Pill destinatari multipli (da input) */}
                    {destinatarioIds.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {destinatarioIds.map(id => {
                                const u = assegnatariById.get(id);
                                if (!u) return null;
                                return (
                                    <div key={id} className="flex items-center gap-2">
                                        <div className="text-[12px] px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                                            A: {fullName(u)}
                                        </div>
                                        <button
                                            className="text-[12px] text-red-600 hover:underline flex items-center gap-1"
                                            onClick={() => {
                                                setDestinatarioIds(prev => prev.filter(x => x !== id));
                                                removeMentionEverywhere(id);
                                            }}
                                            title={`Rimuovi ${fullName(u)}`}
                                        >
                                            <FontAwesomeIcon icon={faXmark} />
                                            Rimuovi
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="relative">
                        <div className="flex items-end gap-2">
                            {/* azioni sinistra */}
                            <button
                                type="button"
                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
                                title="Emoji"
                                onClick={() => inputRef.current?.focus()}
                            >
                                <FontAwesomeIcon icon={faSmile} />
                            </button>
                            <button
                                type="button"
                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
                                title="Allega"
                                onClick={() => inputRef.current?.focus()}
                            >
                                <FontAwesomeIcon icon={faPaperclip} />
                            </button>

                            {/* input con mentions */}
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={testo}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder='Scrivi — usa @nome per menzionare (multi)'
                                    className="w-full px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-700 bg-theme text-theme text-base resize-none focus:outline-none hide-scrollbar"
                                    rows={1}
                                />

                                {/* menu menzioni */}
                                {mentionActive && mentionSuggestions.length > 0 && (
                                    <div className="absolute left-2 bottom-full mb-2 max-h-56 overflow-auto rounded-xl border border-gray-300 dark:border-gray-700 bg-theme shadow-lg w-72 z-10">
                                        {mentionSuggestions.map((u, idx) => {
                                            const active = idx === mentionIndex;
                                            const already = destinatarioIds.includes(u.id);
                                            return (
                                                <button
                                                    type="button"
                                                    key={u.id}
                                                    onMouseDown={(e) => { e.preventDefault(); }}
                                                    onClick={() => insertMention(u)}
                                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${active ? "bg-emerald-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"
                                                        }`}
                                                >
                                                    <div className={`h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold ${active ? "bg-white/20 text-white" : "bg-emerald-600/90 text-white"}`}>
                                                        {getInitials(u.nome, u.cognome)}
                                                    </div>
                                                    <span>@{fullName(u)}</span>
                                                    {already && <span className="ml-auto text-[11px] opacity-80">già aggiunto</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* invio */}
                            <button
                                onClick={handleInvia}
                                className={`p-3 rounded-full transition ${testo.trim()
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-gray-300 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                                    }`}
                                aria-label="Invia"
                                disabled={!testo.trim()}
                            >
                                <FontAwesomeIcon icon={faPaperPlane} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
