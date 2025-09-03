import { supabase } from "./supabaseClient";

// 🔹 Utente corrente
export async function fetchCurrentUserId(): Promise<string | null> {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user?.id ?? null;
}

// 🔹 Commenti
export async function fetchCommenti() {
    const { data, error } = await supabase
        .from("commenti")
        .select(`
      id, utente_id, task_id, parent_id, descrizione,
      created_at, modified_at, deleted_at,
      utente:utente_id ( id, nome, cognome )
    `)
        .is("deleted_at", null);

    if (error) throw error;
    return (data || []).map((c: any) => ({
        ...c,
        utente: Array.isArray(c.utente) ? c.utente[0] : c.utente,
    }));
}

// 🔹 Task assegnate a un utente
export async function fetchTaskAssegnate(utenteId: string): Promise<Set<string>> {
    const { data, error } = await supabase
        .from("utenti_task")
        .select("task_id")
        .eq("utente_id", utenteId);

    if (error) throw error;
    return new Set((data || []).map((t) => t.task_id));
}

/* ----------------------------
 *           NORMALI
 * ---------------------------- */

// 🔹 Stati
export async function fetchStati() {
    const { data, error } = await supabase
        .from("stati")
        .select("id, nome, colore, deleted_at")
        .order("id", { ascending: true });

    if (error) throw error;
    return (data || []).filter((s) => !s.deleted_at);
}

// 🔹 Ruoli
export async function fetchRuoli() {
    const { data, error } = await supabase
        .from("ruoli")
        .select("id, nome, deleted_at")
        .order("id", { ascending: true });

    if (error) throw error;
    return (data || []).filter((r) => !r.deleted_at);
}

// 🔹 Priorità
export async function fetchPriorita() {
    const { data, error } = await supabase
        .from("priorita")
        .select("id, nome, colore, deleted_at")
        .order("id", { ascending: true });

    if (error) throw error;
    return (data || []).filter((p) => !p.deleted_at);
}

// 🔹 Clienti
export async function fetchClienti() {
    const { data, error } = await supabase
        .from("clienti")
        .select(`
      id, nome, email, telefono, avatar_url, note, deleted_at,
      progetti:progetti ( id, nome, slug, deleted_at )
    `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || [])
        .filter((c) => !c.deleted_at)
        .map((c: any) => ({
            ...c,
            progetti: (c.progetti || []).filter((p: any) => !p.deleted_at),
        }));
}

// 🔹 Utenti
export async function fetchUtenti() {
    const { data, error } = await supabase
        .from("utenti")
        .select(`
      id, nome, cognome, email, avatar_url, deleted_at,
      ruolo:ruoli(id, nome),
      progetti:utenti_progetti(progetti(id, nome, slug, deleted_at))
    `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || [])
        .filter((u) => !u.deleted_at)
        .map((u: any) => ({
            ...u,
            ruolo: u.ruolo,
            progetti: (u.progetti || [])
                .map((up: any) => up.progetti)
                .filter((p: any) => p && !p.deleted_at),
        }));
}

