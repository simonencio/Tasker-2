// src/components/ChatCommentiModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faPaperPlane, faPaperclip, faSmile, faXmark } from "@fortawesome/free-solid-svg-icons";
import "emoji-picker-element";

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
    utentiProgetto: Utente[];     // platea = utenti del progetto
    onClose: () => void;
    onNuovoCommento: () => void;
};

/** Rileva device con input “nativo” (evita falsi positivi sui 2-in-1) */
function usePreferNativeEmoji() {
    const [prefer, setPrefer] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const coarse = window.matchMedia("(any-pointer: coarse)");
        const noHover = window.matchMedia("(any-hover: none)");
        const update = () => setPrefer(coarse.matches && noHover.matches);
        update();
        coarse.addEventListener?.("change", update);
        noHover.addEventListener?.("change", update);
        return () => {
            coarse.removeEventListener?.("change", update);
            noHover.removeEventListener?.("change", update);
        };
    }, []);
    return prefer;
}

/** Small screen detector (default: < 1024px) */
function useIsSmallScreen(maxWidthPx = 1024) {
    const [small, setSmall] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia(`(max-width: ${maxWidthPx - 1}px)`);
        const update = () => setSmall(mq.matches);
        update();
        mq.addEventListener?.("change", update);
        return () => mq.removeEventListener?.("change", update);
    }, [maxWidthPx]);
    return small;
}

