// src/Liste/AltreListe.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { faFlag, faUserShield, faExclamationTriangle, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import ListaGenerica from "./ListaGenerica";
import MiniStatoEditorModal from "../Modifica/MiniStatoEditorModal";
import MiniRuoloEditorModal from "../Modifica/MiniRuoloEditorModal";
import MiniPrioritaEditorModal from "../Modifica/MiniPrioritaEditorModal";

type Stato = { id: number; nome: string; colore?: string | null };
type Ruolo = { id: number; nome: string };
type Priorita = { id: number; nome: string; colore?: string | null };

type Props = { onApriModale: (type: "stato" | "priorita" | "ruolo") => void };

export default function AltreListe({ onApriModale }: Props) {
    const [stati, setStati] = useState<Stato[]>([]);
    const [ruoli, setRuoli] = useState<Ruolo[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [loadingStati, setLoadingStati] = useState(true);
    const [loadingRuoli, setLoadingRuoli] = useState(true);
    const [loadingPriorita, setLoadingPriorita] = useState(true);

    // Carica Stati
    useEffect(() => {
        const caricaStati = async () => {
            setLoadingStati(true);
            const { data, error } = await supabase
                .from("stati")
                .select("id, nome, colore, deleted_at")
                .order("id", { ascending: true });
            if (!error && data) setStati(data.filter((s: any) => !s.deleted_at));
            setLoadingStati(false);
        };
        caricaStati();
    }, []);

    // Carica Ruoli
    useEffect(() => {
        const caricaRuoli = async () => {
            setLoadingRuoli(true);
            const { data, error } = await supabase
                .from("ruoli")
                .select("id, nome, deleted_at")
                .order("id", { ascending: true });
            if (!error && data) setRuoli(data.filter((r: any) => !r.deleted_at));
            setLoadingRuoli(false);
        };
        caricaRuoli();
    }, []);

    // Carica Priorità
    useEffect(() => {
        const caricaPriorita = async () => {
            setLoadingPriorita(true);
            const { data, error } = await supabase
                .from("priorita")
                .select("id, nome, colore, deleted_at")
                .order("id", { ascending: true });
            if (!error && data) setPriorita(data.filter((p: any) => !p.deleted_at));
            setLoadingPriorita(false);
        };
        caricaPriorita();
    }, []);

    return (
        <div className="space-y-8">
            {/* Lista Stati */}
            <ListaGenerica<Stato>
                titolo="Lista Stati"
                icona={faFlag}
                coloreIcona="text-green-500"
                tipo="stati"
                dati={stati}
                loading={loadingStati}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
                    {
                        chiave: "colore",
                        label: "Colore",
                        className: "w-20 text-center",
                        render: (s) =>
                            s.colore ? (
                                <span
                                    className="inline-block w-5 h-5 rounded-full border"
                                    style={{ backgroundColor: s.colore }}
                                ></span>
                            ) : (
                                "-"
                            ),
                    },
                ]}
                renderModaleModifica={(id, onClose) => (
                    <MiniStatoEditorModal statoId={id} onClose={onClose} />
                )}
                azioniExtra={
                    <button
                        type="button"
                        onClick={() => onApriModale("stato")}
                        className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Crea
                    </button>
                }
            />

            {/* Lista Ruoli */}
            <ListaGenerica<Ruolo>
                titolo="Lista Ruoli"
                icona={faUserShield}
                coloreIcona="text-blue-500"
                tipo="ruoli"
                dati={ruoli}
                loading={loadingRuoli}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
                ]}
                renderModaleModifica={(id, onClose) => (
                    <MiniRuoloEditorModal ruoloId={id} onClose={onClose} />
                )}
                azioniExtra={
                    <button
                        type="button"
                        onClick={() => onApriModale("ruolo")}
                        className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Crea
                    </button>
                }
            />

            {/* Lista Priorità */}
            <ListaGenerica<Priorita>
                titolo="Lista Priorità"
                icona={faExclamationTriangle}
                coloreIcona="text-red-500"
                tipo="priorita"
                dati={priorita}
                loading={loadingPriorita}
                colonne={[
                    { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
                    {
                        chiave: "colore",
                        label: "Colore",
                        className: "w-20 text-center",
                        render: (p) =>
                            p.colore ? (
                                <span
                                    className="inline-block w-5 h-5 rounded-full border"
                                    style={{ backgroundColor: p.colore }}
                                ></span>
                            ) : (
                                "-"
                            ),
                    },
                ]}
                renderModaleModifica={(id, onClose) => (
                    <MiniPrioritaEditorModal prioritaId={id} onClose={onClose} />
                )}
                azioniExtra={
                    <button
                        type="button"
                        onClick={() => onApriModale("priorita")}
                        className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Crea
                    </button>
                }
            />
        </div>
    );
}