// 🔹 Tasks (con filtri opzionali)
// 🔹 Tasks (con filtri opzionali)
export async function fetchTasks(filtro: any = {}, utenteId?: string) {
    let taskIds: string[] = [];

    // --- filtro su assegnatario
    if ((filtro.utente || filtro.soloMie) && utenteId) {
        const idFiltro = filtro.utente || utenteId;
        const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", idFiltro);
        taskIds = data?.map((t) => t.task_id) || [];
        if (taskIds.length === 0) return [];
    }

    // --- filtro su progetto
    if (filtro.progetto) {
        const { data } = await supabase
            .from("progetti_task")
            .select("task_id")
            .eq("progetti_id", filtro.progetto);
        const idsProgetto = data?.map((r) => r.task_id) || [];
        taskIds = taskIds.length > 0 ? taskIds.filter((id) => idsProgetto.includes(id)) : idsProgetto;
        if (taskIds.length === 0) return [];
    }

    // --- query principale con join
    const query = supabase
        .from("tasks")
        .select(`
      id, slug, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
      stato:stato_id ( id, nome, colore ),
      priorita:priorita_id ( id, nome, colore ),
      progetti_task ( progetti:progetti_id ( id, nome, slug ) ),
      utenti_task ( utenti:utente_id ( id, nome, cognome, avatar_url ) )
    `)
        .is("deleted_at", null);

    if (taskIds.length > 0) query.in("id", taskIds);
    if (filtro.stato) query.eq("stato_id", filtro.stato);
    if (filtro.priorita) query.eq("priorita_id", filtro.priorita);
    if (filtro.dataInizio) query.gte("consegna", filtro.dataInizio);
    if (filtro.dataFine) query.lte("consegna", filtro.dataFine);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        note: item.note,
        consegna: item.consegna,
        tempo_stimato: item.tempo_stimato,
        created_at: item.created_at,
        modified_at: item.modified_at,
        fine_task: item.fine_task,
        parent_id: item.parent_id,
        stato: Array.isArray(item.stato) ? item.stato[0] : item.stato,
        priorita: Array.isArray(item.priorita) ? item.priorita[0] : item.priorita,
        progetto: Array.isArray(item.progetti_task?.[0]?.progetti)
            ? item.progetti_task[0].progetti[0]
            : item.progetti_task?.[0]?.progetti ?? null,
        assegnatari: (item.utenti_task || []).map((u: any) => Array.isArray(u.utenti) ? u.utenti[0] : u.utenti) ?? [],
        slug: item.slug,
    }));
}
// 🔹 Cliente con progetti e credenziali
export async function fetchClienteDettaglioBySlugOrId({
    slug,
    id,
}: { slug?: string | null; id?: string | null }) {
    const base = supabase
        .from("clienti")
        .select(`
          id, nome, email, telefono, avatar_url, note,
          progetti:progetti (
            id, nome, slug, consegna,
            stato:stato_id ( id, nome, colore ),
            priorita:priorita_id ( id, nome )
          ),
          credenziali:clienti_credenziali (
            id, cliente_id, nome, username, email, password, note, created_at, modified_at, deleted_at
          )
        `)
        .limit(1);

    const { data, error } = slug
        ? await base.eq("slug", slug!).maybeSingle()
        : await base.eq("id", id!).maybeSingle();

    if (error || !data) return null;

    return {
        id: data.id,
        nome: data.nome,
        email: data.email ?? null,
        telefono: data.telefono ?? null,
        avatar_url: data.avatar_url ?? null,
        note: data.note ?? null,
        progetti: (data.progetti || []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            slug: p.slug,
            consegna: p.consegna,
            stato: Array.isArray(p.stato) ? p.stato[0] : p.stato,
            priorita: Array.isArray(p.priorita) ? p.priorita[0] : p.priorita,
        })),
        credenziali: (data.credenziali || [])
            .filter((c: any) => !c.deleted_at)
            .map((c: any) => ({
                id: c.id,
                cliente_id: c.cliente_id,
                nome: c.nome,
                username: c.username,
                email: c.email,
                password: c.password,
                note: c.note,
                created_at: c.created_at,
                modified_at: c.modified_at,
            })),
    } as const;
}


