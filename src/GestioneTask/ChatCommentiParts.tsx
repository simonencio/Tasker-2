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

export function useAutosize(ref: React.RefObject<HTMLTextAreaElement | null>, dep: string, max = 160) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = Math.min(el.scrollHeight, max) + "px";
    }, [ref, dep, max]);
}

export function useAutoScroll(listRef: React.RefObject<HTMLDivElement | null>, itemsCount: number) {
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

export function DayDivider({ iso }: { iso: string }) {
    return (
        <div className="my-3 flex items-center gap-3">
            <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
            <div className="text-[11px] text-gray-600 dark:text-gray-400">{formatDay(iso)}</div>
            <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
        </div>
    );
}

export function Avatar({ u, className = "h-7 w-7" }: { u?: Utente | null; className?: string }) {
    const src = urlForAvatar(u?.avatar_url);
    return src ? (
        <img
            src={src}
            alt={`${u?.nome || ""} ${u?.cognome || ""}`}
            className={`${className} rounded-full object-cover shadow-sm select-none`}
            title={`${u?.nome || ""} ${u?.cognome || ""}`}
            referrerPolicy="no-referrer"
        />
    ) : (
        <div
            className={`${className} rounded-full grid place-items-center text-[11px] font-semibold bg-emerald-600/90 text-white shadow-sm select-none`}
            title={`${u?.nome || ""} ${u?.cognome || ""}`}
        >
            {getInitials(u?.nome, u?.cognome)}
        </div>
    );
}

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
        <div className="mb-2 text-xs rounded-xl border-l-4 pl-3 pr-2 py-2 bg-black/5 dark:bg-white/5 border-l-emerald-500">
            <div className="font-semibold mb-1">
                {parent?.utente?.nome} {parent?.utente?.cognome || ""}
            </div>
            <div className="whitespace-pre-line text-[13px]">
                {expanded ? full : tronca(full)}
                {showToggle && (
                    <button type="button" className="ml-2 text-[12px] text-emerald-600 hover:underline" onClick={onToggle}>
                        {expanded ? "Comprimi" : "Mostra tutto"}
                    </button>
                )}
            </div>
        </div>
    );
}

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
        <div className="absolute left-2 bottom-full mb-2 max-h-56 overflow-auto rounded-xl border border-gray-300 dark:border-gray-700 bg-theme shadow-lg w-72 z-10">
            {suggestions.map((u, idx) => {
                const active = idx === activeIndex;
                const already = alreadyHas(u.id);
                return (
                    <button
                        type="button"
                        key={u.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(u)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${active ? "bg-emerald-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"
                            }`}
                    >
                        <div className={`h-6 w-6 rounded-full overflow-hidden ${active ? "ring-2 ring-white" : ""}`}>
                            {u.avatar_url && urlForAvatar(u.avatar_url) ? (
                                <img
                                    src={urlForAvatar(u.avatar_url)!}
                                    alt={`${u.nome} ${u.cognome || ""}`}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="h-full w-full bg-emerald-600/90 text-white text-[11px] font-semibold grid place-items-center">
                                    {getInitials(u.nome, u.cognome)}
                                </div>
                            )}
                        </div>
                        <span>@{fullName(u)}</span>
                        {already && <span className="ml-auto text-[11px] opacity-80">già aggiunto</span>}
                    </button>
                );
            })}
        </div>
    );
}

export function MessageMeta({
    created_at,
    isMine,
    justSent,
    ticks,
    onReply,
    replyTint = { mine: "text-white/90", other: "text-emerald-700 dark:text-emerald-300" },
}: {
    created_at: string;
    isMine: boolean;
    justSent: boolean;
    ticks: string;
    onReply: () => void;
    replyTint?: { mine: string; other: string };
}) {
    return (
        <div
            className={[
                "mt-1.5 text-[11px] opacity-80 flex items-center gap-3",
                isMine ? "justify-end" : "justify-start",
            ].join(" ")}
        >
            <span>{new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            {isMine ? (
                <span
                    className={`select-none ${justSent ? "opacity-70" : "opacity-100"} ${justSent ? "" : "font-semibold"}`}
                    title={justSent ? "Inviato" : "Consegnato (simulato)"}
                >
                    {ticks}
                </span>
            ) : null}
            <button
                className={`ml-1 text-[11px] ${isMine ? replyTint.mine : replyTint.other} hover:underline`}
                onClick={onReply}
                title="Rispondi"
            >
                <FontAwesomeIcon icon={faReply} className="mr-1" />
                Rispondi
            </button>
        </div>
    );
}
