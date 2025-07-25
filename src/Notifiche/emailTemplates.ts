export function generaContenutoEmail({
    nomeUtente,
    descrizioneTipo,
    messaggio,
}: {
    nomeUtente: string;
    descrizioneTipo: string;
    messaggio: string;
}): { subject: string; body: string } {
    const subject = `📢 ${descrizioneTipo}`;

    const body = `
Ciao ${nomeUtente},

Hai ricevuto una nuova notifica sulla piattaforma *Tasker*:

──────────────────────────────
📌 Tipo: ${descrizioneTipo}
💬 Messaggio: ${messaggio}
──────────────────────────────

🔗 Puoi accedere a Tasker per maggiori dettagli al seguente link:
http://localhost:5173/home

Se non desideri ricevere queste email, puoi aggiornare le tue preferenze di notifica direttamente dal tuo profilo utente.

Grazie per utilizzare Tasker!

—
Questa email è stata inviata automaticamente in base alle tue impostazioni di notifica.
  `.trim();

    return { subject, body };
}
