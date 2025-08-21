// src/supporto/ui.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactNode } from "react";

/* ==============================
   CHIP (etichette piccole)
============================== */
export const Chip = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg card-theme text-sm">
        {children}
    </span>
);

/* ==============================
   META FIELD (titolo + contenuto)
============================== */
export const MetaField = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
        <div className="text-xs opacity-70 mb-1">{label}</div>
        <div>{children}</div>
    </div>
);

/* ==============================
   STATO BADGE (colore stato)
============================== */
export const StatoBadge = ({ nome, colore }: { nome?: string; colore?: string | null }) => {
    const bg = colore || "#9CA3AF";
    return (
        <span
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: bg }}
        >
            {nome ?? "—"}
        </span>
    );
};

/* ==============================
   AVATAR UTENTE
============================== */
type Utente = { id: string; nome: string; cognome?: string | null; avatar_url?: string | null };

export const Avatar = ({ utente }: { utente: Utente }) => {
    const initials = `${(utente.nome?.[0] || "").toUpperCase()}${(utente.cognome?.[0] || "").toUpperCase()}`;
    if (utente.avatar_url) {
        return (
            <img
                src={utente.avatar_url}
                alt={`${utente.nome} ${utente.cognome || ""}`}
                className="h-7 w-7 rounded-full object-cover"
            />
        );
    }
    return (
        <div className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10 text-[11px] flex items-center justify-center">
            {initials || "?"}
        </div>
    );
};

/* ==============================
   AVATAR + NOME
============================== */
export const AvatarChip = ({ utente }: { utente: Utente }) => (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-2xl card-theme">
        <Avatar utente={utente} />
        <span className="text-[15px]">{utente.nome} {utente.cognome || ""}</span>
    </div>
);

/* ==============================
   SEZIONE (titolo + contenuto)
============================== */
export const Section = ({ icon, title, children }: { icon?: any; title: string; children: ReactNode }) => (
    <div className="mt-3">
        <p className="flex items-center gap-2 font-semibold">
            {icon && <FontAwesomeIcon icon={icon} className="icon-color w-4 h-4" />}
            {title}
        </p>
        <div className="mt-2">{children}</div>
    </div>
);
