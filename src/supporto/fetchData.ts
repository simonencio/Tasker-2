import { supabase } from "./supabaseClient";

// 🔹 Utente corrente
export async function fetchCurrentUserId(): Promise<string | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
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
export async function fetchTasks(filtro: any = {}, utenteId?: string) {
    let taskIds: string[] = [];

    if ((filtro.utente || filtro.soloMie) && utenteId) {
        const idFiltro = filtro.utente || utenteId;
        const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", idFiltro);
        taskIds = data?.map((t) => t.task_id) || [];
        if (taskIds.length === 0) return [];
    }

    if (filtro.progetto) {
        const { data } = await supabase.from("progetti_task").select("task_id").eq("progetti_id", filtro.progetto);
        const idsProgetto = data?.map((r) => r.task_id) || [];
        taskIds = taskIds.length > 0 ? taskIds.filter((id) => idsProgetto.includes(id)) : idsProgetto;
        if (taskIds.length === 0) return [];
    }

    const query = supabase
        .from("tasks")
        .select(`
            id, slug, nome, note, consegna, tempo_stimato, created_at, modified_at, fine_task, parent_id,
            stato:stato_id (id, nome, colore),
            priorita:priorita_id (id, nome),
            progetti_task:progetti_task ( progetti ( id, nome ) ),
            utenti_task ( utenti ( id, nome, cognome ) )
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
        stato: item.stato,
        priorita: item.priorita,
        progetto: item.progetti_task?.[0]?.progetti ?? null,
        assegnatari: item.utenti_task?.map((u: any) => u.utenti) ?? [],
        slug: item.slug,
    }));
}

// 🔹 Progetti
export async function fetchProgetti(filtro: any = {}, utenteId?: string) {
    let idsProgetti: string[] = [];

    if ((filtro.utente || filtro.soloMie) && utenteId) {
        const idFiltro = filtro.utente || utenteId;
        const { data } = await supabase.from("utenti_progetti").select("progetto_id").eq("utente_id", idFiltro);
        idsProgetti = data?.map((r) => r.progetto_id) || [];
        if (idsProgetti.length === 0) return [];
    }

    const query = supabase
        .from("progetti")
        .select(`
            id, slug, nome, consegna, note, tempo_stimato,
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

    return (data || []).map((p: any) => ({
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
    }));
}
