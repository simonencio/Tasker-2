// src/supporto/CaptchaStatus.tsx
export default function CaptchaStatus({ ready }: { ready: boolean }) {
    return (
        <p className="text-center text-sm">
            {ready
                ? "✔️ Protezione anti-bot attiva"
                : "❌ Captcha non configurato correttamente"}
        </p>
    );
}
