import type { ResourceKey } from "../Liste/resourceConfigs";
export type Vista = "list" | "cards" | "timeline" | "gantt";

const keyVista = (tipo: ResourceKey) => `vista_${tipo}`;
const keyGroupBy = (tipo: ResourceKey) => `groupby_${tipo}`;

export function getPreferredView(tipo: ResourceKey, fallback: Vista = "list"): Vista {
    try {
        const v = localStorage.getItem(keyVista(tipo));
        return v === "list" || v === "cards" || v === "timeline" || v === "gantt"
            ? (v as Vista)
            : fallback;
    } catch {
        return fallback;
    }
}


export function setPreferredView(tipo: ResourceKey, vista: Vista) {
    try {
        localStorage.setItem(keyVista(tipo), vista);
    } catch { }
}

export function getGroupByPref(tipo: ResourceKey): string | null {
    try {
        return localStorage.getItem(keyGroupBy(tipo));
    } catch {
        return null;
    }
}

export function setGroupByPref(tipo: ResourceKey, key: string | null) {
    try {
        if (key) localStorage.setItem(keyGroupBy(tipo), key);
        else localStorage.removeItem(keyGroupBy(tipo));
    } catch { }
}