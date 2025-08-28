import type { ReactNode } from "react";
import { notificaEvento } from "../supporto/notificheService";

export type CampoBase = { chiave: string; label: string; required?: boolean };
export type CampoText = CampoBase & { tipo: "text" | "email" | "tel" | "number" | "slug" };
export type CampoTextarea = CampoBase & { tipo: "textarea" };
export type CampoDate = CampoBase & { tipo: "date" | "time" };
export type CampoSelect = CampoBase & {
    tipo: "select";
    sorgente: { tabella: string; value: string; label: string; where?: [string, string, any][]; orderBy?: { colonna: string; asc?: boolean } };
};
export type CampoColorTradotto = CampoBase & { tipo: "color-ita-eng" };
export type CampoAvatar = CampoBase & { tipo: "avatar"; bucket: string };
export type CampoJoinMany = CampoBase & {
    tipo: "join-many";
    join: { tabellaJoin: string; thisKey: string; otherKey: string };
    pick: { tabellaOther: string; value: string; label: (row: any) => string; where?: [string, string, any][]; orderBy?: { colonna: string; asc?: boolean } };
};

export type CampoDef = CampoText | CampoTextarea | CampoDate | CampoSelect | CampoColorTradotto | CampoAvatar | CampoJoinMany;

export type CreatorHooks = {
    afterCreate?: (ctx: { form: Record<string, any>; supabase: any; id: string; joinSelections: Record<string, string[]> }) => void | Promise<void>;
};

export type CreatorConfig = {
    titolo: string | ReactNode;
    campi: CampoDef[];
    redirectPath?: (form: Record<string, any>) => string | null;
    hooks?: CreatorHooks;
};

export const creatorConfigs: Record<string, CreatorConfig> = {
    clienti: {
        titolo: "➕ Nuovo Cliente",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text", required: true },
            { chiave: "email", label: "Email", tipo: "email" },
            { chiave: "telefono", label: "Telefono", tipo: "tel" },
            { chiave: "avatar_url", label: "Avatar", tipo: "avatar", bucket: "avatars-clients" },
            { chiave: "note", label: "Note", tipo: "textarea" },
        ],
    },

    utenti: {
        titolo: "➕ Nuovo Utente",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text", required: true },
            { chiave: "cognome", label: "Cognome", tipo: "text", required: true },
            { chiave: "email", label: "Email", tipo: "email", required: true },
            {
                chiave: "ruolo",
                label: "Ruolo",
                tipo: "select",
                sorgente: { tabella: "ruoli", value: "id", label: "nome" },
            },
            { chiave: "avatar_url", label: "Avatar", tipo: "avatar", bucket: "avatars" },
        ],
    },

    stati: {
        titolo: "➕ Nuovo Stato",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text", required: true },
            { chiave: "colore", label: "Colore", tipo: "color-ita-eng" },
        ],
    },

    priorita: {
        titolo: "➕ Nuova Priorità",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text", required: true },
            { chiave: "colore", label: "Colore", tipo: "color-ita-eng" },
        ],
    },

    ruoli: {
        titolo: "➕ Nuovo Ruolo",
        campi: [{ chiave: "nome", label: "Nome", tipo: "text", required: true }],
    },

    progetti: {
        titolo: "➕ Nuovo Progetto",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text", required: true },
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
        redirectPath: (form) => (form.slug ? `/progetti/${form.slug}` : null),
        hooks: {
            afterCreate: async ({ form, supabase, id, joinSelections }) => {
                const user = await supabase.auth.getUser();
                const autoreId = user.data?.user?.id;
                const nuoviMembri = joinSelections.membri || [];
                if (nuoviMembri.length > 0) {
                    await notificaEvento("PROGETTO_ASSEGNATO", nuoviMembri, autoreId, {
                        progetto_id: id,
                        progettoNome: form.nome,
                    });
                }
            },
        },
    },

    tasks: {
        titolo: "➕ Nuova Task",
        campi: [
            { chiave: "nome", label: "Nome", tipo: "text", required: true },
            { chiave: "slug", label: "Slug", tipo: "slug" },
            {
                chiave: "stato_id",
                label: "Stato",
                tipo: "select",
                sorgente: { tabella: "stati", value: "id", label: "nome" },
            },
            {
                chiave: "priorita_id",
                label: "Priorità",
                tipo: "select",
                sorgente: { tabella: "priorita", value: "id", label: "nome" },
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
        redirectPath: (form) => (form.slug ? `/tasks/${form.slug}` : null),
        hooks: {
            afterCreate: async ({ form, supabase, id, joinSelections }) => {
                const user = await supabase.auth.getUser();
                const autoreId = user.data?.user?.id;
                const nuoviAss = joinSelections.assegnatari || [];
                if (nuoviAss.length > 0) {
                    await notificaEvento("TASK_ASSEGNATO", nuoviAss, autoreId, {
                        task_id: id,
                        taskNome: form.nome,
                    });
                }
            },
        },
    },
};
