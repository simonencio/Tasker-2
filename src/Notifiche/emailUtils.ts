export async function inviaEmailNotifica({
    to,
    subject,
    body,
}: {
    to: string;
    subject: string;
    body: string;
}) {
    const response = await fetch("https://kieyhhmxinmdsnfdglrm.supabase.co/functions/v1/sendEmail", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: to, subject, body }),
    });

    const text = await response.text();
    if (!response.ok) {
        console.error("❌ Errore invio email:", text);
    } else {
        console.log("✅ Email inviata:", text);
    }
}
