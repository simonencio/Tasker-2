import type { ReactNode } from "react";
import { notificaEvento } from "../supporto/notificheService";

/* =========================
 * Tipi campi
 * ========================= */
export type CampoBase = { chiave: string; label: string; required?: boolean };
export type CampoText = CampoBase & { tipo: "text" | "email" | "tel" | "number" | "slug" };
export type CampoTextarea = CampoBase & { tipo: "textarea" };
export type CampoDate = CampoBase & { tipo: "date" | "time" };
export type CampoSelect = CampoBase & {
    tipo: "select";
    sorgente: {
        tabella: string;
        value: string;
        label: string;
        where?: [col: string, op: string, value: any][];
        orderBy?: { colonna: string; asc?: boolean };
    };
};
export type CampoColorTradotto = CampoBase & { tipo: "color-ita-eng" };
export type CampoAvatar = CampoBase & { tipo: "avatar"; bucket: string };
export type CampoJoinMany = CampoBase & {
    tipo: "join-many";
    join: { tabellaJoin: string; thisKey: string; otherKey: string };
    pick: {
        tabellaOther: string;
        value: string;
        label: (row: any) => string;
        where?: [col: string, op: string, value: any][];
        orderBy?: { colonna: string; asc?: boolean };
    };
};

export type CampoDef =
    | CampoText
    | CampoTextarea
    | CampoDate
    | CampoSelect
    | CampoColorTradotto
    | CampoAvatar
    | CampoJoinMany;

export type EditorHooks = {
    afterSave?: (ctx: {
        form: Record<string, any>;
        originale?: Record<string, any> | null;
        joinOriginals: Record<string, string[]>;
        joinSelections: Record<string, string[]>;
        supabase: any;
        id: string;
    }) => void | Promise<void>;
};

export type EditorConfig = {
    titolo: string | ReactNode;
    campi: CampoDef[];
    redirectPath?: (form: Record<string, any>, originale?: Record<string, any>) => string | null;
    hooks?: EditorHooks;
};

/* =========================
 * Configurazioni
 * ========================= */