// 🔹 Progetti
export async function fetchProgetti(filtro: any = {}, utenteId?: string) {
    let idsProgetti: string[] = [];

    if ((filtro.utente || filtro.soloMie) && utenteId) {
        const idFiltro = filtro.utente || utenteId;
        const { data } = await supabase
            .from("utenti_progetti")
            .select("progetto_id")
            .eq("utente_id", idFiltro);
        idsProgetti = data?.map((r) => r.progetto_id) || [];
        if (idsProgetti.length === 0) return [];
    }

    const query = supabase
        .from("progetti")
        .select(`
      id, slug, nome, consegna, note, tempo_stimato, fine_progetto,   
      stato:stato_id ( id, nome, colore ),
      priorita:priorita_id ( id, nome ),
      cliente:cliente_id ( id, nome ),
      utenti_progetti:utenti_progetti ( utenti ( id, nome, cognome ) )
    `)
        .is("deleted_at", null);

    if (idsProgetti.length > 0) query.in("id", idsProgetti);
    if (filtro.stato) query.eq("stato_id", filtro.stato);
    if (filtro.priorita) query.eq("priorita_id", filtro.priorita);
    if (filtro.cliente) query.eq("cliente_id", filtro.cliente);
    if (filtro.dataInizio) query.gte("consegna", filtro.dataInizio);
    if (filtro.dataFine) query.lte("consegna", filtro.dataFine);

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map((p: any) => {
        const fine = p.fine_progetto ?? null;
        return {
            id: p.id,
            slug: p.slug,
            nome: p.nome,
            consegna: p.consegna,
            note: p.note,
            stato: Array.isArray(p.stato) ? p.stato[0] : p.stato,
            priorita: Array.isArray(p.priorita) ? p.priorita[0] : p.priorita,
            cliente: Array.isArray(p.cliente) ? p.cliente[0] : p.cliente,
            membri: p.utenti_progetti?.map((up: any) => up.utenti) ?? [],
            tempo_stimato: p.tempo_stimato,
            // 👇👇👇 MANCAVANO QUESTI DUE CAMPI
            fine_progetto: fine,
            completato: !!fine,
        };
    });

    // filtro "solo mie" a valle se serve
    if (filtro?.soloMie && utenteId) {
        return mapped.filter((pr) => pr.membri?.some((m: any) => m.id === utenteId));
    }
    return mapped;
}


/* ----------------------------
 *          DELETED
 * ---------------------------- */

// 🔹 Stati eliminati
export async function fetchStatiDeleted() {
    const { data, error } = await supabase
        .from("stati")
        .select("id, nome, colore, deleted_at")
        .not("deleted_at", "is", null)
        .order("id", { ascending: true });

    if (error) throw error;
    return data || [];
}

// 🔹 Ruoli eliminati
export async function fetchRuoliDeleted() {
    const { data, error } = await supabase
        .from("ruoli")
        .select("id, nome, deleted_at")
        .not("deleted_at", "is", null)
        .order("id", { ascending: true });

    if (error) throw error;
    return data || [];
}

// 🔹 Priorità eliminate
export async function fetchPrioritaDeleted() {
    const { data, error } = await supabase
        .from("priorita")
        .select("id, nome, colore, deleted_at")
        .not("deleted_at", "is", null)
        .order("id", { ascending: true });

    if (error) throw error;
    return data || [];
}

// 🔹 Clienti eliminati
export async function fetchClientiDeleted() {
    const { data, error } = await supabase
        .from("clienti")
        .select(`
      id, nome, email, telefono, avatar_url, note, deleted_at,
      progetti:progetti ( id, nome, slug, deleted_at )
    `)
        .not("deleted_at", "is", null)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((c: any) => ({
        ...c,
        progetti: (c.progetti || []).filter((p: any) => !p.deleted_at),
    }));
}

// 🔹 Utenti eliminati
export async function fetchUtentiDeleted() {
    const { data, error } = await supabase
        .from("utenti")
        .select(`
      id, nome, cognome, email, avatar_url, deleted_at,
      ruolo:ruoli(id, nome),
      progetti:utenti_progetti(progetti(id, nome, slug, deleted_at))
    `)
        .not("deleted_at", "is", null)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((u: any) => ({
        ...u,
        ruolo: u.ruolo,
        progetti: (u.progetti || [])
            .map((up: any) => up.progetti)
            .filter((p: any) => p && !p.deleted_at),
    }));
}

