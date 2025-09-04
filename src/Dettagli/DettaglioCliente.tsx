// src/Dettagli/DettaglioCliente.tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faFolder,
  faStickyNote,
  faChevronDown,
  faKey,
  faPlus,
  faTrash,
  faCopy,
  faEye,
  faEyeSlash,
  faSave,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { Chip, MetaField, Section } from "../supporto/ui";
import GenericEditorModal from "../Modifica/GenericEditorModal";
import { useToast } from "../supporto/useToast";
import type { Progetto, Cliente } from "../Liste/typesLista";
import { fetchClienteDettaglioBySlugOrId } from "../supporto/fetchData";
import { supabase } from "../supporto/supabaseClient";

/* -------------------------------
   Tipi locali
--------------------------------*/
type Credenziale = {
  id: number;
  cliente_id: string;
  nome: string;
  username?: string | null;
  email?: string | null;
  password?: string | null;
  note?: string | null;
  created_at?: string;
  modified_at?: string;
};

/* -------------------------------
   Utility eventi
--------------------------------*/
function dispatchResourceEvent<T>(
  action: "add" | "update" | "remove" | "replace",
  resource: string,
  payload: T
) {
  const ev = new CustomEvent(`${resource}:${action}`, { detail: payload });
  window.dispatchEvent(ev);
}

