// src/Componenti/MetricheWidget.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function MetricheWidget({ userId }: { userId?: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [doingCount, setDoingCount] = useState(0);

  const { startISO, endISO, labelSettimana } = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=dom, 1=lun...
    const diffToMonday = (day + 6) % 7;

    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      startISO: monday.toISOString(),
      endISO: sunday.toISOString(),
      labelSettimana: `Settimana ${monday.toLocaleDateString("it-IT")} – ${sunday.toLocaleDateString("it-IT")}`,
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Solo RPC metriche tasks (completate / in corso)
        const { data: metrics, error: mErr } = await supabase
          .rpc("tasks_metrics_week", { _start: startISO, _end: endISO });

        if (mErr) throw mErr;
        const first = Array.isArray(metrics) ? metrics[0] : metrics;
        const done = Number(first?.done_count ?? 0);
        const doing = Number(first?.doing_count ?? 0);

        if (!alive) return;
        setDoneCount(done);
        setDoingCount(doing);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Errore nel caricamento delle metriche");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [startISO, endISO]);

  const totale = Math.max(1, doneCount + doingCount);
  const completatePct = Math.round((doneCount / totale) * 100);

  return (
    <div className="card-theme p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-150">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faChartBar} />
          Metriche (settimana)
        </h3>
        <span className="text-xs opacity-70">{labelSettimana}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm opacity-80">
          <FontAwesomeIcon icon={faSpinner} spin />
          Caricamento…
        </div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : (
        <div className="space-y-3">
          {/* KPI (solo 2 card) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-task rounded-lg p-3">
              <div className="text-xs opacity-70">Completate</div>
              <div className="text-2xl font-bold leading-tight">{doneCount}</div>
            </div>
            <div className="bg-task-modal rounded-lg p-3">
              <div className="text-xs opacity-70">In corso</div>
              <div className="text-2xl font-bold leading-tight">{doingCount}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>% completate</span>
              <span className="opacity-70">{completatePct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded">
              <div
                className="h-2 bg-button-oggi rounded"
                style={{ width: `${completatePct}%` }}
              />
            </div>
          </div>

          {/* Nota */}
          <p className="text-xs opacity-70 flex items-center gap-1">
            <FontAwesomeIcon icon={faCheckCircle} />
            Calcolate via RPC: completed_at / flag stato + due_date/scadenza/created_at.
          </p>
        </div>
      )}
    </div>
  );
}
