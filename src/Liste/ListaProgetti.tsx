import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faProjectDiagram, faCheckCircle } from "@fortawesome/free-solid-svg-icons";

import MiniProjectEditorModal from "../Modifica/MiniProjectEditorModal";
import FiltriGenericiAvanzati, {
    type FiltroAvanzatoGenerico,
    ordinaClientSide,
} from "../supporto/FiltriGenericiAvanzati";
import type { Progetto, Utente } from "../supporto/tipi";
import ListaGenerica from "./ListaGenerica";
import { supabase } from "../supporto/supabaseClient";
import { fetchProgetti } from "../supporto/fetchData";

type TaskBreve = {
    id: string;
    nome: string;
    consegna: string | null;
    assegnatari: Utente[];
};

type ProgettoConSlug = Progetto & { slug: string };

export default function ListaProgetti() {
    const [progetti, setProgetti] = useState<ProgettoConSlug[]>([]);
    const [taskPerProgetto] = useState<Record<string, TaskBreve[]>>({});
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [progettiCompletati] = useState<Set<string>>(new Set());
    const [soloCompletati, setSoloCompletati] = useState(false);
    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzatoGenerico>({});

    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUtenteId(user.id);
        });
    }, []);

    useEffect(() => {
        const caricaProgetti = async () => {
            setLoading(true);
            try {
                const data = await fetchProgetti(
                    { ...filtroAvanzato, soloMie },
                    utenteId ?? undefined
                );

                setProgetti(
                    ordinaClientSide(data, filtroAvanzato.ordine ?? null, (proj, criterio) => {
                        switch (criterio) {
                            case "consegna_asc":
                            case "consegna_desc":
                                return proj.consegna;
                            case "stato_az":
                            case "stato_za":
                                return proj.stato?.nome;
                            case "nome_az":
                            case "nome_za":
                                return proj.nome;
                            case "priorita_urgente":
                            case "priorita_meno_urgente":
                                return proj.priorita?.id;
                            default:
                                return proj.nome;
                        }
                    })
                );
            } finally {
                setLoading(false);
            }
        };

        if (utenteId) caricaProgetti();
    }, [soloMie, filtroAvanzato, utenteId]);

    const formatConsegna = (val: string | null) =>
        val ? new Date(val).toLocaleDateString() : "—";

    const formatTempoStimato = (val?: string | null) => {
        if (!val) return "";
        const match = val.match(/(\d+):(\d+)/);
        if (!match) return val;
        const ore = parseInt(match[1], 10);
        const minuti = parseInt(match[2], 10);
        return `${ore > 0 ? `${ore}h ` : ""}${minuti}m`;
    };

    return (
        <>
            <ListaGenerica<ProgettoConSlug>
                titolo="Lista Progetti"
                icona={faProjectDiagram}
                coloreIcona="text-blue-500"
                tipo="progetti"
                dati={progetti.filter((p) => !soloCompletati || progettiCompletati.has(p.id))}
                loading={loading}
                colonne={[
                    {
                        chiave: "nome",
                        label: "Nome",
                        render: (proj) => (
                            <div className="flex items-center gap-2">
                                {proj.membri.some((m) => m.id === utenteId) && (
                                    <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Membro" />
                                )}
                                {progettiCompletati.has(proj.id) && (
                                    <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completato" />
                                )}
                                <span>{proj.nome}</span>
                            </div>
                        ),
                    },
                    {
                        chiave: "consegna",
                        label: "Consegna",
                        className: "w-40 hidden lg:block",
                        render: (p) => formatConsegna(p.consegna),
                    },
                    {
                        chiave: "stato",
                        label: "Stato",
                        className: "w-32 hidden lg:block",
                        render: (p) => p.stato?.nome ?? "—",
                    },
                    {
                        chiave: "priorita",
                        label: "Priorità",
                        className: "w-32 hidden lg:block",
                        render: (p) => p.priorita?.nome ?? "—",
                    },
                ]}
                azioni={(proj) => (
                    <button
                        onClick={() => navigate(`/progetti/${proj.slug}`)}
                        className="icon-color hover:text-green-600"
                        title="Vai al dettaglio"
                    >
                        <FontAwesomeIcon icon={faProjectDiagram} />
                    </button>
                )}
                renderDettaglio={(proj) => (
                    <div className="space-y-1">
                        {proj.cliente?.nome && <p>👤 Cliente: {proj.cliente.nome}</p>}
                        {proj.membri.length > 0 && (
                            <p>👥 Membri: {proj.membri.map((m) => `${m.nome} ${m.cognome ?? ""}`).join(", ")}</p>
                        )}
                        {proj.tempo_stimato && <p>⏱️ Tempo stimato: {formatTempoStimato(proj.tempo_stimato)}</p>}
                        {proj.note && <p>🗒️ Note: {proj.note}</p>}
                        <div className="pt-2">
                            <p className="font-semibold mb-1">📌 Task assegnate:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                {(taskPerProgetto[proj.id] ?? []).map((t) => (
                                    <li key={t.id}>
                                        📝 {t.nome} |{" "}
                                        {t.assegnatari.map((u) => `${u.nome} ${u.cognome ?? ""}`).join(", ") || "—"} |{" "}
                                        {t.consegna ? new Date(t.consegna).toLocaleDateString() : "—"}
                                    </li>
                                ))}
                                {(taskPerProgetto[proj.id] ?? []).length === 0 && (
                                    <li className="italic text-gray-500">Nessuna task assegnata</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}
                azioniExtra={
                    <>
                        {/* Toggle Mie */}
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faLink} className="w-5 h-5 text-blue-600" />
                            <span className="text-theme font-medium">Mie</span>
                            <div
                                onClick={() => setSoloMie(v => !v)}
                                className={`toggle-theme ${soloMie ? "active" : ""}`}
                            >
                                <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                            </div>
                        </div>

                        {/* Toggle Completati */}
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-600" />
                            <span className="text-theme font-medium">Completati</span>
                            <div
                                onClick={() => setSoloCompletati(v => !v)}
                                className={`toggle-theme ${soloCompletati ? "active" : ""}`}
                            >
                                <div className={`toggle-thumb ${soloCompletati ? "translate" : ""}`} />
                            </div>
                        </div>
                    </>
                }
                filtri={
                    <FiltriGenericiAvanzati<ProgettoConSlug>
                        dati={progetti}
                        campi={["utente", "cliente", "stato", "priorita", "date", "ordine"]}
                        estrattori={{
                            utente: (p) => p.membri?.map((m) => ({ id: m.id, nome: m.nome })) ?? [],
                            cliente: (p) => (p.cliente ? { id: p.cliente.id, nome: p.cliente.nome } : null),
                            stato: (p) => (p.stato ? { id: p.stato.id, nome: p.stato.nome } : null),
                            priorita: (p) => (p.priorita ? { id: p.priorita.id, nome: p.priorita.nome } : null),
                            consegna: (p) => p.consegna ?? null,
                        }}
                        onChange={setFiltroAvanzato}
                    />
                }
                renderModaleModifica={(id, onClose) => (
                    <MiniProjectEditorModal progettoId={id} onClose={onClose} />
                )}
            />
        </>
    );
}
