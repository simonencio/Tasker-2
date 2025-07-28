// src/Notifiche/notificheBrowserUtils.ts

export async function richiediPermessoNotificheBrowser() {
    if (!("Notification" in window)) {
        console.warn("Questo browser non supporta le notifiche desktop.");
        return;
    }

    if (Notification.permission === "default") {
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                console.log("Permesso notifiche concesso.");
            } else if (permission === "denied") {
                console.warn("Permesso notifiche negato dall'utente.");
            }
        } catch (error) {
            console.error("Errore nella richiesta di permesso per le notifiche:", error);
        }
    }
}

export function mostraNotificaBrowser(titolo: string, opzioni?: NotificationOptions) {
    if (Notification.permission === "granted") {
        new Notification(titolo, opzioni);
    }
}
