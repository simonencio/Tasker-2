// src/Dettagli/DettaglioCliente.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen, faFolder, faStickyNote, faChevronDown,
  faKey, faPlus, faTrash, faCopy, faEye, faEyeSlash, faSave, faTimes
} from "@fortawesome/free-solid-svg-icons";

import { Chip, MetaField, Section } from "../supporto/ui";
import GenericEditorModal from "../Modifica/GenericEditorModal";
import type { Progetto /*, Cliente*/ } from "../supporto/tipi";
import { useToast } from "../supporto/useToast";


/** Tipizzazione locale super-semplice per evitare rogne */
type ClienteLite = {
  id: string;
  nome: string;
  email?: string | null;
  telefono?: string | null;
  note?: string | null;
  avatar_url?: string | null;
};

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



export default function DettaglioCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<ClienteLite | null>(null);
  const [progetti, setProgetti] = useState<Progetto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [openProgetti, setOpenProgetti] = useState(true);

  const [openCredenziali, setOpenCredenziali] = useState(true);
  const [openCredRowIds, setOpenCredRowIds] = useState<Set<number>>(new Set()); // 👈 dropdown per riga
  const [credenziali, setCredenziali] = useState<Credenziale[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPwdId, setShowPwdId] = useState<number | null>(null);

  const toast = useToast();

  const [form, setForm] = useState<Partial<Credenziale>>({
    nome: "",
    username: "",
    email: "",
    password: "",
    note: "",
  });

  // quali righe sono in editing
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  // snapshot dei valori originali per poter fare "Annulla"
  const [credSnapshot, setCredSnapshot] = useState<Record<number, Credenziale>>({});


  // Funzioni di editing inline 
  const startEdit = (row: Credenziale) => {
    // apre la sezione credenziali se chiusa
    setOpenCredenziali(true);
    // apre la riga di quella credenziale se chiusa
    setOpenCredRowIds(prev => new Set(prev).add(row.id));
    // entra in modalità editing
    setEditingIds(prev => new Set(prev).add(row.id));
    // snapshot per Annulla
    setCredSnapshot(prev => ({ ...prev, [row.id]: { ...row } }));
  };

  const cancelEdit = (idRow: number) => {
    // ripristina i valori originali
    const snap = credSnapshot[idRow];
    if (snap) {
      setCredenziali(prev => prev.map(c => (c.id === idRow ? { ...snap } : c)));
    }
    setEditingIds(prev => {
      const next = new Set(prev);
      next.delete(idRow);
      return next;
    });
    setCredSnapshot(prev => {
      const { [idRow]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveEdit = async (row: Credenziale) => {
    await handleUpdate(row); // riusa la tua funzione
    // riordina in base al (nuovo) nome
    setCredenziali(prev => applySort(prev));
    setEditingIds(prev => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
    setCredSnapshot(prev => {
      const { [row.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const byNome = (a: Credenziale, b: Credenziale) =>
    (a.nome ?? "").localeCompare(b.nome ?? "", undefined, { sensitivity: "base" });

  const applySort = (arr: Credenziale[]) => [...arr].sort(byNome);


  // --- Cliente ---
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("clienti")
        .select("id, nome, email, telefono, note, avatar_url")
        .eq("id", id)
        .maybeSingle();

      if (!alive) return;
      if (!error && data) setCliente(data as ClienteLite);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  // --- Progetti collegati ---
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("progetti")
        .select(`
          id, nome, slug, consegna,
          stato:stati(id,nome,colore),
          priorita:priorita(id,nome)
        `)
        .eq("cliente_id", id);

      if (!alive) return;
      if (!error && data) setProgetti(data as any[]);
    })();
    return () => { alive = false; };
  }, [id]);




  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("clienti_credenziali")
        .select("id, cliente_id, nome, username, email, password, note, created_at, modified_at")
        .eq("cliente_id", id)
        .is("deleted_at", null)
        .order("nome", { ascending: true });

      if (!alive) return;
      if (!error && data) setCredenziali(data as Credenziale[]);
    })();
    return () => { alive = false; };
  }, [id]);

  const resetForm = () => setForm({ nome: "", username: "", email: "", password: "", note: "" });

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
      .select("id, cliente_id, nome, username, email, password, note, created_at, modified_at")
      .single();

    setSaving(false);
    if (error) {
      toast("Errore nell’aggiunta della credenziale", "error");
      return;
    }
    if (data) {
      setCredenziali(prev => applySort([data as Credenziale, ...prev]));
      setAdding(false);
      resetForm();
      toast("Credenziale aggiunta con successo", "success")
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
    setCredenziali(prev => applySort(prev.filter(c => c.id !== row.id)));
    toast("Credenziale eliminata", "success");
  };


  const handleUpdate = async (row: Credenziale) => {
    const { id: credId, ...rest } = row;
    const { error } = await supabase
      .from("clienti_credenziali")
      .update({ ...rest, modified_at: new Date().toISOString() })
      .eq("id", credId);

    if (error) {
      toast("Errore nel salvataggio", "error");
      return;
    }
    toast("Modifica salvata", "success");;
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
            <MetaField label="Email"><Chip>{cliente.email ?? "—"}</Chip></MetaField>
            <MetaField label="Telefono"><Chip>{cliente.telefono ?? "—"}</Chip></MetaField>
          </div>

          {cliente.note && (
            <Section icon={faStickyNote} title="Note">
              <div className="leading-relaxed">{cliente.note}</div>
            </Section>
          )}
        </div>

        {/* Progetti collegati (collassabile) */}
        <div className="rounded-xl border border-theme/20 card-theme overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenProgetti(v => !v)}
            className="w-full px-4 py-2 font-semibold bg-black/[.04] dark:bg.white/[.06] flex items-center justify-between gap-3 text-left hover-bg-theme"
            aria-expanded={openProgetti}
            aria-controls="sezione-progetti-collegati"
            title={openProgetti ? "Chiudi progetti collegati" : "Apri progetti collegati"}
          >
            <span className="inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faFolder} /> Progetti collegati
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`transition-transform duration-200 ${openProgetti ? "rotate-180" : ""}`}
            />
          </button>

          {openProgetti && (
            <div id="sezione-progetti-collegati">
              {progetti.length === 0 ? (
                <div className="px-4 py-3 text-sm">Nessun progetto collegato.</div>
              ) : (
                <div>
                  {progetti.map(p => (
                    <div
                      key={p.id}
                      className="px-4 py-3 border-t border-theme/20 hover-bg-theme cursor-pointer"
                      onClick={() => navigate(`/progetti/${p.slug ?? p.id}`)}
                    >
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-sm opacity-80">
                        {p.consegna ? new Date(p.consegna as any).toLocaleDateString() : "—"} • {p.stato?.nome ?? "—"} • {p.priorita?.nome ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Credenziali (collassabile) */}
        <div className="rounded-xl border border-theme/20 card-theme overflow-hidden">
          {/* Header sezione: titolo (toggle) + azioni a destra */}
          <div className="px-4 py-2 bg-black/[.04] dark:bg-white/[.06] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpenCredenziali(v => !v)}
              className="font-semibold text-left inline-flex items-center gap-2 hover-bg-theme px-2 py-1 rounded-lg"
              aria-expanded={openCredenziali}
              aria-controls="sezione-credenziali"
              title={openCredenziali ? "Chiudi credenziali" : "Apri credenziali"}
            >
              <FontAwesomeIcon icon={faKey} />
              <span>Credenziali</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`transition-transform duration-200 ${openCredenziali ? "rotate-180" : ""}`}
              />
            </button>

            {!adding && openCredenziali && (
              <button
                onClick={() => { setOpenCredenziali(true); setAdding(true); }}
                className="px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-500 text-[15px] inline-flex items-center gap-2"
                title="Aggiungi credenziale"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span className="hidden sm:inline">Aggiungi</span>
              </button>
            )}
          </div>

          {openCredenziali && (
            <div id="sezione-credenziali" className="p-4 space-y-4">
              {/* Form aggiunta rapida con honeypot */}
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

              {/* Lista credenziali (righe collassabili) */}
              {credenziali.length === 0 && !adding ? (
                <div className="text-sm opacity-80">Nessuna credenziale salvata.</div>
              ) : (
                <div className="space-y-3">
                  {credenziali.map(row => {
                    const isOpen = openCredRowIds.has(row.id);
                    return (
                      <div key={row.id} className="rounded-xl border border-theme/20 card-theme overflow-hidden">
                        {/* Header riga: click = toggle dettagli */}
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
                        {/* Dettagli riga (solo se aperta) */}
                        {isOpen && (
                          <div className="px-4 py-3 border-t border-theme/20 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* mini honeypot */}
                            <input type="text" name={`hp_user_${row.id}`} tabIndex={-1} autoComplete="username" aria-hidden="true"
                              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />
                            <input type="password" name={`hp_pass_${row.id}`} tabIndex={-1} autoComplete="current-password" aria-hidden="true"
                              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />

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
        <GenericEditorModal table="clienti" id={cliente.id} onClose={() => setModaleAperta(false)} />
      )}
    </div>
  );
}
