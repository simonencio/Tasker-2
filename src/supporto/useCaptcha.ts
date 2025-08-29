// src/supporto/useCaptcha.ts
import { useEffect, useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

/**
 * Hook universale per gestire reCAPTCHA v3
 */
export function useCaptcha(action: string) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [captchaReady, setCaptchaReady] = useState(false);
    const [lastToken, setLastToken] = useState<string | null>(null);

    // Check iniziale per verificare se la Site Key è configurata
    useEffect(() => {
        const check = async () => {
            if (!executeRecaptcha) {
                console.warn("⚠️ executeRecaptcha non disponibile");
                return;
            }
            try {
                const token = await executeRecaptcha("check_sitekey");
                if (token) {
                    console.log("✅ reCAPTCHA token ricevuto:", token);
                    setCaptchaReady(true);
                }
            } catch (err) {
                console.error("❌ Errore esecuzione captcha:", err);
                setCaptchaReady(false);
            }
        };
        check();
    }, [executeRecaptcha]);

    const runCaptcha = async (): Promise<string | null> => {
        if (!executeRecaptcha) return null;
        try {
            const token = await executeRecaptcha(action);
            setLastToken(token);
            console.log(`🔑 Token per azione "${action}":`, token);
            return token;
        } catch (err) {
            console.error(`❌ Errore durante l'esecuzione captcha per "${action}":`, err);
            return null;
        }
    };

    return { captchaReady, runCaptcha, lastToken };
}