export const editorConfigs: Record<string, EditorConfig> = {
    clienti: {
        titolo: "✏️ Modifica Cliente",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text" },
            { chiave: "email", label: "Email", tipo: "email" },
            { chiave: "telefono", label: "Telefono", tipo: "tel" },
            { chiave: "avatar_url", label: "Avatar", tipo: "avatar", bucket: "avatars-clients" },
            { chiave: "note", label: "Note", tipo: "textarea" },
        ],
    },

    utenti: {
        titolo: "✏️ Modifica Utente",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text" },
            { chiave: "cognome", label: "Cognome", tipo: "text" },
            { chiave: "email", label: "Email", tipo: "email" },
            {
                chiave: "ruolo",
                label: "Ruolo",
                tipo: "select",
                sorgente: { tabella: "ruoli", value: "id", label: "nome", orderBy: { colonna: "id" } },
            },
            { chiave: "avatar_url", label: "Avatar", tipo: "avatar", bucket: "avatars" },
        ],
    },

    stati: {
        titolo: "✏️ Modifica Stato",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text" },
            { chiave: "colore", label: "Colore", tipo: "color-ita-eng" },
        ],
    },

    priorita: {
        titolo: "✏️ Modifica Priorità",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text" },
            { chiave: "colore", label: "Colore", tipo: "color-ita-eng" },
        ],
    },

    ruoli: {
        titolo: "✏️ Modifica Ruolo",
        campi: [{ chiave: "nome", label: "Nome", tipo: "text" }],
    },

    progetti: {
        titolo: "✏️ Modifica Progetto",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text" },
            { chiave: "slug", label: "Slug", tipo: "slug" },
            {
                chiave: "cliente_id",
                label: "Cliente",
                tipo: "select",
                sorgente: { tabella: "clienti", value: "id", label: "nome", where: [["deleted_at", "is", null]] },
            },
            {
                chiave: "stato_id",
                label: "Stato",
                tipo: "select",
                sorgente: { tabella: "stati", value: "id", label: "nome", where: [["deleted_at", "is", null]] },
            },
            {
                chiave: "priorita_id",
                label: "Priorità",
                tipo: "select",
                sorgente: { tabella: "priorita", value: "id", label: "nome", where: [["deleted_at", "is", null]] },
            },
            { chiave: "consegna", label: "Consegna", tipo: "date" },
            { chiave: "tempo_stimato", label: "Tempo stimato", tipo: "time" },
            { chiave: "note", label: "Note", tipo: "textarea" },
            {
                chiave: "membri",
                label: "Membri",
                tipo: "join-many",
                join: { tabellaJoin: "utenti_progetti", thisKey: "progetto_id", otherKey: "utente_id" },
                pick: { tabellaOther: "utenti", value: "id", label: (u) => `${u.nome} ${u.cognome}` },
            },
        ],
        // ❌ rimosso redirectPath
        hooks: {
            afterSave: async ({ form, originale, joinOriginals, joinSelections, supabase, id }) => {
                const oldMembri = joinOriginals.membri || [];
                const newMembri = joinSelections.membri || [];
                const aggiunti = newMembri.filter((x) => !oldMembri.includes(x));
                const rimossi = oldMembri.filter((x) => !newMembri.includes(x));
                const rimasti = newMembri.filter((x) => oldMembri.includes(x));
                const user = await supabase.auth.getUser();
                const autoreId = user.data?.user?.id;

                if (aggiunti.length > 0) await notificaEvento("PROGETTO_ASSEGNATO", aggiunti, autoreId, { progetto_id: id, progettoNome: form.nome });
                if (rimossi.length > 0) await notificaEvento("PROGETTO_RIMOSSO", rimossi, autoreId, { progetto_id: id, progettoNome: form.nome });
                if (rimasti.length > 0 && originale) {
                    const modifiche: any[] = [];
                    if (form.nome !== originale.nome) modifiche.push({ campo: "nome", da: originale.nome, a: form.nome });
                    if (modifiche.length > 0)
                        await notificaEvento("PROGETTO_MODIFICATO", rimasti, autoreId, { progetto_id: id, progettoNome: form.nome, modifiche });
                }
            },
        },
    },

    tasks: {
        titolo: "✏️ Modifica Task",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text" },
            { chiave: "slug", label: "Slug", tipo: "slug" },

            // 👇 AGGIUNGI QUESTO BLOCCO
            {
                chiave: "progetto_id",
                label: "Progetto",
                tipo: "select",
                sorgente: {
                    tabella: "progetti",
                    value: "id",
                    label: "nome",
                    where: [["deleted_at", "is", null]],
                    orderBy: { colonna: "nome", asc: true }
                },
            },

            {
                chiave: "stato_id",
                label: "Stato",
                tipo: "select",
                sorgente: { tabella: "stati", value: "id", label: "nome", where: [["deleted_at", "is", null]] },
            },
            {
                chiave: "priorita_id",
                label: "Priorità",
                tipo: "select",
                sorgente: { tabella: "priorita", value: "id", label: "nome", where: [["deleted_at", "is", null]] },
            },
            { chiave: "consegna", label: "Consegna", tipo: "date" },
            { chiave: "tempo_stimato", label: "Tempo stimato", tipo: "time" },
            { chiave: "note", label: "Note", tipo: "textarea" },
            {
                chiave: "assegnatari",
                label: "Assegnatari",
                tipo: "join-many",
                join: { tabellaJoin: "utenti_task", thisKey: "task_id", otherKey: "utente_id" },
                pick: { tabellaOther: "utenti", value: "id", label: (u) => `${u.nome} ${u.cognome}` },
            },
        ],
        hooks: {
            afterSave: async ({ form, originale, joinOriginals, joinSelections, supabase, id }) => {
                const oldAss = joinOriginals.assegnatari || [];
                const newAss = joinSelections.assegnatari || [];
                const aggiunti = newAss.filter((v) => !oldAss.includes(v));
                const rimossi = oldAss.filter((v) => !newAss.includes(v));
                const rimasti = newAss.filter((v) => oldAss.includes(v));
                const user = await supabase.auth.getUser();
                const autoreId = user.data?.user?.id;

                if (aggiunti.length > 0) await notificaEvento("TASK_ASSEGNATO", aggiunti, autoreId, { task_id: id, taskNome: form.nome });
                if (rimossi.length > 0) await notificaEvento("TASK_RIMOSSO", rimossi, autoreId, { task_id: id, taskNome: form.nome });
                if (rimasti.length > 0 && originale) {
                    const modifiche: any[] = [];
                    if (form.nome !== originale.nome) modifiche.push({ campo: "nome", da: originale.nome, a: form.nome });
                    if (form.note !== originale.note) modifiche.push({ campo: "note", da: originale.note, a: form.note });
                    if (form.progetto_id !== originale.progetto_id) modifiche.push({ campo: "progetto", da: originale.progetto_id, a: form.progetto_id });
                    if (modifiche.length > 0)
                        await notificaEvento("TASK_MODIFICATO", rimasti, autoreId, { task_id: id, taskNome: form.nome, modifiche });
                }
            },
        },
    },

};
