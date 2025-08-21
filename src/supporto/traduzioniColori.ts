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

export const traduciColore = (colore: string): string => {
    const lower = colore.trim().toLowerCase();
    return traduzioniColori[lower] || colore; // se non trova, lascia invariato
};
