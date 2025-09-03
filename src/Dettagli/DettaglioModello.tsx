// src/Dettagli/DettaglioModello.tsx
// src/Pagine/Modelli.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faRotateRight, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };
type Cliente = { id: string; nome: string };

type TplProj = {
  id: string; nome: string; descrizione: string | null;
  default_cliente_id: string | null;
  default_stato_id: number | null;
  default_priorita_id: number | null;
  consegna_offset_days: number | null;
  default_tempo_stimato: string | null;
};
type TplTask = {
  id: string; nome: string; note: string | null;
  default_stato_id: number | null;
  default_priorita_id: number | null;
  consegna_offset_days: number | null;
  default_tempo_stimato: string | null;
};

export default function Modelli() {
  const [loading, setLoading] = useState(false);

  // lookups
  const [stati, setStati] = useState<Stato[]>([]);
  const [priorita, setPriorita] = useState<Priorita[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);

  // dati
  const [tplProj, setTplProj] = useState<TplProj[]>([]);
  const [tplTask, setTplTask] = useState<TplTask[]>([]);

  // filtri
  const [qProj, setQProj] = useState("");
  const [qTask, setQTask] = useState("");

  // record in editing
  const [editProj, setEditProj] = useState<TplProj | null>(null);
  const [editTask, setEditTask] = useState<TplTask | null>(null);

  // Stati per tempo stimato (ore/minuti) - Progetti
  const [oreProjEdit, setOreProjEdit] = useState(0);
  const [minutiProjEdit, setMinutiProjEdit] = useState(0);

  // Stati per tempo stimato (ore/minuti) - Task
  const [oreTaskEdit, setOreTaskEdit] = useState(0);
  const [minutiTaskEdit, setMinutiTaskEdit] = useState(0);

  const loadLookups = async () => {
    const [s, p, c] = await Promise.all([
      supabase.from("stati").select("id,nome").is("deleted_at", null),
      supabase.from("priorita").select("id,nome").is("deleted_at", null),
      supabase.from("clienti").select("id,nome").is("deleted_at", null),
    ]);
    if (s.data) setStati(s.data);
    if (p.data) setPriorita(p.data);
    if (c.data) setClienti(c.data);
  };

  const reloadProj = async () => {
    const { data } = await supabase
      .from("templates_progetti")
      .select("id,nome,descrizione,default_cliente_id,default_stato_id,default_priorita_id,consegna_offset_days,default_tempo_stimato")
      .order("nome", { ascending: true });
    setTplProj(data || []);
  };
  const reloadTask = async () => {
    const { data } = await supabase
      .from("templates_tasks")
      .select("id,nome,note,default_stato_id,default_priorita_id,consegna_offset_days,default_tempo_stimato")
      .order("nome", { ascending: true });
    setTplTask(data || []);
  };

  useEffect(() => { loadLookups(); reloadProj(); reloadTask(); }, []);

  // realtime
  useEffect(() => {
    const ch1 = supabase.channel("rt_tpl_proj")
      .on("postgres_changes", { event: "*", schema: "public", table: "templates_progetti" }, reloadProj)
      .subscribe();
    const ch2 = supabase.channel("rt_tpl_task")
      .on("postgres_changes", { event: "*", schema: "public", table: "templates_tasks" }, reloadTask)
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const filteredProj = useMemo(() => {
    const q = qProj.trim().toLowerCase();
    if (!q) return tplProj;
    return tplProj.filter(t => (t.nome?.toLowerCase() || "").includes(q) || (t.descrizione?.toLowerCase() || "").includes(q));
  }, [tplProj, qProj]);

  const filteredTask = useMemo(() => {
    const q = qTask.trim().toLowerCase();
    if (!q) return tplTask;
    return tplTask.filter(t => (t.nome?.toLowerCase() || "").includes(q) || (t.note?.toLowerCase() || "").includes(q));
  }, [tplTask, qTask]);

  const nomeStato = (id: number | null) => stati.find(s => s.id === id)?.nome ?? "";
  const nomePriorita = (id: number | null) => priorita.find(p => p.id === id)?.nome ?? "";
  const nomeCliente = (id: string | null) => clienti.find(c => c.id === id)?.nome ?? "";

  // Helper per parsing del tempo stimato
  const parseTempoStimato = (tempo: string | null): { ore: number; minuti: number } => {
    if (!tempo) return { ore: 0, minuti: 0 };
    const match = tempo.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i);
    return {
      ore: match ? parseInt(match[1], 10) : 0,
      minuti: match ? parseInt(match[2], 10) : 0
    };
  };

  const onDeleteProj = async (id: string) => {
    if (!confirm("Eliminare questo modello di progetto?")) return;
    await supabase.from("templates_progetti").delete().eq("id", id);
    await reloadProj();
  };
  const onDeleteTask = async (id: string) => {
    if (!confirm("Eliminare questo modello di task?")) return;
    await supabase.from("templates_tasks").delete().eq("id", id);
    await reloadTask();
  };

  const onSaveProj = async () => {
    if (!editProj) return;
    setLoading(true);
    
    // Genera stringa tempo stimato dalle ore e minuti
    const tempo_stimato = oreProjEdit || minutiProjEdit ? `${oreProjEdit} hours ${minutiProjEdit} minutes` : null;
    
    await supabase.from("templates_progetti").update({
      nome: editProj.nome?.trim() || null,
      descrizione: editProj.descrizione || null,
      default_cliente_id: editProj.default_cliente_id,
      default_stato_id: editProj.default_stato_id,
      default_priorita_id: editProj.default_priorita_id,
      consegna_offset_days: editProj.consegna_offset_days,
      default_tempo_stimato: tempo_stimato,
    }).eq("id", editProj.id);
    setEditProj(null);
    setLoading(false);
    await reloadProj();
  };
  
  const onSaveTask = async () => {
    if (!editTask) return;
    setLoading(true);
    
    // Genera stringa tempo stimato dalle ore e minuti
    const tempo_stimato = oreTaskEdit || minutiTaskEdit ? `${oreTaskEdit} hours ${minutiTaskEdit} minutes` : null;
    
    await supabase.from("templates_tasks").update({
      nome: editTask.nome?.trim() || null,
      note: editTask.note || null,
      default_stato_id: editTask.default_stato_id,
      default_priorita_id: editTask.default_priorita_id,
      consegna_offset_days: editTask.consegna_offset_days,
      default_tempo_stimato: tempo_stimato,
    }).eq("id", editTask.id);
    setEditTask(null);
    setLoading(false);
    await reloadTask();
  };

  // Handler per l'avvio della modifica progetto
  const startEditProj = (proj: TplProj) => {
    setEditProj(proj);
    const parsed = parseTempoStimato(proj.default_tempo_stimato);
    setOreProjEdit(parsed.ore);
    setMinutiProjEdit(parsed.minuti);
  };

  // Handler per l'avvio della modifica task
  const startEditTask = (task: TplTask) => {
    setEditTask(task);
    const parsed = parseTempoStimato(task.default_tempo_stimato);
    setOreTaskEdit(parsed.ore);
    setMinutiTaskEdit(parsed.minuti);
  };

  const baseInput = "w-full border rounded px-2 py-1 bg-theme text-theme";
  const baseCard  = "border rounded-lg p-4 bg-theme";
  const gridCols  = "grid grid-cols-1 md:grid-cols-2 gap-6";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Modelli</h1>

      {/* PROGETTI */}
      <section className={baseCard}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Modelli Progetti</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2.5 opacity-60" />
              <input className={`${baseInput} pl-8`} placeholder="Cerca..." value={qProj} onChange={e=>setQProj(e.target.value)} />
            </div>
            <button onClick={reloadProj} className="bg-theme px-3 py-1 rounded border ">
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          </div>
        </div>

        <div className={gridCols}>
          {filteredProj.map(t => (
            <div key={t.id} className="border rounded-lg p-3">
              {editProj?.id === t.id ? (
                <div className="space-y-2">
                  <label className="text-sm opacity-80">Nome</label>
                  <input className={baseInput} value={editProj.nome || ""} onChange={e=>setEditProj({...editProj, nome:e.target.value})} placeholder="Nome" />
                  <label className="text-sm opacity-80">Descrizione</label>
                  <textarea className={baseInput} rows={2} value={editProj.descrizione || ""} onChange={e=>setEditProj({...editProj, descrizione:e.target.value})} placeholder="Descrizione" />
                  <div className="grid grid-cols-2 gap-2">    
                    <label className="text-sm opacity-80">Cliente</label>
                    <label className="text-sm opacity-80">Stato</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={baseInput} value={editProj.default_cliente_id ?? ""} onChange={e=>setEditProj({...editProj, default_cliente_id: e.target.value || null})}>
                      <option value="">— Cliente predefinito —</option>
                      {clienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <select className={baseInput} value={editProj.default_stato_id ?? ""} onChange={e=>setEditProj({...editProj, default_stato_id: e.target.value ? +e.target.value : null})}>
                      <option value="">— Stato predefinito —</option>
                      {stati.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">    
                    <label className="text-sm opacity-80">Priorità</label>
                    <label className="text-sm opacity-80">Offset Consegna (giorni)</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={baseInput} value={editProj.default_priorita_id ?? ""} onChange={e=>setEditProj({...editProj, default_priorita_id: e.target.value ? +e.target.value : null})}>
                      <option value="">— Priorità predefinita —</option>
                      {priorita.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <input type="number" className={baseInput} placeholder="Offset consegna (giorni)" value={editProj.consegna_offset_days ?? ""} onChange={e=>setEditProj({...editProj, consegna_offset_days: e.target.value===""? null : +e.target.value})} />
                  </div>
                  <label className="text-sm opacity-80">Tempo Stimato</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={oreProjEdit} onChange={(e) => setOreProjEdit(+e.target.value)} className={baseInput}>
                      {[...Array(25).keys()].map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                    <select value={minutiProjEdit} onChange={(e) => setMinutiProjEdit(+e.target.value)} className={baseInput}>
                      {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}min</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={loading} onClick={onSaveProj} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">Salva</button>
                    <button onClick={()=>setEditProj(null)} className="px-3 py-1 rounded border">Annulla</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t.nome}</div>
                    <div className="flex gap-2">
                      <button onClick={()=>startEditProj(t)} className="px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"><FontAwesomeIcon icon={faPen} /></button>
                      <button onClick={()=>onDeleteProj(t.id)} className="px-2 py-1 rounded border hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                  </div>
                  {t.descrizione && <div className="text-sm opacity-80">{t.descrizione}</div>}
                  <div className="text-xs opacity-70">
                    {t.default_cliente_id && <span className="mr-2">Cliente: {nomeCliente(t.default_cliente_id)}</span>}
                    {t.default_stato_id && <span className="mr-2">Stato: {nomeStato(t.default_stato_id)}</span>}
                    {t.default_priorita_id && <span className="mr-2">Priorità: {nomePriorita(t.default_priorita_id)}</span>}
                    {t.consegna_offset_days!=null && <span className="mr-2">Offset: +{t.consegna_offset_days}g</span>}
                    {t.default_tempo_stimato && <span>Tempo: {t.default_tempo_stimato}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredProj.length === 0 && <div className="opacity-60">Nessun modello progetto.</div>}
        </div>
      </section>

      {/* TASK */}
      <section className={baseCard}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Modelli Task</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2.5 opacity-60" />
              <input className={`${baseInput} pl-8`} placeholder="Cerca..." value={qTask} onChange={e=>setQTask(e.target.value)} />
            </div>
            <button onClick={reloadTask} className="px-3 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTask.map(t => (
            <div key={t.id} className="border rounded-lg p-3">
              {editTask?.id === t.id ? (
                <div className="space-y-2">
                  <label className="text-sm opacity-80">Nome</label>
                  <input className={baseInput} value={editTask.nome || ""} onChange={e=>setEditTask({...editTask, nome:e.target.value})} placeholder="Nome" />
                  <label className="text-sm opacity-80">Note</label>
                  <textarea className={baseInput} rows={2} value={editTask.note || ""} onChange={e=>setEditTask({...editTask, note:e.target.value})} placeholder="Note" />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm opacity-80">Stato</label>
                    <label className="text-sm opacity-80">Priorità</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={baseInput} value={editTask.default_stato_id ?? ""} onChange={e=>setEditTask({...editTask, default_stato_id: e.target.value ? +e.target.value : null})}>
                      <option value="">— Stato predefinito —</option>
                      {stati.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                    <select className={baseInput} value={editTask.default_priorita_id ?? ""} onChange={e=>setEditTask({...editTask, default_priorita_id: e.target.value ? +e.target.value : null})}>
                      <option value="">— Priorità predefinita —</option>
                      {priorita.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <label className="text-sm opacity-80">Offset Consegna (giorni)</label>
                  <input type="number" className={baseInput} placeholder="Offset consegna (giorni)" value={editTask.consegna_offset_days ?? ""} onChange={e=>setEditTask({...editTask, consegna_offset_days: e.target.value===""? null : +e.target.value})} />
                  <label className="text-sm opacity-80">Tempo Stimato</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={oreTaskEdit} onChange={(e) => setOreTaskEdit(+e.target.value)} className={baseInput}>
                      {[...Array(25).keys()].map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                    <select value={minutiTaskEdit} onChange={(e) => setMinutiTaskEdit(+e.target.value)} className={baseInput}>
                      {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}min</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={loading} onClick={onSaveTask} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">Salva</button>
                    <button onClick={()=>setEditTask(null)} className="px-3 py-1 rounded border">Annulla</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t.nome}</div>
                    <div className="flex gap-2">
                      <button onClick={()=>startEditTask(t)} className="px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"><FontAwesomeIcon icon={faPen} /></button>
                      <button onClick={()=>onDeleteTask(t.id)} className="px-2 py-1 rounded border hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                  </div>
                  {t.note && <div className="text-sm opacity-80">{t.note}</div>}
                  <div className="text-xs opacity-70">
                    {t.default_stato_id && <span className="mr-2">Stato: {nomeStato(t.default_stato_id)}</span>}
                    {t.default_priorita_id && <span className="mr-2">Priorità: {nomePriorita(t.default_priorita_id)}</span>}
                    {t.consegna_offset_days!=null && <span className="mr-2">Offset: +{t.consegna_offset_days}g</span>}
                    {t.default_tempo_stimato && <span>Tempo: {t.default_tempo_stimato}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredTask.length === 0 && <div className="opacity-60">Nessun modello task.</div>}
        </div>
      </section>
    </div>
  );
}