// supporto/traduzioniColori.ts
export const traduzioniColori: Record<string, string> = {
    rosso: "red",
    blu: "blue",
    verde: "green",
    giallo: "yellow",
    nero: "black",
    bianco: "white",
    arancione: "orange",
    viola: "purple",
    grigio: "gray",
    marrone: "brown",
};

// ITA → ENG
export const traduciColore = (colore: string): string => {
    const lower = colore.trim().toLowerCase();
    return traduzioniColori[lower] || colore;
};

// ENG → ITA
export const traduciColoreInverso = (coloreEng: string): string => {
    const lower = coloreEng.trim().toLowerCase();
    const trovato = Object.entries(traduzioniColori).find(
        ([, eng]) => eng === lower
    );
    return trovato ? trovato[0] : coloreEng;
};