export default function ChatCommentiModal({
    commenti,
    utenteId,
    taskId,
    utentiProgetto,
    onClose,
    onNuovoCommento,
}: Props) {
    const [testo, setTesto] = useState("");
    const [parentId, setParentId] = useState<string | null>(null);

    // Emoji picker
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const pickerRef = useRef<any>(null);
    const preferNativeEmoji = usePreferNativeEmoji();
    const isSmallScreen = useIsSmallScreen(1024);
    const hideEmojiUI = preferNativeEmoji && isSmallScreen;

    useEffect(() => {
        if (hideEmojiUI && showEmojiPicker) setShowEmojiPicker(false);
    }, [hideEmojiUI, showEmojiPicker]);

    // Input/mentions
    const [destinatarioIds, setDestinatarioIds] = useState<string[]>([]);
    const utentiById = useMemo(() => new Map(utentiProgetto.map((u) => [u.id, u])), [utentiProgetto]);

    const [expandedAnteprime, setExpandedAnteprime] = useState<Record<string, boolean>>({});
    const isExpanded = (id?: string | null) => !!(id && expandedAnteprime[id!]);
    const toggleExpanded = (id?: string | null) => id && setExpandedAnteprime((p) => ({ ...p, [id]: !p[id] }));

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [mentionActive, setMentionActive] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    // FILES (allegati)
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [filesSelezionati, setFilesSelezionati] = useState<File[]>([]);

    // Suggestions = utenti del progetto
    const mentionSuggestions = useMemo(
        () => (mentionActive ? buildMentionSuggestions(utentiProgetto, mentionQuery) : []),
        [mentionActive, mentionQuery, utentiProgetto]
    );

    const bodyRef = useRef<HTMLDivElement | null>(null);
    useAutoScroll(bodyRef, commenti.length);
    useAutosize(inputRef, testo);

    const commentiEnriched = useMemo(
        () => computeCommentiEnriched(commenti, utentiById),
        [commenti, utentiById]
    );
    const commentiOrdinati = useMemo(() => sortCommentiByDate(commentiEnriched), [commentiEnriched]);
    const mappaById = useMemo(() => new Map(commentiEnriched.map((c) => [c.id, c])), [commentiEnriched]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

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

    // Upload allegati (Storage -> metadati -> link)
    async function uploadAllegatiPerCommento(opts: {
        files: File[];
        taskId: string;
        commentoId: string;
        utenteId: string;
    }) {
        const { files, taskId, commentoId, utenteId } = opts;
        for (const f of files) {
            const key = `${crypto.randomUUID()}_${f.name.replace(/\s+/g, "_")}`;
            const storage_path = `task/${taskId}/commento/${commentoId}/${key}`;

            // 1) upload binario nello Storage
            const up = await supabase.storage.from("allegati").upload(storage_path, f, { upsert: false });
            if (up.error) throw up.error;

            // 2) metadati in public.allegati
            const meta = await supabase
                .from("allegati")
                .insert({
                    bucket: "allegati",
                    storage_path,
                    file_name: f.name,
                    mime_type: f.type || "application/octet-stream",
                    byte_size: f.size,
                    uploaded_by: utenteId,
                })
                .select("id")
                .single();
            if (meta.error) throw meta.error;

            // 3) link al commento
            const link = await supabase
                .from("commenti_allegati")
                .insert({ commento_id: commentoId, allegato_id: meta.data.id });
            if (link.error) throw link.error;
        }
    }

    const handleInvia = async () => {
        const t = testo.trim();
        if (!t && filesSelezionati.length === 0) return; // niente testo e nessun file => non inviare
        if (!isUuid(taskId) || !isUuid(utenteId)) return;

        const parent = parentId && isUuid(parentId) ? parentId : null;
        const ok = await validateFK(supabase, taskId, utenteId);
        if (!ok) return;

        // Se non c'è testo ma ci sono file, creiamo un commento "vuoto" con un carattere invisibile per coerenza (o stringa vuota, se il tuo DB lo consente)
        const descr = t || " ";

        const commentoId = await insertCommento(supabase, { taskId, utenteId, descrizione: descr, parentId: parent });
        if (!commentoId) return;

        const menzionatiValidi = destinatarioIds.filter(isUuid);
        await insertDestinatari(supabase, commentoId, menzionatiValidi);

        // Upload allegati se presenti
        if (filesSelezionati.length > 0) {
            try {
                await uploadAllegatiPerCommento({
                    files: filesSelezionati,
                    taskId,
                    commentoId,
                    utenteId,
                });
            } catch (err) {
                console.error("Upload allegati fallito:", err);
                // puoi mostrare un toast qui
            }
        }

        // Platea = utenti progetto (come deciso)
        const destinatariNotifica = computeDestinatariNotifica({
            assegnatari: utentiProgetto,
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

        // reset UI
        setTesto("");
        setParentId(null);
        setDestinatarioIds([]);
        setFilesSelezionati([]);
        onNuovoCommento();

        // chiudi la textarea se si era allungata
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
    };

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

    // Gestione click su emoji del web component
    useEffect(() => {
        const el = pickerRef.current as HTMLElement | null;
        if (!el) return;
        const onClick = (e: any) => {
            const unicode = e?.detail?.unicode;
            if (!unicode) return;
            setTesto((prev) => prev + unicode);
            setShowEmojiPicker(false);
            requestAnimationFrame(() => inputRef.current?.focus());
        };
        el.addEventListener("emoji-click", onClick);
        return () => el.removeEventListener("emoji-click", onClick);
    }, [pickerRef]);

    return (
        <div
            className="
        fixed inset-0 bg-black/40
        flex justify-center items-center
        z-50
        px-4 xs:px-5 sm:px-8 md:px-12 lg:px-16
        py-2
        overflow-y-auto
      "
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="
          w-full mx-auto
          max-w-full xs:max-w-xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl
          max-h-[70vh]
          rounded-2xl shadow-xl overflow-hidden flex flex-col
          modal-container animate-scale-fade
          bg-theme text-theme
        "
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full grid place-items-center font-semibold bg-chat-icon text-sm sm:text-base">
                            💬
                        </div>
                        <div className="leading-tight">
                            <div className="font-bold text-base sm:text-lg md:text-xl text-theme">Commenti</div>
                        </div>
                    </div>
                    <button
                        className="p-1.5 sm:p-2 icon-color hover-bg-theme rounded-md"
                        onClick={onClose}
                        aria-label="Chiudi finestra commenti"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-lg sm:text-xl" />
                    </button>
                </div>

                <div className="h-px w-full bg-black/10" />

                {/* Corpo */}
                <div
                    ref={bodyRef}
                    className="
            flex-1 overflow-y-auto hide-scrollbar
            p-2.5 sm:p-4
            bg-theme text-theme
            text-[13px] sm:text-sm md:text-[15px]
            overscroll-contain
          "
                >
                    {commentiOrdinati.length === 0 ? (
                        <div className="text-sm sm:text-base opacity-70 text-center mt-6 sm:mt-8">Nessun messaggio</div>
                    ) : (
                        <div className="space-y-1.5 sm:space-y-2">
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

                                        <div className={`w-full flex ${isMio ? "justify-end" : "justify-start"} items-end gap-1.5 sm:gap-2`}>
                                            {!isMio && (
                                                <div className="flex flex-col items-center max-w-[60px]">
                                                    <Avatar u={c.utente || undefined} />
                                                    <span className="text-[10px] sm:text-xs mt-0.5 truncate text-center w-full">
                                                        {c.utente ? `${c.utente.nome} ${c.utente.cognome || ""}` : ""}
                                                    </span>
                                                </div>
                                            )}

                                            <div
                                                className={[
                                                    "max-w-[92%] xs:max-w-[88%] sm:max-w-[76%] md:max-w-[70%] lg:max-w-[60%]",
                                                    "px-3 sm:px-4 py-2.5 shadow",
                                                    radiusBase,
                                                    isMio ? "bg-bolla-mio" : "bg-theme text-theme border border-black/10",
                                                    isMio ? radiusMine : radiusOther,
                                                ].join(" ")}
                                            >
                                                {c.parent_id && (
                                                    <ReplyPreview
                                                        parent={mappaById.get(c.parent_id)}
                                                        expanded={isExpanded(c.parent_id)}
                                                        onToggle={() => toggleExpanded(c.parent_id)}
                                                    />
                                                )}
                                                <div className="whitespace-pre-line break-words leading-relaxed">{c.descrizione}</div>

                                                {/* Allegati: lista semplice, lazy signed url */}
                                                <AllegatiList commentoId={c.id} />

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

                                                {Array.isArray(c.destinatari) && c.destinatari.length > 0 && (
                                                    <div className={`mt-1.5 flex flex-wrap gap-1 text-[11px] sm:text-xs ${isMio ? "justify-end" : "justify-start"}`}>
                                                        {c.destinatari.map((d) => (
                                                            <span
                                                                key={d.id}
                                                                className={isMio ? "badge-dest-mio px-2 py-0.5 rounded-full" : "badge-dest-altri px-2 py-0.5 rounded-full"}
                                                            >
                                                                A: {d.nome} {d.cognome || ""}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {isMio && (
                                                <div className="flex flex-col items-center max-w-[60px]">
                                                    <Avatar u={c.utente || undefined} />
                                                    <span className="text-[10px] sm:text-xs mt-0.5 truncate text-center w-full">
                                                        {c.utente ? `${c.utente.nome} ${c.utente.cognome || ""}` : ""}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="h-px w-full bg-black/10" />

                {/* Footer */}
                <div className="p-2 sm:p-3 bg-theme text-theme">
                    {parentId &&
                        (() => {
                            const parent = mappaById.get(parentId || "");
                            return parent ? (
                                <div className="mb-2 px-3 py-2 rounded-xl bg-quote max-w-full min-w-0 overflow-hidden">
                                    <div className="text-xs sm:text-sm text-quote truncate">
                                        Rispondendo a <strong>{parent.utente?.nome} {parent.utente?.cognome || ""}</strong>
                                    </div>

                                    <div
                                        className={`whitespace-pre-wrap break-words break-all text-xs sm:text-sm mt-1 overflow-hidden ${isExpanded(parent.id) ? "max-h-20 overflow-y-auto hide-scrollbar" : ""
                                            }`}
                                    >
                                        {isExpanded(parent.id) ? parent.descrizione : tronca(parent.descrizione || "")}
                                        {(parent.descrizione?.length || 0) > PREVIEW_LEN && (
                                            <button
                                                className="ml-2 text-[11px] sm:text-xs link-quote align-baseline"
                                                onClick={() => toggleExpanded(parent.id)}
                                            >
                                                {isExpanded(parent.id) ? "Comprimi" : "Mostra tutto"}
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        className="text-xs sm:text-sm text-red-600 hover:underline mt-1"
                                        onClick={() => setParentId(null)}
                                    >
                                        Annulla risposta
                                    </button>
                                </div>
                            ) : null;
                        })()}

                    {destinatarioIds.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {destinatarioIds.map((id) => {
                                const u = utentiById.get(id);
                                if (!u) return null;
                                return (
                                    <div key={id} className="flex items-center gap-1.5 sm:gap-2">
                                        <div className="text-[11px] sm:text-xs px-2 py-1 rounded-full badge-dest-multiplo">
                                            A: {fullName(u)}
                                        </div>
                                        <button
                                            className="text-[11px] sm:text-xs text-red-600 hover:underline flex items-center gap-1"
                                            onClick={() => {
                                                setDestinatarioIds((prev) => prev.filter((x) => x !== id));
                                                setTesto((prev) => removeMentionEverywhere(prev, u));
                                            }}
                                            title={`Rimuovi ${fullName(u)}`}
                                        >
                                            <FontAwesomeIcon icon={faXmark} className="text-base sm:text-lg align-middle" />
                                            Rimuovi
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* FILE INPUT HIDDEN */}
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            const list = Array.from(e.target.files || []);
                            if (list.length) setFilesSelezionati((prev) => [...prev, ...list]);
                            e.currentTarget.value = "";
                        }}
                    />

                    {/* Chips anteprima allegati */}
                    {filesSelezionati.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {filesSelezionati.map((f, i) => (
                                <div key={i} className="px-2 py-1 rounded-full text-xs bg-black/5 dark:bg-white/10 flex items-center gap-2">
                                    <span className="truncate max-w-[160px]">{f.name}</span>
                                    <button
                                        className="opacity-70 hover:opacity-100"
                                        onClick={() => setFilesSelezionati((prev) => prev.filter((_, idx) => idx !== i))}
                                        title="Rimuovi"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <div className="flex items-center justify-between min-w-0 overflow-hidden flex-nowrap gap-2">
                            {/* Input */}
                            <div className="flex-1 min-w-0">
                                <textarea
                                    ref={inputRef}
                                    value={testo}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Scrivi"
                                    className="
                    block w-full max-w-full
                    input-style resize-none hide-scrollbar
                    text-[13px] sm:text-[14px] leading-[1.15]
                    py-0.5 sm:py-1
                    min-h-0 max-h-[120px]
                  "
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

                            {/* Icone */}
                            <div className="flex items-center shrink-0">
                                {/* Emoji */}
                                {!hideEmojiUI && (
                                    <>
                                        <button
                                            type="button"
                                            className="p-0 m-0 mr-1.5 sm:mr-2 bg-transparent border-0 inline-flex items-center justify-center"
                                            title="Emoji"
                                            aria-label="Emoji"
                                            onClick={() => setShowEmojiPicker((v) => !v)}
                                        >
                                            <FontAwesomeIcon icon={faSmile} className="text-base sm:text-lg cursor-pointer hover:opacity-80" />
                                        </button>

                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full right-10 mb-2 z-50">
                                                {/* @ts-ignore: custom element */}
                                                <emoji-picker ref={pickerRef} class="max-h-[360px] overflow-auto"></emoji-picker>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Allega */}
                                <button
                                    type="button"
                                    className="p-0 m-0 mr-1.5 sm:mr-2 bg-transparent border-0 inline-flex items-center justify-center"
                                    title="Allega"
                                    aria-label="Allega"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <FontAwesomeIcon icon={faPaperclip} className="text-base sm:text-lg cursor-pointer hover:opacity-80" />
                                </button>

                                {/* Invia */}
                                <button
                                    onClick={handleInvia}
                                    className={`p-0 m-0 bg-transparent border-0 inline-flex items-center justify-center ${(testo.trim() || filesSelezionati.length > 0) ? "" : "opacity-50 cursor-not-allowed"}`}
                                    aria-label="Invia"
                                    disabled={!testo.trim() && filesSelezionati.length === 0}
                                >
                                    <FontAwesomeIcon icon={faPaperPlane} className="text-base sm:text-lg cursor-pointer hover:opacity-80" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Lista allegati per commento (signed URL alla pressione) */
function AllegatiList({ commentoId }: { commentoId: string }) {
    const [files, setFiles] = useState<Array<{
        commento_id: string;
        allegato_id: string;
        file_name: string;
        mime_type: string;
        byte_size: number;
        bucket: string;
        storage_path: string;
        uploaded_by: string;
        created_at: string;
    }>>([]);

    useEffect(() => {
        let alive = true;
        (async () => {
            const q = await supabase
                .from("v_commenti_allegati")
                .select("*")
                .eq("commento_id", commentoId)
                .order("created_at", { ascending: true });
            if (!q.error && alive) setFiles(q.data || []);
        })();
        return () => { alive = false; };
    }, [commentoId]);

    if (files.length === 0) return null;

    return (
        <div className="mt-2 flex flex-col gap-1">
            {files.map((f) => (
                <button
                    key={f.allegato_id}
                    className="text-[12px] sm:text-[13px] md:text-sm underline hover:opacity-80 text-theme text-left"
                    onClick={async () => {
                        const { data, error } = await supabase.storage
                            .from("allegati")
                            .createSignedUrl(f.storage_path, 600);
                        if (!error && data?.signedUrl) {
                            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                        }
                    }}
                    title={`${f.file_name} (${Math.round(f.byte_size / 1024)} KB)`}
                >
                    📎 {f.file_name}
                </button>
            ))}
        </div>
    );
}