// 🔹 Tasks eliminate (supporta gli stessi filtri ID progetto/utente)
export async function fetchTasksDeleted(filtro: any = {}) {
    let taskIds: string[] = [];

    if (filtro.utente) {
        const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", filtro.utente);
        taskIds = data?.map((t) => t.task_id) || [];
        if (taskIds.length === 0) return [];
    }

    if (filtro.progetto) {
        const { data } = await supabase
            .from("progetti_task")
            .select("task_id")
            .eq("progetti_id", filtro.progetto);
        const idsProgetto = data?.map((r) => r.task_id) || [];
        taskIds = taskIds.length > 0 ? taskIds.filter((id) => idsProgetto.includes(id)) : idsProgetto;
        if (taskIds.length === 0) return [];
    }

    const query = supabase
        .from("tasks")
        .select(`
      id, slug, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id, deleted_at,
      stato:stato_id (id, nome, colore),
      priorita:priorita_id (id, nome),
      progetti_task:progetti_task ( progetti ( id, nome ) ),
      utenti_task ( utenti ( id, nome, cognome ) )
    `)
        .not("deleted_at", "is", null);

    if (taskIds.length > 0) query.in("id", taskIds);
    if (filtro.stato) query.eq("stato_id", filtro.stato);
    if (filtro.priorita) query.eq("priorita_id", filtro.priorita);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        note: item.note,
        consegna: item.consegna,
        tempo_stimato: item.tempo_stimato,
        created_at: item.created_at,
        modified_at: item.modified_at,
        fine_task: item.fine_task,
        parent_id: item.parent_id,
        deleted_at: item.deleted_at,
        stato: item.stato,
        priorita: item.priorita,
        progetto: item.progetti_task?.[0]?.progetti ?? null,
        assegnatari: item.utenti_task?.map((u: any) => u.utenti) ?? [],
        slug: item.slug,
    }));
}

export async function fetchProgettiDeleted(filtro: any = {}) {
    let idsProgetti: string[] = [];

    if (filtro.utente) {
        const { data } = await supabase
            .from("utenti_progetti")
            .select("progetto_id")
            .eq("utente_id", filtro.utente);
        idsProgetti = data?.map((r) => r.progetto_id) || [];
        if (idsProgetti.length === 0) return [];
    }

    const query = supabase
        .from("progetti")
        .select(`
      id, slug, nome, consegna, note, tempo_stimato, fine_progetto, deleted_at,  
      stato:stato_id ( id, nome, colore ),
      priorita:priorita_id ( id, nome ),
      cliente:cliente_id ( id, nome ),
      utenti_progetti:utenti_progetti ( utenti ( id, nome, cognome ) )
    `)
        .not("deleted_at", "is", null);

    if (idsProgetti.length > 0) query.in("id", idsProgetti);
    if (filtro.stato) query.eq("stato_id", filtro.stato);
    if (filtro.priorita) query.eq("priorita_id", filtro.priorita);
    if (filtro.cliente) query.eq("cliente_id", filtro.cliente);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((p: any) => {
        const fine = p.fine_progetto ?? null;
        return {
            id: p.id,
            slug: p.slug,
            nome: p.nome,
            consegna: p.consegna,
            note: p.note,
            deleted_at: p.deleted_at,
            stato: Array.isArray(p.stato) ? p.stato[0] : p.stato,
            priorita: Array.isArray(p.priorita) ? p.priorita[0] : p.priorita,
            cliente: Array.isArray(p.cliente) ? p.cliente[0] : p.cliente,
            membri: p.utenti_progetti?.map((up: any) => up.utenti) ?? [],
            tempo_stimato: p.tempo_stimato,
            // 👇 coerenza anche nel cestino
            fine_progetto: fine,
            completato: !!fine,
        };
    });
}


/* ----------------------------
 *   HELPERS CESTINO (azioni)
 * ---------------------------- */

export async function restoreRecord(table: string, id: string | number) {
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq("id", id);
    if (error) throw error;
}

