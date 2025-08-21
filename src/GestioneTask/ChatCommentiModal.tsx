// src/components/ChatCommentiModal.tsx

import { sameDay, useAutosize, useAutoScroll, formatDay, urlForAvatar, getInitials, PREVIEW_LEN, tronca, fullName, } from "./useChatCommenti";

import { useChatCommenti } from "./useChatCommenti";
import type { Commento, Props, Utente } from "./tipi";
// src/components/ChatCommentiModal.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faPaperPlane, faXmark, faReply, faFolderOpen } from "@fortawesome/free-solid-svg-icons";



/* ---------------------------------------------------------------------------------------
   Modale Chat Commenti – UI “slim” con logica delegata all’hook
--------------------------------------------------------------------------------------- */
export default function ChatCommentiModal({
    commenti,
    utenteId,
    taskId,
    utentiProgetto,
    onClose,
    onNuovoCommento,
}: Props) {
    // Hook: tutta la logica è qui
    const {
        testo, inputRef, bodyRef,
        parentId, setParentId,
        destinatarioIds,
        mentionActive, mentionSuggestions, mentionIndex, setMentionIndex, insertMention,
        isExpanded, toggleExpanded,
        commentiOrdinati, mappaById, utentiById,
        handleChange, handleKeyDown, handleInvia, canSend, removeDestinatario,
        troncaSafeGraphemes, cx, fullName, PREVIEW_LEN,
    } = useChatCommenti({ commenti, utentiProgetto, utenteId, taskId, onNuovoCommento, onClose });

    // Auto-scroll elenco e auto-size textarea (solo UI)
    useAutoScroll(bodyRef, commenti.length);
    useAutosize(inputRef, testo);

    // Evita chiusura cliccando sul backdrop interno
    const stop = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4 xs:px-5 sm:px-8 md:px-12 lg:px-16 py-2 overflow-y-auto"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full mx-auto max-w-full xs:max-w-xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[70vh] rounded-2xl shadow-xl overflow-hidden flex flex-col modal-container animate-scale-fade bg-theme text-theme"
                onClick={stop}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full grid place-items-center font-semibold bg-chat-icon text-sm sm:text-base">CM</div>
                        <div className="leading-tight">
                            <div className="font-bold text-base sm:text-lg md:text-xl text-theme">Commenti</div>
                        </div>
                    </div>
                    <button className="p-1.5 sm:p-2 icon-color hover-bg-theme rounded-md" onClick={onClose} aria-label="Chiudi finestra commenti">
                        <FontAwesomeIcon icon={faTimes} className="text-lg sm:text-xl" />
                    </button>
                </div>

                <div className="h-px w-full bg-black/10" />

                {/* Corpo */}
                <div
                    ref={bodyRef}
                    className="flex-1 overflow-y-auto hide-scrollbar p-2.5 sm:p-4 bg-theme text-theme text-[13px] sm:text-sm md:text-[15px] overscroll-contain"
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
                                const radiusMine = cx(!prevSameUser && "rounded-tr-md", !nextSameUser && "rounded-br-md");
                                const radiusOther = cx(!prevSameUser && "rounded-tl-md", !nextSameUser && "rounded-bl-md");

                                const ageMs = Date.now() - new Date(c.created_at).getTime();
                                const justSent = isMio && ageMs < 2000;
                                const ticks = isMio ? (justSent ? "✓" : "✓✓") : "";

                                return (
                                    <div key={c.id} className="w-full">
                                        {showDay && <DayDivider iso={c.created_at} />}

                                        <div className={cx("w-full flex items-end gap-1.5 sm:gap-2", isMio ? "justify-end" : "justify-start")}>
                                            {!isMio && (
                                                <div className="flex flex-col items-center max-w-[60px]">
                                                    <Avatar u={c.utente || undefined} />
                                                    <span className="text-[10px] sm:text-xs mt-0.5 truncate text-center w-full">
                                                        {c.utente ? `${c.utente.nome} ${c.utente.cognome || ""}` : ""}
                                                    </span>
                                                </div>
                                            )}

                                            <div
                                                className={cx(
                                                    "max-w-[92%] xs:max-w-[88%] sm:max-w-[76%] md:max-w-[70%] lg:max-w-[60%]",
                                                    "px-3 sm:px-4 py-2.5 shadow",
                                                    radiusBase,
                                                    isMio ? "bg-bolla-mio" : "bg-theme text-theme border border-black/10",
                                                    isMio ? radiusMine : radiusOther
                                                )}
                                            >
                                                {c.parent_id && (
                                                    <ReplyPreview
                                                        parent={mappaById.get(c.parent_id)}
                                                        expanded={isExpanded(c.parent_id)}
                                                        onToggle={() => toggleExpanded(c.parent_id)}
                                                    />
                                                )}

                                                <div className="whitespace-pre-line break-words leading-relaxed">{c.descrizione}</div>

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
                                                    <div className={cx("mt-1.5 flex flex-wrap gap-1 text-[11px] sm:text-xs", isMio ? "justify-end" : "justify-start")}>
                                                        {c.destinatari.map((d) => (
                                                            <span key={d.id} className={cx("px-2 py-0.5 rounded-full", isMio ? "badge-dest-mio" : "badge-dest-altri")}>
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
                    {/* Barra “Rispondendo a …” */}
                    {parentId && (() => {
                        const parent = mappaById.get(parentId || "");
                        return parent ? (
                            <div className="mb-2 px-3 py-2 rounded-xl bg-quote max-w-full min-w-0 overflow-hidden">
                                <div className="text-xs sm:text-sm text-quote truncate">
                                    Rispondendo a <strong>{parent.utente?.nome} {parent.utente?.cognome || ""}</strong>
                                </div>

                                <div
                                    className={cx(
                                        "whitespace-pre-wrap break-words break-all text-xs sm:text-sm mt-1 overflow-hidden font-emoji",
                                        isExpanded(parent.id) && "max-h-20 overflow-y-auto hide-scrollbar"
                                    )}
                                >
                                    {isExpanded(parent.id) ? parent.descrizione : troncaSafeGraphemes(parent.descrizione || "")}
                                    {(parent.descrizione?.length || 0) > PREVIEW_LEN && (
                                        <button
                                            className="ml-2 text-[11px] sm:text-xs link-quote align-baseline"
                                            onClick={() => toggleExpanded(parent.id)}
                                        >
                                            {isExpanded(parent.id) ? "Comprimi" : "Mostra tutto"}
                                        </button>
                                    )}
                                </div>

                                <button className="text-xs sm:text-sm text-red-600 hover:underline mt-1" onClick={() => setParentId(null)}>
                                    Annulla risposta
                                </button>
                            </div>
                        ) : null;
                    })()}

                    {/* Badge destinatari menzionati */}
                    {destinatarioIds.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {destinatarioIds.map((id) => {
                                const u = utentiById.get(id);
                                if (!u) return null;
                                const nomeCompleto = fullName(u);
                                return (
                                    <div key={id} className="flex items-center gap-1.5 sm:gap-2">
                                        <div className="text-[11px] sm:text-xs px-2 py-1 rounded-full badge-dest-multiplo">A: {nomeCompleto}</div>
                                        <button
                                            className="text-[11px] sm:text-xs text-red-600 hover:underline flex items-center gap-1"
                                            onClick={() => removeDestinatario(u)}
                                            title={`Rimuovi ${nomeCompleto}`}
                                        >
                                            <FontAwesomeIcon icon={faXmark} className="text-base sm:text-lg align-middle" />
                                            Rimuovi
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Input + invio */}
                    <div className="relative">
                        <div className="flex items-center justify-between min-w-0 overflow-hidden flex-nowrap gap-2">
                            {/* Textarea */}
                            <div className="flex-1 min-w-0">
                                <textarea
                                    ref={inputRef}
                                    value={testo}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Scrivi"
                                    className="block w-full max-w-full input-style resize-none hide-scrollbar text-[13px] sm:text-[14px] leading-[1.15] py-0.5 sm:py-1 min-h-0 max-h-[120px] font-emoji"
                                    inputMode="text"
                                    autoComplete="on"
                                    autoCorrect="on"
                                    autoCapitalize="sentences"
                                    enterKeyHint="send"
                                    rows={1}
                                    aria-label="Scrivi un commento"
                                />

                                {/* Menu mentions */}
                                <MentionMenu
                                    visible={mentionActive}
                                    suggestions={mentionSuggestions}
                                    activeIndex={mentionIndex}
                                    alreadyHas={(id) => destinatarioIds.includes(id)}
                                    onPick={insertMention}
                                    onActiveIndexChange={setMentionIndex}
                                />
                            </div>

                            {/* Invia */}
                            {/* Invia + Folder */}
                            <div className="flex items-center shrink-0 gap-2">
                                <button
                                    className="p-0 m-0 bg-transparent border-0 inline-flex items-center justify-center"
                                    aria-label="Apri cartella"
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faFolderOpen} className="text-base sm:text-lg cursor-pointer hover:opacity-80" />
                                </button>

                                <button
                                    onClick={handleInvia}
                                    className={cx("p-0 m-0 bg-transparent border-0 inline-flex items-center justify-center", !canSend && "opacity-50 cursor-not-allowed")}
                                    aria-label="Invia messaggio"
                                    disabled={!canSend}
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


//------------------------------------------------------------------//
//---------------------parti della modale---------------------------//
//------------------------------------------------------------------//
/**
 * Auto-resize della textarea con limite massimo (px).
 * Se il testo è vuoto, la riporta all’altezza minima.
 */

/**
 * Divisore giorno con tipografia e spaziature responsive.
 */
export function DayDivider({ iso }: { iso: string }) {
    return (
        <div className="my-2.5 sm:my-3 md:my-4 flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
            <div className="text-[11px] sm:text-[12px] md:text-sm text-theme opacity-70">
                {formatDay(iso)}
            </div>
            <div className="h-px bg-black/10 dark:bg-white/10 flex-1" />
        </div>
    );
}

/**
 * Avatar con fallback iniziali. Dimensioni responsive di default.
 */
export function Avatar({
    u,
    className = "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9",
}: {
    u?: Utente | null;
    className?: string;
}) {
    const src = urlForAvatar(u?.avatar_url);
    const title = `${u?.nome || ""} ${u?.cognome || ""}`.trim();
    return src ? (
        <img
            src={src}
            alt={title || "Avatar"}
            className={`${className} rounded-full object-cover shadow-sm select-none`}
            title={title}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
        />
    ) : (
        <div
            className={`${className} rounded-full grid place-items-center text-[10px] sm:text-[11px] md:text-sm font-semibold bg-chat-icon text-white shadow-sm select-none`}
            title={title}
        >
            {getInitials(u?.nome, u?.cognome)}
        </div>
    );
}

/**
 * Anteprima risposta (quote) con controlli responsive.
 */
export function ReplyPreview({
    parent,
    expanded,
    onToggle,
}: {
    parent?: Commento | null;
    expanded: boolean;
    onToggle: () => void;
}) {
    if (!parent) return null;
    const full = parent.descrizione || "";
    const showToggle = full.length > PREVIEW_LEN;

    return (
        <div className="mb-2 text-[12px] sm:text-[13px] md:text-sm rounded-xl pl-3 pr-2 py-2 sm:pl-4 sm:pr-3 sm:py-2 bg-quote/90 border-l-[3px] sm:border-l-4">
            <div className="font-semibold mb-1 text-quote leading-tight">
                {parent?.utente?.nome} {parent?.utente?.cognome || ""}
            </div>

            <div
                className={`whitespace-pre-line text-[12px] sm:text-[13px] md:text-sm text-quote leading-relaxed break-words break-all ${expanded ? "max-h-20 overflow-y-auto hide-scrollbar" : ""
                    }`}
            >
                {expanded ? full : tronca(full)}
                {showToggle && (
                    <button
                        type="button"
                        className="ml-2 text-[11px] sm:text-[12px] md:text-sm text-quote hover:underline align-baseline"
                        onClick={onToggle}
                    >
                        {expanded ? "Comprimi" : "Mostra tutto"}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Menu menzioni: posizionamento/dimensioni responsive, scroll e width adattiva.
 * Aggiunta prop opzionale onActiveIndexChange per sincronizzare l’indice attivo (hover).
 */
export function MentionMenu({
    visible,
    suggestions,
    activeIndex,
    alreadyHas,
    onPick,
    onActiveIndexChange, // <-- nuova prop opzionale
}: {
    visible: boolean;
    suggestions: Utente[];
    activeIndex: number;
    alreadyHas: (id: string) => boolean;
    onPick: (u: Utente) => void;
    onActiveIndexChange?: (i: number) => void;
}) {
    if (!visible || suggestions.length === 0) return null;

    return (
        <div className="absolute left-0 sm:left-2 bottom-full mb-2 max-h-56 sm:max-h-64 overflow-auto rounded-xl popup-panel shadow-lg w-[min(88vw,22rem)] sm:w-72 md:w-80 z-10">
            {suggestions.map((u, idx) => {
                const active = idx === activeIndex;
                const already = alreadyHas(u.id);
                const avatar = u.avatar_url && urlForAvatar(u.avatar_url);

                return (
                    <button
                        type="button"
                        key={u.id}
                        onMouseDown={(e) => e.preventDefault()} // evita blur della textarea
                        onMouseEnter={() => onActiveIndexChange?.(idx)} // <-- aggiorna indice attivo
                        onClick={() => !already && onPick(u)}
                        className={`w-full text-left px-3 py-2 text-[12px] sm:text-[13px] md:text-sm flex items-center gap-2 ${active ? "selected-panel" : "hover-bg-theme"
                            }`}
                        title={`Menziona @${fullName(u)}`}
                        disabled={already}
                    >
                        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full overflow-hidden shrink-0">
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt={`${u.nome} ${u.cognome || ""}`}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <div className="h-full w-full grid place-items-center text-[10px] sm:text-[11px] font-semibold bg-chat-icon text-white">
                                    {getInitials(u.nome, u.cognome)}
                                </div>
                            )}
                        </div>

                        <span className="text-theme truncate">@{fullName(u)}</span>

                        {already && (
                            <span className="ml-auto text-[10px] sm:text-[11px] md:text-xs opacity-80">
                                già aggiunto
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Metadati messaggio: orario, ticks simulati e tasto Rispondi.
 * Tipografia/allineamenti responsive. Colori adattivi.
 */
export function MessageMeta({
    created_at,
    isMine,
    justSent,
    ticks,
    onReply,
    replyTint = { mine: "text-white/90", other: "text-quote" },
    timeTint = { mine: "text-white/80", other: "text-theme/70" },
}: {
    created_at: string;
    isMine: boolean;
    justSent: boolean;
    ticks: string;
    onReply: () => void;
    replyTint?: { mine: string; other: string };
    timeTint?: { mine: string; other: string };
}) {
    const time = new Date(created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div
            className={[
                "mt-1.5 text-[11px] sm:text-[12px] md:text-[13px] opacity-80 flex items-center gap-2.5 sm:gap-3",
                isMine ? "justify-end" : "justify-start",
            ].join(" ")}
        >
            <button
                className={`ml-1 text-[11px] sm:text-[12px] md:text-[13px] ${isMine ? replyTint.mine : replyTint.other
                    } hover:underline inline-flex items-center gap-1`}
                onClick={onReply}
                title="Rispondi"
            >
                <FontAwesomeIcon icon={faReply} className="text-[11px] sm:text-[12px] md:text-sm" />
                <span>Rispondi</span>
            </button>

            <span className={`tabular-nums ${isMine ? timeTint.mine : timeTint.other}`}>
                {time}
            </span>

            {isMine ? (
                <span
                    className={`select-none tabular-nums ${justSent ? "opacity-70" : "opacity-100"
                        } ${justSent ? "" : "font-semibold"}`}
                    title={justSent ? "Inviato" : "Consegnato (simulato)"}
                >
                    {ticks}
                </span>
            ) : null}
        </div>
    );
}