/* -------------------------------
   Component
--------------------------------*/
export default function DettaglioCliente() {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [progetti, setProgetti] = useState<Progetto[]>([]);
  const [credenziali, setCredenziali] = useState<Credenziale[]>([]);

  const [loading, setLoading] = useState(true);
  const [modaleAperta, setModaleAperta] = useState(false);

  const [openProgetti, setOpenProgetti] = useState(true);
  const [openCredenziali, setOpenCredenziali] = useState(true);
  const [openCredRowIds, setOpenCredRowIds] = useState<Set<number>>(new Set());

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPwdId, setShowPwdId] = useState<number | null>(null);

  const [form, setForm] = useState<Partial<Credenziale>>({
    nome: "",
    username: "",
    email: "",
    password: "",
    note: "",
  });

  // editing inline
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const [credSnapshot, setCredSnapshot] = useState<Record<number, Credenziale>>(
    {}
  );

  const toast = useToast();

  /* -------------------------------
     Load cliente + progetti + credenziali
  --------------------------------*/
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchClienteDettaglioBySlugOrId({
        id: id ?? null,
        slug: slug ?? null,
      });
      if (!alive) return;
      if (data) {
        setCliente({
          id: data.id,
          nome: data.nome,
          email: data.email,
          telefono: data.telefono,
          avatar_url: data.avatar_url,
          note: data.note,
        });
        setProgetti(data.progetti as Progetto[]);
        setCredenziali(data.credenziali as Credenziale[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, slug]);
  const fetchCliente = useCallback(async () => {
    const data = await fetchClienteDettaglioBySlugOrId({
      id: id ?? null,
      slug: slug ?? null,
    });
    if (data) {
      setCliente({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefono: data.telefono,
        avatar_url: data.avatar_url,
        note: data.note,
      });
      setProgetti(data.progetti as Progetto[]);
      setCredenziali(data.credenziali as Credenziale[]);
    }
    setLoading(false);
  }, [id, slug]);

  useEffect(() => {
    fetchCliente();
  }, [fetchCliente]);

  /* -------------------------------
     Listener eventi locali
  --------------------------------*/
  useEffect(() => {
    // credenziali
    function onAdd(ev: CustomEvent) {
      const row = ev.detail as Credenziale;
      if (row.cliente_id !== id) return;
      setCredenziali((prev) => [...prev, row]);
    }
    function onUpdate(ev: CustomEvent) {
      const row = ev.detail as Credenziale;
      if (row.cliente_id !== id) return;
      setCredenziali((prev) => prev.map((c) => (c.id === row.id ? row : c)));
    }
    function onRemove(ev: CustomEvent) {
      const row = ev.detail as Credenziale;
      if (row.cliente_id !== id) return;
      setCredenziali((prev) => prev.filter((c) => c.id !== row.id));
    }

    // cliente update/replace
    function onClienteUpdate(ev: CustomEvent) {
      const row = ev.detail as { id: string | number; patch?: Partial<Cliente> };
      if (String(row.id) !== String(id)) return;   // 👈 forza string
      if (row.patch) {
        setCliente((prev) => (prev ? { ...prev, ...row.patch } : prev));
      }
    }
    function onClienteReplace(ev: CustomEvent) {
      const payload = ev.detail as { item: Cliente };
      if (String(payload.item.id) !== String(id)) return;  // 👈 forza string
      setCliente(payload.item);
    }


    // progetti update/replace
    function onProgettoUpdate(ev: CustomEvent) {
      const row = ev.detail as { id: string; patch?: Partial<Progetto> };
      setProgetti((prev) =>
        prev.map((p) => (p.id === row.id ? { ...p, ...row.patch } : p))
      );
    }
    function onProgettoReplace(ev: CustomEvent) {
      const payload = ev.detail as { item: Progetto };
      setProgetti((prev) =>
        prev.map((p) => (p.id === payload.item.id ? payload.item : p))
      );
    }

    window.addEventListener("clienti_credenziali:add", onAdd as EventListener);
    window.addEventListener(
      "clienti_credenziali:update",
      onUpdate as EventListener
    );
    window.addEventListener(
      "clienti_credenziali:remove",
      onRemove as EventListener
    );

    window.addEventListener("clienti:update", onClienteUpdate as EventListener);
    window.addEventListener(
      "clienti:replace",
      onClienteReplace as EventListener
    );
    window.addEventListener(
      "progetti:update",
      onProgettoUpdate as EventListener
    );
    window.addEventListener(
      "progetti:replace",
      onProgettoReplace as EventListener
    );

    return () => {
      window.removeEventListener(
        "clienti_credenziali:add",
        onAdd as EventListener
      );
      window.removeEventListener(
        "clienti_credenziali:update",
        onUpdate as EventListener
      );
      window.removeEventListener(
        "clienti_credenziali:remove",
        onRemove as EventListener
      );

      window.removeEventListener(
        "clienti:update",
        onClienteUpdate as EventListener
      );
      window.removeEventListener(
        "clienti:replace",
        onClienteReplace as EventListener
      );
      window.removeEventListener(
        "progetti:update",
        onProgettoUpdate as EventListener
      );
      window.removeEventListener(
        "progetti:replace",
        onProgettoReplace as EventListener
      );
    };
  }, [id]);

  /* -------------------------------
     Helpers credenziali
  --------------------------------*/
  const resetForm = () =>
    setForm({ nome: "", username: "", email: "", password: "", note: "" });

  const byNome = (a: Credenziale, b: Credenziale) =>
    (a.nome ?? "").localeCompare(b.nome ?? "", undefined, {
      sensitivity: "base",
    });
  const applySort = (arr: Credenziale[]) => [...arr].sort(byNome);

  const startEdit = (row: Credenziale) => {
    setOpenCredenziali(true);
    setOpenCredRowIds((prev) => new Set(prev).add(row.id));
    setEditingIds((prev) => new Set(prev).add(row.id));
    setCredSnapshot((prev) => ({ ...prev, [row.id]: { ...row } }));
  };

  const cancelEdit = (idRow: number) => {
    const snap = credSnapshot[idRow];
    if (snap) {
      setCredenziali((prev) =>
        prev.map((c) => (c.id === idRow ? { ...snap } : c))
      );
    }
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(idRow);
      return next;
    });
    setCredSnapshot((prev) => {
      const { [idRow]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveEdit = async (row: Credenziale) => {
    await handleUpdate(row);
    setCredenziali((prev) => applySort(prev));
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
    setCredSnapshot((prev) => {
      const { [row.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleAdd = async () => {
    if (!id || !form.nome?.trim()) return;
    setSaving(true);
    const payload = {
      cliente_id: id,
      nome: form.nome?.trim(),
      username: form.username?.trim() || null,
      email: form.email?.trim() || null,
      password: form.password?.trim() || null,
      note: form.note?.trim() || null,
    };
    const { data, error } = await supabase
      .from("clienti_credenziali")
      .insert(payload)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast("Errore nell’aggiunta della credenziale", "error");
      return;
    }
    if (data) {
      setCredenziali((prev) => applySort([data as Credenziale, ...prev]));
      setAdding(false);
      resetForm();
      toast("Credenziale aggiunta con successo", "success");
      dispatchResourceEvent("add", "clienti_credenziali", data);
    }
  };

  const handleDelete = async (row: Credenziale) => {
    if (!window.confirm(`Eliminare la credenziale "${row.nome}"?`)) return;
    const { error } = await supabase
      .from("clienti_credenziali")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast("Errore durante l’eliminazione", "error");
      return;
    }
    setCredenziali((prev) => prev.filter((c) => c.id !== row.id));
    toast("Credenziale eliminata", "success");
    dispatchResourceEvent("remove", "clienti_credenziali", row);
  };

  const handleUpdate = async (row: Credenziale) => {
    const { id: credId, ...rest } = row;
    const { data, error } = await supabase
      .from("clienti_credenziali")
      .update({ ...rest, modified_at: new Date().toISOString() })
      .eq("id", credId)
      .select("*")
      .single();
    if (error) {
      toast("Errore nel salvataggio", "error");
      return;
    }
    toast("Modifica salvata", "success");
    if (data) {
      dispatchResourceEvent("update", "clienti_credenziali", data);
    }
  };

  const copyToClipboard = async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("Elemento copiato!", "success");
    } catch {
      toast("Errore durante la copia", "error");
    }
  };

  /* -------------------------------
     Render
  --------------------------------*/
  if (loading) return <div className="p-6 text-theme">Caricamento...</div>;
  if (!cliente) return <div className="p-6 text-theme">Cliente non trovato</div>;

  return (
    <div className="min-h-screen bg-theme text-theme">
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Titolo */}
        <h1 className="text-2xl font-bold flex items-center gap-3">
          {cliente.nome}
          <button
            onClick={() => setModaleAperta(true)}
            className="text-yellow-500 hover:text-yellow-600 transition"
            title="Modifica cliente"
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
        </h1>

        {/* Meta card */}
        <div className="rounded-xl border border-theme/20 card-theme p-5 space-y-4 text-[15px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetaField label="Email">
              <Chip>{cliente.email ?? "—"}</Chip>
            </MetaField>
            <MetaField label="Telefono">
              <Chip>{cliente.telefono ?? "—"}</Chip>
            </MetaField>
          </div>

          {cliente.note && (
            <Section icon={faStickyNote} title="Note">
              <div className="leading-relaxed">{cliente.note}</div>
            </Section>
          )}
        </div>

        {/* Progetti collegati */}
        <div className="rounded-xl border border-theme/20 card-theme overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenProgetti((v) => !v)}
            className="w-full h-11 px-4 font-semibold bg-black/[.04] dark:bg-white/[.06] flex items-center justify-between gap-3 text-left hover-bg-theme"
          >
            <span className="inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faFolder} /> Progetti collegati
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`transition-transform duration-200 ${openProgetti ? "rotate-180" : ""
                }`}
            />
          </button>

          {openProgetti && (
            <div>
              {progetti.length === 0 ? (
                <div className="px-4 py-3 text-sm">
                  Nessun progetto collegato.
                </div>
              ) : (
                progetti.map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-3 border-t border-theme/20 hover-bg-theme cursor-pointer"
                    onClick={() => navigate(`/progetti/${p.slug ?? p.id}`)}
                  >
                    <div className="font-medium">{p.nome}</div>
                    <div className="text-sm opacity-80">
                      {p.consegna
                        ? new Date(p.consegna as any).toLocaleDateString()
                        : "—"}{" "}
                      • {p.stato?.nome ?? "—"} • {p.priorita?.nome ?? "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Credenziali (collassabile) */}
        <div className="rounded-xl border border-theme/20 card-theme overflow-hidden">
          {/* Header toggle */}
          <button
            type="button"
            onClick={() => setOpenCredenziali(v => !v)}
            className="w-full h-11 px-4 font-semibold bg-black/[.04] dark:bg-white/[.06]
               flex items-center justify-between gap-3 text-left hover-bg-theme"
            aria-expanded={openCredenziali}
            aria-controls="sezione-credenziali"
            title={openCredenziali ? "Chiudi credenziali" : "Apri credenziali"}
          >
            <span className="inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faKey} /> Credenziali
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`transition-transform duration-200 ${openCredenziali ? "rotate-180" : ""}`}
            />
          </button>

          {/* Contenuto collapsabile */}
          {openCredenziali && (
            <div id="sezione-credenziali" className="p-4 space-y-4">
              {/* Bottone aggiungi */}
              {!adding && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setOpenCredenziali(true);
                      setAdding(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-500
                       text-[15px] inline-flex items-center gap-2"
                    title="Aggiungi credenziale"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="hidden sm:inline">Aggiungi</span>
                  </button>
                </div>
              )}

              {/* Form aggiunta rapida */}
              {adding && (
                <form
                  autoComplete="off"
                  onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
                  className="rounded-xl border border-theme/20 p-4 space-y-3 card-theme"
                >
                  {/* Honeypot */}
                  <input type="text" name="username" tabIndex={-1} autoComplete="username" aria-hidden="true"
                    style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />
                  <input type="password" name="password" tabIndex={-1} autoComplete="current-password" aria-hidden="true"
                    style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1">Nome *</label>
                      <input
                        className="input-style w-full"
                        value={form.nome ?? ""}
                        onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Es. Portale Fatture"
                        name="cred_nome"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Username</label>
                      <input
                        className="input-style w-full"
                        value={form.username ?? ""}
                        onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="username"
                        name="cred_username"
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Email</label>
                      <input
                        className="input-style w-full"
                        value={form.email ?? ""}
                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="email@dominio.tld"
                        name="cred_email"
                        autoComplete="off"
                        inputMode="email"
                        spellCheck={false}
                        autoCapitalize="none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Password</label>
                      <input
                        type="password"
                        className="input-style w-full"
                        value={form.password ?? ""}
                        onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••"
                        name="cred_password"
                        autoComplete="new-password"
                        spellCheck={false}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1">Note</label>
                      <textarea
                        className="input-style w-full"
                        rows={3}
                        value={form.note ?? ""}
                        onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Info aggiuntive, URL login, ecc."
                        name="cred_note"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setAdding(false); resetForm(); }}
                      className="px-3 py-2 rounded-xl card-theme hover-bg-theme text-[15px] inline-flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} /> Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !form.nome?.trim()}
                      className={`px-3 py-2 rounded-xl text-[15px] inline-flex items-center gap-2 ${saving || !form.nome?.trim()
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                        }`}
                    >
                      <FontAwesomeIcon icon={faSave} /> Salva
                    </button>
                  </div>
                </form>
              )}

              {/* Lista credenziali */}
              {credenziali.length === 0 && !adding ? (
                <div className="text-sm opacity-80">Nessuna credenziale salvata.</div>
              ) : (
                <div className="space-y-3">
                  {credenziali.map(row => {
                    const isOpen = openCredRowIds.has(row.id);
                    return (
                      <div key={row.id} className="rounded-xl border border-theme/20 card-theme overflow-hidden">
                        {/* Header riga */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setOpenCredRowIds(prev => {
                              const next = new Set(prev);
                              next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                              return next;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenCredRowIds(prev => {
                                const next = new Set(prev);
                                next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                                return next;
                              });
                            }
                          }}
                          className="w-full px-4 py-2 flex items-center justify-between gap-3 text-left hover-bg-theme"
                          aria-expanded={isOpen}
                          title={isOpen ? "Chiudi dettagli" : "Apri dettagli"}
                        >
                          <span className="inline-flex items-center gap-2 font-medium">
                            <FontAwesomeIcon
                              icon={faChevronDown}
                              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            />
                            {row.nome}
                          </span>

                          <div className="flex items-center gap-2">
                            {!editingIds.has(row.id) ? (
                              <>
                                <button
                                  className="icon-color hover:text-yellow-600"
                                  title="Modifica"
                                  onClick={(e) => { e.stopPropagation(); startEdit(row); }}
                                >
                                  <FontAwesomeIcon icon={faPen} />
                                </button>
                                <button
                                  className="icon-color hover:text-red-600"
                                  title="Elimina"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="icon-color hover:text-blue-600"
                                  title="Salva"
                                  onClick={(e) => { e.stopPropagation(); saveEdit(row); }}
                                >
                                  <FontAwesomeIcon icon={faSave} />
                                </button>
                                <button
                                  className="icon-color hover:text-gray-400"
                                  title="Annulla"
                                  onClick={(e) => { e.stopPropagation(); cancelEdit(row.id); }}
                                >
                                  <FontAwesomeIcon icon={faTimes} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Dettagli riga */}
                        {isOpen && (
                          <div className="px-4 py-3 border-t border-theme/20 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* mini honeypot */}
                            <input type="text" name={`hp_user_${row.id}`} tabIndex={-1} autoComplete="username" aria-hidden="true"
                              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />
                            <input type="password" name={`hp_pass_${row.id}`} tabIndex={-1} autoComplete="current-password" aria-hidden="true"
                              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />

                            {/* Username */}
                            <div>
                              <label className="block text-xs mb-1 opacity-70">Username</label>
                              <div className="flex items-center gap-2">
                                <input
                                  className="input-style flex-1"
                                  value={row.username ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setCredenziali(prev => prev.map(c => c.id === row.id ? { ...c, username: v } : c));
                                  }}
                                  readOnly={!editingIds.has(row.id)}
                                  name={`cred_username_${row.id}`}
                                  autoComplete="off"
                                  spellCheck={false}
                                  autoCapitalize="none"
                                />
                                <button className="icon-color" title="Copia" onClick={() => copyToClipboard(row.username)}>
                                  <FontAwesomeIcon icon={faCopy} />
                                </button>
                              </div>
                            </div>

                            {/* Email */}
                            <div>
                              <label className="block text-xs mb-1 opacity-70">Email</label>
                              <div className="flex items-center gap-2">
                                <input
                                  className="input-style flex-1"
                                  value={row.email ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setCredenziali(prev => prev.map(c => c.id === row.id ? { ...c, email: v } : c));
                                  }}
                                  readOnly={!editingIds.has(row.id)}
                                  name={`cred_email_${row.id}`}
                                  autoComplete="off"
                                  inputMode="email"
                                  spellCheck={false}
                                  autoCapitalize="none"
                                />
                                <button className="icon-color" title="Copia" onClick={() => copyToClipboard(row.email)}>
                                  <FontAwesomeIcon icon={faCopy} />
                                </button>
                              </div>
                            </div>

                            {/* Password */}
                            <div className="md:col-span-2">
                              <label className="block text-xs mb-1 opacity-70">Password</label>
                              <div className="flex items-center gap-2">
                                <input
                                  className="input-style flex-1"
                                  type={showPwdId === row.id ? "text" : "password"}
                                  value={row.password ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setCredenziali(prev => prev.map(c => c.id === row.id ? { ...c, password: v } : c));
                                  }}
                                  readOnly={!editingIds.has(row.id)}
                                  name={`cred_password_${row.id}`}
                                  autoComplete="new-password"
                                  spellCheck={false}
                                />
                                <button className="icon-color" title="Copia" onClick={() => copyToClipboard(row.password)}>
                                  <FontAwesomeIcon icon={faCopy} />
                                </button>
                                <button
                                  className="icon-color"
                                  onClick={() => setShowPwdId(prev => prev === row.id ? null : row.id)}
                                  title={showPwdId === row.id ? "Nascondi" : "Mostra"}
                                >
                                  <FontAwesomeIcon icon={showPwdId === row.id ? faEyeSlash : faEye} />
                                </button>
                              </div>
                            </div>

                            {/* Note */}
                            <div className="md:col-span-2">
                              <label className="block text-xs mb-1 opacity-70">Note</label>
                              <textarea
                                className="input-style w-full"
                                rows={3}
                                value={row.note ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCredenziali(prev => prev.map(c => c.id === row.id ? { ...c, note: v } : c));
                                }}
                                readOnly={!editingIds.has(row.id)}
                                name={`cred_note_${row.id}`}
                                autoComplete="off"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>


      </div>

      {modaleAperta && cliente.id && (
        <GenericEditorModal
          table="clienti"
          id={cliente.id}
          onClose={() => setModaleAperta(false)}
          onSaved={fetchCliente}
        />
      )}
    </div>
  );
}
