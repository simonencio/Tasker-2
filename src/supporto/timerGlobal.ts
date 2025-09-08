// src/supporto/timerGlobal.ts
import { supabase } from "./supabaseClient";

const TIMER_KEY = "kal_active_task_timer";

type Store = { taskId: string; taskName: string; progettoId?: string|null; startISO: string; };

async function handleStop() {
  const raw = localStorage.getItem(TIMER_KEY);
  if (!raw) return;

  let store: Store | null = null;
  try { store = JSON.parse(raw); } catch { store = null; }
  if (!store) return;

  // utente corrente
  const { data: { user } } = await supabase.auth.getUser();
  const utenteId = user?.id ?? null;

  const start = new Date(store.startISO);
  const end = new Date();
  const durata = Math.max(1, Math.floor((end.getTime() - start.getTime())/1000));

  if (utenteId && store.progettoId) {
    await supabase.from("time_entries").insert({
      utente_id: utenteId,
      progetto_id: store.progettoId,
      task_id: store.taskId,
      nome: store.taskName,
      data_inizio: start.toISOString(),
      data_fine: end.toISOString(),
      durata,
    });
  }

  localStorage.removeItem(TIMER_KEY);
  window.dispatchEvent(new CustomEvent("tasks:timerChanged"));
}

// registra una sola volta
if (!(window as any).__timerGlobalWired) {
  window.addEventListener("tasks:timerStopRequest", handleStop as any);
  (window as any).__timerGlobalWired = true;
}
