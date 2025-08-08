// src/components/ChatCommenti.parts.tsx
import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply } from "@fortawesome/free-solid-svg-icons";
import {
    urlForAvatar,
    fullName,
    tronca,
    getInitials,
    PREVIEW_LEN,
    formatDay,
} from "../supporto/chatCommentiUtils";
import type { Commento, Utente } from "../supporto/chatCommentiUtils";

/**
 * Auto-resize della textarea con limite massimo (px).
 */
/**
 * Auto-resize della textarea con limite massimo (px).
 * Se il testo è vuoto, la riporta all’altezza minima.
 */
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
 */
export function MentionMenu({
    visible,
    suggestions,
    activeIndex,
    alreadyHas,
    onPick,
}: {
    visible: boolean;
    suggestions: Utente[];
    activeIndex: number;
    alreadyHas: (id: string) => boolean;
    onPick: (u: Utente) => void;
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
                        onClick={() => onPick(u)}
                        className={`w-full text-left px-3 py-2 text-[12px] sm:text-[13px] md:text-sm flex items-center gap-2 ${active ? "selected-panel" : "hover-bg-theme"
                            }`}
                        title={`Menziona @${fullName(u)}`}
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

            <span
                className={`tabular-nums ${isMine ? timeTint.mine : timeTint.other
                    }`}
            >
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
