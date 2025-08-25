// src/components/IntestazioneLista.tsx
import { type ReactNode, type JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type Props = {
    titolo: string | JSX.Element;
    icona: any; // icona FontAwesome
    coloreIcona?: string;
    azioniExtra?: ReactNode;
    tipo: "tasks" | "progetti" | "utenti" | "clienti" | "stati" | "priorita" | "ruoli"; // 👈 aggiunti
    modalitaCestino?: boolean; // 👈
};

export default function IntestazioneLista({ titolo, icona, coloreIcona, azioniExtra, }: Props) {

    return (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-theme flex items-center">
                <FontAwesomeIcon icon={icona} className={`${coloreIcona || ""} mr-2`} />
                {titolo}
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
                {azioniExtra}

            </div>
        </div>
    );
}
