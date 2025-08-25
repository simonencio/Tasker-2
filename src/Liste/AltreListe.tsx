import { useEffect, useState } from "react";
import { faFlag, faUserShield, faExclamationTriangle, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import ListaGenerica from "./ListaGenerica";
import MiniStatoEditorModal from "../Modifica/MiniStatoEditorModal";
import MiniRuoloEditorModal from "../Modifica/MiniRuoloEditorModal";
import MiniPrioritaEditorModal from "../Modifica/MiniPrioritaEditorModal";
import { fetchStati, fetchRuoli, fetchPriorita } from "../supporto/fetchData";

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

    useEffect(() => {
        fetchStati().then(setStati).finally(() => setLoadingStati(false));
        fetchRuoli().then(setRuoli).finally(() => setLoadingRuoli(false));
        fetchPriorita().then(setPriorita).finally(() => setLoadingPriorita(false));
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
