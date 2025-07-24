export function generaContenutoEmail({
    nomeUtente,
    descrizioneTipo,
    messaggio,
}: {
    nomeUtente: string;
    descrizioneTipo: string;
    messaggio: string;
}): { subject: string; body: string } {
    const subject = `📌 ${descrizioneTipo}`;

    const body = `
Ciao ${nomeUtente},

Hai ricevuto una nuova notifica:

🔔 ${messaggio}

Accedi alla piattaforma per maggiori dettagli

—
Hai ricevuto questa email in base alle tue preferenze notifiche.
`.trim();

    return { subject, body };
}
