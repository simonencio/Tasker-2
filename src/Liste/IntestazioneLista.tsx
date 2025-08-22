// src/components/IntestazioneLista.tsx
import { type ReactNode, type JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

type Props = {
    titolo: string | JSX.Element;
    icona: any; // icona FontAwesome
    coloreIcona?: string;
    azioniExtra?: ReactNode;
    tipo: "tasks" | "progetti" | "utenti" | "clienti" | "stati" | "priorita" | "ruoli"; // 👈 aggiunti
};

export default function IntestazioneLista({ titolo, icona, coloreIcona, azioniExtra, tipo }: Props) {
    const navigate = useNavigate();

    return (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-theme flex items-center">
                <FontAwesomeIcon icon={icona} className={`${coloreIcona || ""} mr-2`} />
                {titolo}
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
                {azioniExtra}
                <button
                    onClick={() => navigate(`/cestino/${tipo}`)}
                    className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faTrash} />
                    Cestino
                </button>
            </div>
        </div>
    );
}
