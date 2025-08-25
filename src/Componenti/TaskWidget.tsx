// src/Componenti/TaskWidget.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { resourceConfigs } from "../Liste/resourceConfigs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTasks } from "@fortawesome/free-solid-svg-icons";

type Task = any;
type Vista = "list" | "cards" | "board";

const VIEW_STORAGE_KEY = "widget_view_tasks";
const MAX_ITEMS = 6;

export default function TaskWidget() {
  const navigate = useNavigate();
  const cfg = resourceConfigs.tasks;

  const [utenteId, setUtenteId] = useState<string | null>(null);
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState<Vista>(() => {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return v === "cards" || v === "board" ? v : "list";
  });

  const [extra, setExtra] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        if (!alive) return;
        setErrorMsg("Impossibile ottenere l'utente");
        setLoading(false);
        return;
      }
      if (!alive) return;
      setUtenteId(user.id);

      try {
        const data = await cfg.fetch({ filtro: { soloMie: true }, utenteId: user.id });
        if (!alive) return;
        setItems((data || []).slice(0, MAX_ITEMS));
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message ?? "Errore caricamento task");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!utenteId || typeof cfg.setup !== "function") return;
    const handle = cfg.setup({ utenteId });
    setExtra(handle?.extra ?? null);
    return () => { try { handle?.dispose?.(); } catch { } };
  }, [utenteId]);

  const ctx = useMemo(() => ({
    filtro: { soloMie: true },
    setFiltro: (_f: any) => { },
    items,
    utenteId,
    navigate: (to: string) => navigate(to),
    extra,
  }), [items, utenteId, navigate, extra]);

  const handleTitleClick = () => {
    const qs = view === "list" ? "" : `?view=${view}`;
    navigate(`/task${qs}`);
  };

  return (
    <div className="card-theme w-full h-auto p-3 rounded-2xl shadow-sm hover:shadow-md transition-[box-shadow,transform] duration-150 cursor-default">
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-lg font-semibold text-theme dark:text-theme cursor-pointer hover:underline flex items-center gap-2"
          onClick={handleTitleClick}
          title="Vai a Task"
        >
          <FontAwesomeIcon icon={faTasks} />
          Task
        </h3>

        <select
          className="input-style text-sm"
          value={view}
          onChange={(e) => setView(e.target.value as Vista)}
        >
          <option value="list">Lista</option>
          <option value="cards">Card</option>
          <option value="board">Bacheca</option>
        </select>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Caricamento...</p>
      ) : errorMsg ? (
        <p className="text-sm text-red-500">{errorMsg}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nessun task</p>
      ) : view === "list" ? (
        <ListaCompatta items={items} />
      ) : view === "cards" ? (
        <CardsCompatte items={items} />
      ) : (
        <BachecaCompatta items={items} />
      )}
    </div>
  );

  function ListaCompatta({ items }: { items: Task[] }) {
    const cols = cfg.colonne ?? [];
    return (
      <ul className="space-y-2">
        {items.map((item: Task) => (
          <li
            key={item.id}
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
              {cols.map((col, i) => (
                <div
                  key={i}
                  className={`col-span-12 sm:col-span-6 lg:col-span-3 min-w-0 truncate ${col.className ?? ""}`}
                  title={typeof col.chiave === "string" ? (item[col.chiave] as any) : undefined}
                >
                  {col.render ? col.render(item, ctx) : safeGet(item, col.chiave)}
                </div>
              ))}
            </div>

            {typeof cfg.azioni === "function" && (
              <div
                className="flex items-center gap-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {cfg.azioni(item, ctx)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  function CardsCompatte({ items }: { items: Task[] }) {
    return (
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {items.map((item: Task) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:shadow-sm h-auto"
          >
            <div className="font-semibold mb-1">
              {renderCol("nome", item) ?? (item?.nome ?? "—")}
            </div>

            {typeof cfg.renderDettaglio === "function" ? (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {cfg.renderDettaglio(item, ctx)}
              </div>
            ) : null}

            {typeof cfg.azioni === "function" && (
              <div className="flex items-center gap-3 mt-2">
                {cfg.azioni(item, ctx)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function BachecaCompatta({ items }: { items: Task[] }) {
    const groups = useMemo(() => {
      const m = new Map<string, Task[]>();
      for (const t of items) {
        const key = t?.stato?.nome ?? "Senza stato";
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(t);
      }
      return Array.from(m.entries());
    }, [items]);

    return (
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {groups.map(([stato, list]) => (
          <div key={stato} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2 h-auto">
            <div className="text-sm font-semibold mb-2">{stato}</div>
            <div className="space-y-2">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 h-auto"
                >
                  <div className="font-medium truncate">{item.nome}</div>
                  {typeof cfg.renderDettaglio === "function" ? (
                    <div className="text-xs opacity-80 mt-1">
                      {cfg.renderDettaglio(item, ctx)}
                    </div>
                  ) : null}
                  {typeof cfg.azioni === "function" && (
                    <div className="flex items-center gap-2 mt-2">
                      {cfg.azioni(item, ctx)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderCol(colKey: string, item: Task) {
    const col = (cfg.colonne ?? []).find((c) => c.chiave === colKey);
    if (!col) return safeGet(item, colKey);
    return col.render ? col.render(item, ctx) : safeGet(item, colKey);
  }

  function safeGet(obj: any, key: any) {
    try {
      const v = obj?.[key];
      if (v == null) return "—";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    } catch {
      return "—";
    }
  }
}
