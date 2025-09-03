import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";

import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPen, faCommentDots } from "@fortawesome/free-solid-svg-icons";

import { isUtenteAdmin } from "../supporto/ruolo";

import { Chip, StatoBadge, AvatarChip, Section, MetaField } from "../supporto/ui";
import type { Utente, Progetto } from "../supporto/tipi";
import GenericEditorModal from "../Modifica/GenericEditorModal";

import ListaDinamica from "../Liste/ListaDinamica";
import { resourceConfigs } from "../Liste/resourceConfigs";

/* ============================== Utils ============================== */
function formatDurata(value?: number | string | null): string {
    if (!value && value !== 0) return "—";
    if (typeof value === "number") {
        const h = Math.floor(value / 3600),
            m = Math.floor((value % 3600) / 60),
            s = value % 60;
        if (h > 0 && s > 0) return `${h}h ${m}m ${s}s`;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0 && s > 0) return `${m}m ${s}s`;
        if (m > 0) return `${m}m`;
        return `${s}s`;
    }
    return "—";
}

/* ============================== Component ============================== */
export default function DettaglioProgetto() {
    const { slug } = useParams<{ slug: string }>();

    const [progetto, setProgetto] = useState<Progetto | null>(null);
    const progettoId = progetto?.id ?? null;

    const [loading, setLoading] = useState(true);
    const [modaleAperta, setModaleAperta] = useState(false);
    const [, setIsAdmin] = useState(false);
    const [membri, setMembri] = useState<Utente[]>([]);
    const [totaleProgettoSec, setTotaleProgettoSec] = useState(0);

    // Admin check
    useEffect(() => {
        isUtenteAdmin().then((res) => setIsAdmin(res));
    }, []);

    // Carica progetto da slug
    useEffect(() => {
        const fetchProgetto = async () => {
            if (!slug) return;
            const { data } = await supabase
                .from("progetti")
                .select(
                    `
          id, nome, slug, note, consegna, tempo_stimato,
          cliente:clienti(id, nome),
          stato:stati(id, nome, colore),
          priorita(id, nome),
          fine_progetto
        `
                )
                .eq("slug", slug)
                .single<Progetto>();

            if (data) setProgetto({ ...data, membri: [] });
            setLoading(false);
        };
        fetchProgetto();
    }, [slug]);

    // Carica membri del progetto
    useEffect(() => {
        const fetchMembri = async () => {
            if (!progettoId) return;
            const { data } = await supabase
                .from("utenti_progetti")
                .select("utenti:utente_id ( id, nome, cognome, avatar_url )")
                .eq("progetto_id", progettoId);

            const utenti: Utente[] = (data || []).map((r: any) => r.utenti);
            setMembri(utenti);
            setProgetto((p) => (p ? { ...p, membri: utenti } : p));
        };
        fetchMembri();
    }, [progettoId]);

    // Calcola durata totale registrata sul progetto
    useEffect(() => {
        const fetchDurate = async () => {
            if (!progettoId) return;
            const { data } = await supabase
                .from("time_entries")
                .select("durata")
                .eq("progetto_id", progettoId);

            const totale = (data || []).reduce((acc, r) => acc + (r.durata || 0), 0);
            setTotaleProgettoSec(totale);
        };
        fetchDurate();
    }, [progettoId]);

    /* ---------- props stabili per ListaDinamica ---------- */
    const fetchTasksProgetto = useCallback(
        async ({
            filtro,
            utenteId,
        }: {
            filtro: any;
            utenteId: string | null;
        }) => {
            return resourceConfigs.tasks.fetch({
                filtro: { ...(filtro ?? {}), progetto: progettoId },
                utenteId: utenteId ?? null,
            });
        },
        [progettoId]
    );

    const configTasksOverride = useMemo(() => {
        return {
            ...resourceConfigs.tasks,
            titolo: "Task del progetto",
            fetch: fetchTasksProgetto,
        } as typeof resourceConfigs.tasks;
    }, [fetchTasksProgetto]);

    /* ---------- Render ---------- */
    if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
    if (!progetto || !progettoId) return <div className="p-6 text-theme">Progetto non trovato</div>;

    return (
        <div className="min-h-screen bg-theme text-theme">
            <div className="p-6 max-w-6xl mx-auto w-full">
                {/* titolo */}
                <h1 className="text-2xl font-bold mb-4 text-theme flex flex-row items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-row items-center gap-2">
                        📁 {progetto.nome}
                        <button
                            onClick={() => setModaleAperta(true)}
                            className="text-yellow-500 hover:text-yellow-600 transition"
                        >
                            <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                        </button>
                    </div>
                </h1>

                {/* metacard progetto */}
                <div className="rounded-xl border border-theme/20 card-theme p-5 text-[15px] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MetaField label="Cliente">
                            <Chip>{progetto.cliente?.nome ?? "—"}</Chip>
                        </MetaField>
                        <MetaField label="Consegna">
                            <Chip>{progetto.consegna ? new Date(progetto.consegna).toLocaleDateString() : "—"}</Chip>
                        </MetaField>
                        <MetaField label="Stato">
                            <StatoBadge nome={progetto.stato?.nome} colore={progetto.stato?.colore as any} />
                        </MetaField>
                        <MetaField label="Priorità">
                            <Chip>{progetto.priorita?.nome ?? "—"}</Chip>
                        </MetaField>
                        <MetaField label="Tempo stimato">
                            <Chip>{formatDurata(progetto.tempo_stimato)}</Chip>
                        </MetaField>
                        <MetaField label="Tempo registrato">
                            <Chip>{formatDurata(totaleProgettoSec)}</Chip>
                        </MetaField>
                    </div>

                    {membri.length > 0 && (
                        <Section icon={faUsers} title="Membri">
                            <div className="flex flex-wrap gap-2 gap-y-3">
                                {membri.map((m) => (
                                    <AvatarChip key={m.id} utente={m} />
                                ))}
                            </div>
                        </Section>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={() => setModaleAperta(true)}
                            className="px-3 py-2 rounded-xl card-theme hover-bg-theme text-[15px] flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faPen} /> Modifica
                        </button>
                        <button
                            onClick={() => console.log("Commenti progetto (TODO)")}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-[15px] flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faCommentDots} /> Commenti
                        </button>
                    </div>
                </div>

                {/* lista dinamica task del progetto */}
                <div className="mt-8">
                    <ListaDinamica
                        key={`tasks-progetto-${progettoId}`} // remount solo quando cambia progetto
                        tipo="tasks"
                        minimalHeader
                        configOverride={configTasksOverride}
                    />
                </div>
            </div>

            {modaleAperta && progettoId && (
                <GenericEditorModal table="progetti" id={progettoId} onClose={() => setModaleAperta(false)} />
            )}
        </div>
    );
}