export async function hardDeleteRecord(table: string, id: string | number) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
}

// alias comodi specifici
export const cestinoActions = {
    stati: {
        restore: (id: number | string) => restoreRecord("stati", id),
        hardDelete: (id: number | string) => hardDeleteRecord("stati", id),
    },
    ruoli: {
        restore: (id: number | string) => restoreRecord("ruoli", id),
        hardDelete: (id: number | string) => hardDeleteRecord("ruoli", id),
    },
    priorita: {
        restore: (id: number | string) => restoreRecord("priorita", id),
        hardDelete: (id: number | string) => hardDeleteRecord("priorita", id),
    },
    clienti: {
        restore: (id: number | string) => restoreRecord("clienti", id),
        hardDelete: (id: number | string) => hardDeleteRecord("clienti", id),
    },
    utenti: {
        restore: (id: number | string) => restoreRecord("utenti", id),
        hardDelete: (id: number | string) => hardDeleteRecord("utenti", id),
    },
    tasks: {
        restore: (id: number | string) => restoreRecord("tasks", id),
        hardDelete: (id: number | string) => hardDeleteRecord("tasks", id),
    },
    progetti: {
        restore: (id: number | string) => restoreRecord("progetti", id),
        hardDelete: (id: number | string) => hardDeleteRecord("progetti", id),
    },
};
// --- Dettagli: TASK & PROGETTO (VM pronti per il dettaglio) -----------------

export async function fetchTaskDettaglioBySlugOrId({
    slug,
    id,
}: { slug?: string | null; id?: string | null }) {
    const base = supabase
        .from("tasks")
        .select(`
      id, slug, nome, note, consegna, tempo_stimato, fine_task, created_at, modified_at, parent_id,
      stato:stato_id ( id, nome, colore ),
      priorita:priorita_id ( id, nome ),
      progetti_task ( progetti ( id, nome, slug ) ),
      utenti_task ( utenti ( id, nome, cognome, avatar_url ) )
    `)
        .limit(1);

    const { data, error } = slug
        ? await base.eq("slug", slug!).maybeSingle()
        : await base.eq("id", id!).maybeSingle();

    if (error || !data) return null;

    const progettoPulito = Array.isArray(data.progetti_task?.[0]?.progetti)
        ? data.progetti_task?.[0]?.progetti[0]
        : data.progetti_task?.[0]?.progetti ?? null;

    return {
        id: data.id,
        slug: data.slug ?? null,
        nome: data.nome,
        note: data.note,
        consegna: data.consegna,
        tempo_stimato: data.tempo_stimato ?? null,
        fine_task: data.fine_task ?? null,
        parent_id: data.parent_id ?? null,
        stato: Array.isArray(data.stato) ? data.stato[0] : data.stato,
        priorita: Array.isArray(data.priorita) ? data.priorita[0] : data.priorita,
        progetto: progettoPulito
            ? { id: progettoPulito.id, nome: progettoPulito.nome, slug: progettoPulito.slug ?? null }
            : null,
        assegnatari: (data.utenti_task || []).map((u: any) => u.utenti) ?? [],
    } as const;
}

export async function fetchTaskDettaglioChildren(): Promise<any[]> {
    const { data, error } = await supabase
        .from("tasks")
        .select(`
      id, slug, nome, note, consegna, tempo_stimato, fine_task, created_at, modified_at, parent_id,
      stato:stato_id ( id, nome, colore ),
      priorita:priorita_id ( id, nome ),
      utenti_task ( utenti ( id, nome, cognome, avatar_url ) )
    `)
        .is("deleted_at", null);

    if (error || !data) return [];

    return data.map((t: any) => ({
        id: t.id as string,
        slug: t.slug ?? null,
        nome: t.nome ?? "—",
        note: t.note ?? null,
        consegna: t.consegna ?? null,
        tempo_stimato: t.tempo_stimato ?? null,
        fine_task: t.fine_task ?? null,
        created_at: t.created_at,
        modified_at: t.modified_at,
        parent_id: t.parent_id ?? null,
        stato: Array.isArray(t.stato) ? t.stato[0] : t.stato,
        priorita: Array.isArray(t.priorita) ? t.priorita[0] : t.priorita,
        progetto: null,
        assegnatari: t.utenti_task?.map((u: any) => u.utenti) ?? [],
    }));
}

