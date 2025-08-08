// src/components/ChatCommentiModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faPaperPlane, faPaperclip, faSmile, faXmark } from "@fortawesome/free-solid-svg-icons";

import {
    PREVIEW_LEN,
    fullName,
    sameDay,
    tronca,
    isUuid,
    detectMention,
    buildMentionSuggestions,
    removeMentionEverywhere,
    computeCommentiEnriched,
    sortCommentiByDate,
    validateFK,
    insertCommento,
    insertDestinatari,
    computeDestinatariNotifica,
    type Commento,
    type Utente,
} from "../supporto/chatCommentiUtils";

import {
    useAutosize,
    useAutoScroll,
    DayDivider,
    Avatar,
    ReplyPreview,
    MentionMenu,
    MessageMeta,
} from "./ChatCommentiParts";

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
    onNuovoCommento,
}: Props) {
    const [testo, setTesto] = useState("");
    const [parentId, setParentId] = useState<string | null>(null);

    // ✅ Multi-destinatari (menzioni)
    const [destinatarioIds, setDestinatarioIds] = useState<string[]>([]);
    const assegnatariById = useMemo(() => new Map(assegnatari.map((a) => [a.id, a])), [assegnatari]);

    // Stato "mostra tutto/comprimi" per le quote
    const [expandedAnteprime, setExpandedAnteprime] = useState<Record<string, boolean>>({});
    const isExpanded = (id?: string | null) => !!(id && expandedAnteprime[id!]);
    const toggleExpanded = (id?: string | null) => id && setExpandedAnteprime((p) => ({ ...p, [id]: !p[id] }));

    // Menzioni @
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [mentionActive, setMentionActive] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    const mentionSuggestions = useMemo(
        () => (mentionActive ? buildMentionSuggestions(assegnatari, mentionQuery) : []),
        [mentionActive, mentionQuery, assegnatari]
    );

    // refs per autoscroll
    const bodyRef = useRef<HTMLDivElement | null>(null);
    useAutoScroll(bodyRef, commenti.length);
    useAutosize(inputRef, testo);

    // ordinamento e lookup commenti
    const commentiEnriched = useMemo(
        () => computeCommentiEnriched(commenti, assegnatariById),
        [commenti, assegnatariById]
    );
    const commentiOrdinati = useMemo(() => sortCommentiByDate(commentiEnriched), [commentiEnriched]);
    const mappaById = useMemo(() => new Map(commentiEnriched.map((c) => [c.id, c])), [commentiEnriched]);

    // chiudi con ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // ——— mention detect
    const handleDetectMention = (value: string, caret: number) => {
        const { active, query, start } = detectMention(value, caret);
        setMentionActive(active);
        setMentionQuery(query);
        setMentionStart(start);
        if (!active) setMentionIndex(0);
    };

    const insertMention = (user: Utente) => {
        if (mentionStart == null || !inputRef.current) return;
        const el = inputRef.current;
        const caret = el.selectionStart || testo.length;
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
    };

    const handleInvia = async () => {
        const t = testo.trim();
        if (!t) return;
        if (!isUuid(taskId) || !isUuid(utenteId)) return;

        const parent = parentId && isUuid(parentId) ? parentId : null;
        const ok = await validateFK(supabase, taskId, utenteId);
        if (!ok) return;

        const commentoId = await insertCommento(supabase, { taskId, utenteId, descrizione: t, parentId: parent });
        if (!commentoId) return;

        const menzionatiValidi = destinatarioIds.filter(isUuid);
        await insertDestinatari(supabase, commentoId, menzionatiValidi);

        const destinatariNotifica = computeDestinatariNotifica({
            assegnatari,
            utenteId,
            parentId: parent,
            mappaById,
            menzionati: menzionatiValidi,
        });

        if (destinatariNotifica.length > 0) {
            await inviaNotifica("commento_task", destinatariNotifica, t, utenteId, {
                task_id: taskId,
                commento_id: commentoId,
                parent_id: parent ?? undefined,
            });
        }

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
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            handleInvia();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setTesto(value);
        const caret = e.target.selectionStart || value.length;
        handleDetectMention(value, caret);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
            <div
                className="w-full max-w-3xl sm:max-w-4xl max-h-[80vh] sm:max-h-[75vh] rounded-2xl shadow-xl overflow-hidden flex flex-col bg-theme animate-scale-fade"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 text-white grid place-items-center font-semibold">💬</div>
                        <div className="leading-tight"><div className="font-bold">Commenti</div></div>
                    </div>
                    <button className="text-gray-500 hover:text-red-500 p-1" onClick={onClose} aria-label="Chiudi">
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                {/* Corpo */}
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
                                const nextSameUser = next?.utente?.id === c.utente?.id && sameDay(next.created_at, c.created_at);
                                const prevSameUser = prev?.utente?.id === c.utente?.id && sameDay(prev.created_at, c.created_at);

                                const radiusBase = "rounded-2xl";
                                const radiusMine = [!prevSameUser ? "rounded-tr-md" : "", !nextSameUser ? "rounded-br-md" : ""].join(" ");
                                const radiusOther = [!prevSameUser ? "rounded-tl-md" : "", !nextSameUser ? "rounded-bl-md" : ""].join(" ");

                                const ageMs = Date.now() - new Date(c.created_at).getTime();
                                const justSent = isMio && ageMs < 2000;
                                const ticks = isMio ? (justSent ? "✓" : "✓✓") : "";

                                return (
                                    <div key={c.id} className="w-full">
                                        {showDay && <DayDivider iso={c.created_at} />}

                                        <div className={`w-full flex ${isMio ? "justify-end" : "justify-start"} items-end gap-2`}>
                                            {/* Avatar sinistra (non mio) */}
                                            {!isMio && <Avatar u={c.utente || undefined} />}

                                            {/* Bolla */}
                                            <div
                                                className={[
                                                    "max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-2.5 shadow",
                                                    radiusBase,
                                                    isMio ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-zinc-800 text-theme",
                                                    isMio ? radiusMine : radiusOther,
                                                ].join(" ")}
                                            >
                                                {/* quote */}
                                                {c.parent_id && (
                                                    <ReplyPreview
                                                        parent={mappaById.get(c.parent_id)}
                                                        expanded={isExpanded(c.parent_id)}
                                                        onToggle={() => toggleExpanded(c.parent_id)}
                                                    />
                                                )}

                                                {/* testo */}
                                                <div className="whitespace-pre-line break-words">{c.descrizione}</div>

                                                {/* meta */}
                                                <MessageMeta
                                                    created_at={c.created_at}
                                                    isMine={isMio}
                                                    justSent={justSent}
                                                    ticks={ticks}
                                                    onReply={() => {
                                                        setParentId(c.id);
                                                        requestAnimationFrame(() => {
                                                            const el = bodyRef.current;
                                                            if (el) el.scrollTop = el.scrollHeight;
                                                        });
                                                        inputRef.current?.focus();
                                                    }}
                                                />

                                                {/* destinatari */}
                                                {Array.isArray(c.destinatari) && c.destinatari.length > 0 && (
                                                    <div className={`mt-1.5 flex flex-wrap gap-1 text-[11px] ${isMio ? "justify-end" : "justify-start"}`}>
                                                        {c.destinatari.map((d) => (
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

                                            {/* Avatar destra (mio) */}
                                            {isMio && <Avatar u={c.utente || undefined} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer input */}
                <div className="border-top border-gray-300 dark:border-gray-700 p-2 sm:p-3 bg-theme">
                    {parentId &&
                        (() => {
                            const parent = mappaById.get(parentId || "");
                            return parent ? (
                                <div className="mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
                                    <div className="text-xs text-emerald-800 dark:text-emerald-200">
                                        Rispondendo a <strong>{parent.utente?.nome} {parent.utente?.cognome || ""}</strong>
                                    </div>
                                    <div className="whitespace-pre-line text-[13px] mt-1">
                                        {isExpanded(parent.id) ? parent.descrizione : tronca(parent.descrizione || "")}
                                        {(parent.descrizione?.length || 0) > PREVIEW_LEN && (
                                            <button className="ml-2 text-[12px] text-emerald-600 hover:underline" onClick={() => toggleExpanded(parent.id)}>
                                                {isExpanded(parent.id) ? "Comprimi" : "Mostra tutto"}
                                            </button>
                                        )}
                                    </div>
                                    <button className="text-xs text-red-600 hover:underline mt-1" onClick={() => setParentId(null)}>
                                        Annulla risposta
                                    </button>
                                </div>
                            ) : null;
                        })()}

                    {/* Pill destinatari multipli */}
                    {destinatarioIds.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {destinatarioIds.map((id) => {
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
                                                setDestinatarioIds((prev) => prev.filter((x) => x !== id));
                                                setTesto((prev) => removeMentionEverywhere(prev, u));
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
                                    placeholder="Scrivi — usa @nome per menzionare (multi)"
                                    className="w-full px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-700 bg-theme text-theme text-base resize-none focus:outline-none hide-scrollbar"
                                    rows={1}
                                />
                                <MentionMenu
                                    visible={mentionActive}
                                    suggestions={mentionSuggestions}
                                    activeIndex={mentionIndex}
                                    alreadyHas={(id) => destinatarioIds.includes(id)}
                                    onPick={insertMention}
                                />
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
