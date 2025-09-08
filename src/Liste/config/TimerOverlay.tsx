// src/Liste/config/TimerOverlay.tsx
import { useEffect, useMemo, useState } from "react";

const TIMER_KEY = "kal_active_task_timer";

type ActiveTimerStore = {
    taskId: string;
    taskName: string;
    progettoId?: string | null;
    startISO: string;
};

function readTimer(): ActiveTimerStore | null {
    try {
        const raw = localStorage.getItem(TIMER_KEY);
        return raw ? (JSON.parse(raw) as ActiveTimerStore) : null;
    } catch {
        return null;
    }
}

export const TimerOverlay = () => {
    const [data, setData] = useState<ActiveTimerStore | null>(() => readTimer());
    const [, tick] = useState(0);

    useEffect(() => {
        const onChange = () => setData(readTimer());
        window.addEventListener("tasks:timerChanged", onChange as any);
        return () => window.removeEventListener("tasks:timerChanged", onChange as any);
    }, []);

    useEffect(() => {
        if (!data) return;
        const id = setInterval(() => tick((x) => x + 1), 1000);
        return () => clearInterval(id);
    }, [data]);

    const elapsed = useMemo(() => {
        if (!data) return "0s";
        const start = new Date(data.startISO).getTime();
        const diff = Math.max(0, Date.now() - start) / 1000;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = Math.floor(diff % 60);
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }, [data, Date.now()]);

    if (!data) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-[9998] rounded-2xl shadow-xl border border-theme bg-theme-80 text-theme px-4 py-3 flex items-center gap-3"
            role="status"
        >
            <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
            <div className="text-sm">
                <div className="font-semibold">Timer attivo</div>
                <div className="opacity-80 max-w-[260px] truncate">{data.taskName}</div>
                <div className="text-xs opacity-70">⏱ {elapsed}</div>
            </div>
            <button
                className="ml-3 text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-500"
                onClick={() => {
                    window.dispatchEvent(new CustomEvent("tasks:timerStopRequest"));
                }}
                title="Ferma e salva"
            >
                Stop
            </button>
        </div>

    );
};