export async function fetchDettaglioDurate(ids: string[]) {
    if (!ids.length) return { perTask: {}, perUtente: {} as Record<string, number> };

    const { data, error } = await supabase
        .from("time_entries")
        .select("task_id, utente_id, durata")
        .in("task_id", ids);

    if (error || !data) return { perTask: {}, perUtente: {} };

    const perTask: Record<string, number> = {};
    const perUtente: Record<string, number> = {};

    for (const r of data) {
        if (r.task_id && r.durata) perTask[r.task_id] = (perTask[r.task_id] || 0) + r.durata;
        if (r.utente_id && r.durata) perUtente[r.utente_id] = (perUtente[r.utente_id] || 0) + r.durata;
    }
    return { perTask, perUtente };
}

export async function fetchProgettoDettaglioBySlugOrId({
    slug,
    id,
}: { slug?: string | null; id?: string | null }) {
    const base = supabase
        .from("progetti")
        .select(`
      id, nome, slug, note, consegna, tempo_stimato, fine_progetto,
      cliente:clienti ( id, nome ),
      stato:stati ( id, nome, colore ),
      priorita ( id, nome )
    `)
        .limit(1);

    const { data, error } = slug
        ? await base.eq("slug", slug!).maybeSingle()
        : await base.eq("id", id!).maybeSingle();

    if (error || !data) return null;

    const { data: membri } = await supabase
        .from("utenti_progetti")
        .select("utenti(id,nome,cognome,avatar_url)")
        .eq("progetto_id", data.id);

    const membriPuliti = (membri || []).map((r: any) => r.utenti).filter(Boolean);

    return {
        id: data.id,
        nome: data.nome,
        slug: data.slug ?? null,
        note: data.note,
        consegna: data.consegna,
        tempo_stimato: data.tempo_stimato,
        fine_progetto: data.fine_progetto ?? null,
        cliente: Array.isArray(data.cliente) ? data.cliente[0] : data.cliente,
        stato: Array.isArray(data.stato) ? data.stato[0] : data.stato,
        priorita: Array.isArray(data.priorita) ? data.priorita[0] : data.priorita,
        membri: membriPuliti ?? [],
        completato: !!data.fine_progetto,
    } as const;
}

export async function fetchProgettoDettaglioChildren(progettoId: string) {
    const { data, error } = await supabase
        .from("progetti_task")
        .select(`
      task:task_id (
        id, slug, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
        stato:stato_id ( id, nome, colore ),
        priorita:priorita_id ( id, nome ),
        utenti_task ( utenti ( id, nome, cognome, avatar_url ) )
      )
    `)
        .eq("progetti_id", progettoId);

    if (error || !data) return [];

    return data.map((r: any) => {
        const t = r.task;
        return {
            id: t.id as string,
            slug: t.slug ?? null,
            nome: t.nome as string,
            note: t.note ?? null,
            consegna: t.consegna ?? null,
            tempo_stimato: t.tempo_stimato ?? null,
            created_at: t.created_at,
            modified_at: t.modified_at,
            fine_task: t.fine_task ?? null,
            parent_id: t.parent_id ?? null,
            stato: Array.isArray(t.stato) ? t.stato[0] : t.stato,
            priorita: Array.isArray(t.priorita) ? t.priorita[0] : t.priorita,
            progetto: { id: progettoId, nome: "" },
            assegnatari: (t.utenti_task || []).map((u: any) => u.utenti) ?? [],
        };
    });
}
