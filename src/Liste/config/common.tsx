// src/Liste/config/common.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faLink } from "@fortawesome/free-solid-svg-icons";
import { useToast } from "../../supporto/useToast";

/* ------------------ Formatter ------------------ */
export const fmt = {
    date: (val: string | null) => (val ? new Date(val).toLocaleDateString() : "—"),
    durata: (value: number | string | null): string => {
        if (!value) return "0m";
        if (typeof value === "number") {
            const ore = Math.floor(value / 3600);
            const minuti = Math.floor((value % 3600) / 60);
            const secondi = value % 60;
            if (ore > 0 && secondi > 0) return `${ore}h ${minuti}m ${secondi}s`;
            if (ore > 0) return `${ore}h ${minuti}m`;
            if (minuti > 0 && secondi > 0) return `${minuti}m ${secondi}s`;
            if (minuti > 0) return `${minuti}m`;
            return `${secondi}s`;
        }
        return "0m";
    },
};

/* ------------------ Helpers ------------------ */
export const is = {
    taskDone: (t: any) => !!t?.fine_task || t?.completata === true,
    projectDone: (p: any) => !!p?.fine_progetto || p?.completato === true,
};

/* ------------------ Badge ------------------ */
export const badge = {
    meLink: <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Assegnato a te" />,
    member: <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Membro" />,
    done: <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completato" />,
};

/* ------------------ Avatar Fallback ------------------ */
export const AvatarFallback = ({ text }: { text: string }) => (
    <div className="w-8 h-8 rounded-full avatar-placeholder flex items-center justify-center text-xs font-bold">
        {text?.[0]?.toUpperCase() ?? "?"}
    </div>
);

/* ------------------ Toast Bridge ------------------ */
let globalShowToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void = () => { };
export const ToastBridge = () => {
    const showToast = useToast();
    globalShowToast = showToast;
    return null;
};
export const showToast = (msg: string, type?: "success" | "error" | "warning" | "info") => {
    globalShowToast(msg, type);
};
