// // src/Modifica/MiniProjectEditorModal.tsx
// import { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";   // 👈 serve per redirect
// import { supabase } from "../supporto/supabaseClient";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faCalendarDays, faXmark } from "@fortawesome/free-solid-svg-icons";
// import { inviaNotifica } from "../Notifiche/notificheUtils";
// import { format, parseISO } from "date-fns";

// type Props = {
//     progettoId: string;
//     onClose: () => void;
// };

// type Cliente = { id: string; nome: string };
// type Stato = { id: number; nome: string };
// type Priorita = { id: number; nome: string };
// type Utente = { id: string; nome: string; cognome: string };
// type TaskMini = { id: string; nome: string; slug: string | null; consegna: string | null };

// export default function MiniProjectEditorModal({ progettoId, onClose }: Props) {
//     const navigate = useNavigate(); // 👈

//     const [nome, setNome] = useState("");
//     const [note, setNote] = useState("");
//     const [slug, setSlug] = useState("");
//     const [clienteId, setClienteId] = useState<string | null>(null);
//     const [statoId, setStatoId] = useState<number | null>(null);
//     const [prioritaId, setPrioritaId] = useState<number | null>(null);
//     const [consegna, setConsegna] = useState("");
//     const [tempoStimato, setTempoStimato] = useState("");
//     const [clienti, setClienti] = useState<Cliente[]>([]);
//     const [stati, setStati] = useState<Stato[]>([]);
//     const [priorita, setPriorita] = useState<Priorita[]>([]);
//     const [utenti, setUtenti] = useState<Utente[]>([]);
//     const [membriSelezionati, setMembriSelezionati] = useState<string[]>([]);
//     const [membriIniziali, setMembriIniziali] = useState<string[]>([]); // 👈 baseline per capire chi è “nuovo”
//     const [popupOpen, setPopupOpen] = useState(false);
//     const [showDatePicker, setShowDatePicker] = useState(false);
//     const dateRef = useRef<HTMLInputElement>(null);

//     // costanti di supporto per confronti (per notifiche)
//     const [oldNome, setOldNome] = useState("");
//     const [oldSlug, setOldSlug] = useState("");
//     const [oldNote, setOldNote] = useState<string | null>(null);
//     const [oldStatoId, setOldStatoId] = useState<number | null>(null);
//     const [oldPrioritaId, setOldPrioritaId] = useState<number | null>(null);
//     const [oldConsegna, setOldConsegna] = useState<string | null>(null);
//     const [oldClienteId, setOldClienteId] = useState<string | null>(null);
//     const [oldTempoStimato, setOldTempoStimato] = useState<string | null>(null);

//     // 🔹 Modale assegnazione task non assegnate (apre SUBITO quando aggiungi membri)
//     const [showAssegnaModal, setShowAssegnaModal] = useState(false);
//     const [unassignedTasks, setUnassignedTasks] = useState<TaskMini[]>([]);
//     const [nuoviMembriPerQuestaModale, setNuoviMembriPerQuestaModale] = useState<string[]>([]);
//     const [selezioniCorrenti, setSelezioniCorrenti] = useState<Record<string, string[]>>({}); // taskId -> userIds (modale aperta ora)

//     // 🔹 Assegnazioni confermate da una o più aperture della modale PRIMA del salvataggio finale
//     const [pendingAssignments, setPendingAssignments] = useState<Record<string, string[]>>({}); // taskId -> userIds

//     // redirect post-salvataggio
//     const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

//     useEffect(() => {
//         Promise.all([
//             supabase.from("progetti").select("*").eq("id", progettoId).single(),
//             supabase.from("utenti_progetti").select("utente_id").eq("progetto_id", progettoId),
//             supabase.from("clienti").select("id, nome").is("deleted_at", null),
//             supabase.from("stati").select("id, nome").is("deleted_at", null),
//             supabase.from("priorita").select("id, nome").is("deleted_at", null),
//             supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
//         ]).then(([progettoRes, membriRes, clientiRes, statiRes, prioritaRes, utentiRes]) => {
//             const progetto = progettoRes.data;
//             if (progetto) {
//                 setNome(progetto.nome || "");
//                 setOldNome(progetto.nome || "");
//                 setNote(progetto.note || "");
//                 setOldNote(progetto.note || "");
//                 setSlug(progetto.slug || "");
//                 setOldSlug(progetto.slug || "");
//                 setClienteId(progetto.cliente_id);
//                 setOldClienteId(progetto.cliente_id);
//                 setStatoId(progetto.stato_id);
//                 setOldStatoId(progetto.stato_id);
//                 setPrioritaId(progetto.priorita_id);
//                 setOldPrioritaId(progetto.priorita_id);
//                 setConsegna(progetto.consegna || "");
//                 setOldConsegna(progetto.consegna || "");
//                 setTempoStimato(progetto.tempo_stimato || "");
//                 setOldTempoStimato(progetto.tempo_stimato || "");
//             }
//             if (membriRes.data) {
//                 const ids = membriRes.data.map((m: any) => m.utente_id);
//                 setMembriSelezionati(ids);
//                 setMembriIniziali(ids); // baseline
//             }
//             if (clientiRes.data) setClienti(clientiRes.data);
//             if (statiRes.data) setStati(statiRes.data);
//             if (prioritaRes.data) setPriorita(prioritaRes.data);
//             if (utentiRes.data) setUtenti(utentiRes.data);
//         });
//     }, [progettoId]);

//     const fmtData = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "");
//     const nomeStato = (id: number | null) => stati.find(s => s.id === id)?.nome ?? "";
//     const nomePriorita = (id: number | null) => priorita.find(p => p.id === id)?.nome ?? "";
//     const nomeCliente = (id: string | null) => clienti.find(c => c.id === id)?.nome ?? "";

//     // ====== LOGICA "APRI MODALE SUBITO" ======

//     // Carica task root del progetto SENZA assegnatari e apre la modale con pre-selezione sui members passati
//     const openAssignModalForNewMembers = async (newMemberIds: string[]) => {
//         try {
//             // Task del progetto
//             const { data: pt, error: ptErr } = await supabase
//                 .from("progetti_task")
//                 .select("task_id")
//                 .eq("progetti_id", progettoId);
//             if (ptErr) {
//                 console.error("Errore lettura progetti_task:", ptErr);
//                 return;
//             }
//             const taskIds: string[] = (pt ?? []).map((r: any) => r.task_id).filter(Boolean);
//             if (taskIds.length === 0) return;

//             // Solo root (no sotto-task), non cancellate
//             const { data: tasksRoot, error: tErr } = await supabase
//                 .from("tasks")
//                 .select("id, nome, slug, consegna, parent_id, deleted_at")
//                 .in("id", taskIds);
//             if (tErr) {
//                 console.error("Errore lettura tasks:", tErr);
//                 return;
//             }
//             const rootTasks = (tasksRoot ?? []).filter((t: any) => !t.deleted_at && !t.parent_id);
//             if (rootTasks.length === 0) return;

//             // Quali root hanno già assegnatari?
//             const rootIds = rootTasks.map((t: any) => t.id);
//             const { data: assegnazioni, error: aErr } = await supabase
//                 .from("utenti_task")
//                 .select("task_id")
//                 .in("task_id", rootIds);
//             if (aErr) {
//                 console.error("Errore lettura utenti_task:", aErr);
//                 return;
//             }
//             const withAssignees = new Set((assegnazioni ?? []).map((r: any) => r.task_id));
//             const unassigned = rootTasks
//                 .filter((t: any) => !withAssignees.has(t.id))
//                 .map((t: any) => ({
//                     id: t.id,
//                     nome: t.nome,
//                     slug: t.slug ?? null,
//                     consegna: t.consegna ?? null,
//                 }));

//             if (unassigned.length === 0) return;

//             // Pre-selezione: i nuovi membri cliccati ora
//             const init: Record<string, string[]> = {};
//             for (const t of unassigned) init[t.id] = [...newMemberIds];

//             setUnassignedTasks(unassigned);
//             setNuoviMembriPerQuestaModale(newMemberIds);
//             setSelezioniCorrenti(init);
//             setShowAssegnaModal(true);
//         } catch (e) {
//             console.error("Errore openAssignModalForNewMembers:", e);
//         }
//     };

//     // Toggle membro nella popup. Se l'azione è un'aggiunta di un "nuovo" membro (non presente nei membri iniziali),
//     // apri subito la modale per assegnare task non assegnate.
//     const toggleMembro = (id: string) => {
//         setMembriSelezionati(prev => {
//             const wasSelected = prev.includes(id);
//             const next = wasSelected ? prev.filter(uid => uid !== id) : [...prev, id];

//             // calcola i "nuovi" (presenti ora ma NON nei membri iniziali)
//             const nuovi = next.filter(uid => !membriIniziali.includes(uid));

//             // Se sto aggiungendo (non rimuovendo) e almeno uno è nuovo -> apri modale
//             if (!wasSelected && nuovi.length > 0) {
//                 // apri con TUTTI i nuovi attualmente selezionati (non solo quello cliccato)
//                 openAssignModalForNewMembers(nuovi);
//             }

//             return next;
//         });
//     };

//     // Conferma della modale "Assegna task non assegnate" (NON scrive subito in DB! salva in pending)
//     const confermaAssegnazioniModaleImmediata = () => {
//         // merge: scriviamo selezioniCorrenti in pendingAssignments (sovrascrivendo per quelle task)
//         setPendingAssignments(prev => ({ ...prev, ...selezioniCorrenti }));
//         setShowAssegnaModal(false);
//     };

//     // ====== SALVATAGGIO FINALE ======

//     const salvaModifiche = async () => {
//         const slugChanged = Boolean(slug) && slug !== oldSlug;
//         setPendingRedirect(slugChanged ? slug : null);

//         await supabase
//             .from("progetti")
//             .update({
//                 nome,
//                 note,
//                 slug,
//                 cliente_id: clienteId,
//                 stato_id: statoId,
//                 priorita_id: prioritaId,
//                 consegna,
//                 tempo_stimato: tempoStimato,
//             })
//             .eq("id", progettoId);

//         // Stato membership attuale vs iniziale
//         const esistentiIds = membriIniziali;
//         const daAggiungere = membriSelezionati.filter(id => !esistentiIds.includes(id));
//         const daRimuovere = esistentiIds.filter(id => !membriSelezionati.includes(id));
//         const rimasti = membriSelezionati.filter(id => esistentiIds.includes(id));
//         const user = await supabase.auth.getUser();
//         const creatoreId = user.data?.user?.id;

//         if (daAggiungere.length > 0) {
//             await supabase.from("utenti_progetti").insert(
//                 daAggiungere.map(id => ({ progetto_id: progettoId, utente_id: id }))
//             );

//             await inviaNotifica(
//                 "PROGETTO_ASSEGNATO",
//                 daAggiungere,
//                 `Sei stato assegnato al progetto: ${nome}`,
//                 creatoreId || undefined,
//                 { progetto_id: progettoId }
//             );
//         }

//         if (daRimuovere.length > 0) {
//             for (const id of daRimuovere) {
//                 const { error: rpcErr } = await supabase.rpc("remove_user_from_project_and_tasks", {
//                     p_progetto: progettoId,
//                     p_utente: id,
//                 });
//                 if (rpcErr) console.error("RPC error:", rpcErr);
//             }

//             await inviaNotifica(
//                 "PROGETTO_RIMOSSO",
//                 daRimuovere,
//                 `Sei stato rimosso dal progetto: ${nome}`,
//                 creatoreId || undefined,
//                 { progetto_id: progettoId }
//             );
//         }

//         // Notifica modifiche generiche ai “rimasti”
//         if (rimasti.length > 0) {
//             const modifiche: Array<{ campo: string; da?: string | null; a?: string | null }> = [];
//             if (nome !== oldNome) modifiche.push({ campo: "nome", da: oldNome, a: nome });
//             if (slug !== oldSlug) modifiche.push({ campo: "slug", da: oldSlug, a: slug });
//             if (note !== oldNote) modifiche.push({ campo: "note", da: oldNote ?? "", a: note ?? "" });
//             if (statoId !== oldStatoId) modifiche.push({ campo: "stato", da: nomeStato(oldStatoId), a: nomeStato(statoId) });
//             if (prioritaId !== oldPrioritaId) modifiche.push({ campo: "priorita", da: nomePriorita(oldPrioritaId), a: nomePriorita(prioritaId) });
//             if (consegna !== oldConsegna) modifiche.push({ campo: "consegna", da: fmtData(oldConsegna), a: fmtData(consegna) });
//             if (clienteId !== oldClienteId) modifiche.push({ campo: "cliente", da: nomeCliente(oldClienteId), a: nomeCliente(clienteId) });
//             if (tempoStimato !== oldTempoStimato) modifiche.push({
//                 campo: "tempo_stimato",
//                 da: oldTempoStimato ?? "",
//                 a: tempoStimato ?? ""
//             });

//             if (modifiche.length > 0) {
//                 await inviaNotifica(
//                     "PROGETTO_MODIFICATO",
//                     rimasti,
//                     "Progetto modificato",
//                     creatoreId || undefined,
//                     { progetto_id: progettoId },
//                     { modifiche }
//                 );
//             } else {
//                 await inviaNotifica(
//                     "PROGETTO_MODIFICATO",
//                     rimasti,
//                     `Il progetto "${nome}" è stato modificato.`,
//                     creatoreId || undefined,
//                     { progetto_id: progettoId }
//                 );
//             }

//             // aggiorno baseline per eventuali salvataggi successivi
//             setOldNome(nome);
//             setOldSlug(slug);
//             setOldNote(note);
//             setOldStatoId(statoId);
//             setOldPrioritaId(prioritaId);
//             setOldConsegna(consegna);
//             setOldClienteId(clienteId);
//             setOldTempoStimato(tempoStimato);
//         }

//         // --- Scrivi in DB le assegnazioni “pending” raccolte dalle modali aperte subito dopo la selezione membri ---
//         // pendingAssignments: taskId -> [userIds selezionati]
//         // Filtra per user ancora selezionati come membri del progetto (in caso l'utente li abbia tolti prima di salvare)
//         const rows: { utente_id: string; task_id: string }[] = [];
//         for (const [taskId, userIds] of Object.entries(pendingAssignments)) {
//             for (const uId of userIds) {
//                 if (membriSelezionati.includes(uId)) {
//                     rows.push({ utente_id: uId, task_id: taskId });
//                 }
//             }
//         }
//         if (rows.length > 0) {
//             const { error } = await supabase.from("utenti_task").insert(rows);
//             if (error) {
//                 console.error("Errore insert utenti_task (pendingAssignments):", error);
//             }
//         }

//         onClose();
//         if (pendingRedirect) {
//             navigate(`/progetti/${pendingRedirect}`, { replace: true });
//         } else if (slugChanged) {
//             navigate(`/progetti/${slug}`, { replace: true });
//         }
//     };

//     return (
//         <>
//             {/* Modale assegnazione task non assegnate - appare SUBITO al click di aggiunta membri */}
//             {showAssegnaModal && (
//                 <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">
//                     <div className="modal-container w-full max-w-[700px] rounded-xl shadow-xl relative">
//                         <div className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-gray-700">
//                             <h3 className="text-lg font-semibold text-theme">
//                                 Assegna task non assegnate ({unassignedTasks.length})
//                             </h3>
//                             <button onClick={() => setShowAssegnaModal(false)} className="icon-color">
//                                 <FontAwesomeIcon icon={faXmark} />
//                             </button>
//                         </div>

//                         <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
//                             <div className="text-sm opacity-80">
//                                 Hai aggiunto nuovi membri al progetto <strong>{nome}</strong>.
//                                 Queste task radice non hanno assegnatari. Scegli a chi assegnarle.
//                             </div>

//                             <div className="text-sm">
//                                 <span className="font-semibold">Nuovi membri:</span>{" "}
//                                 {nuoviMembriPerQuestaModale.length === 0
//                                     ? "—"
//                                     : nuoviMembriPerQuestaModale
//                                         .map(id => {
//                                             const u = utenti.find(x => x.id === id);
//                                             return u ? `${u.nome} ${u.cognome}` : id;
//                                         })
//                                         .join(", ")}
//                             </div>

//                             <div className="space-y-3">
//                                 {unassignedTasks.map(t => {
//                                     const utentiVisibili = membriSelezionati; // puoi cambiare in nuoviMembriPerQuestaModale se vuoi mostrare solo i nuovi
//                                     const checkedList = selezioniCorrenti[t.id] ?? [];
//                                     return (
//                                         <div key={t.id} className="p-3 rounded border border-gray-300 dark:border-gray-700">
//                                             <div className="flex flex-wrap items-center justify-between gap-2">
//                                                 <div className="font-medium">
//                                                     {t.nome}
//                                                     {t.slug ? <span className="opacity-70 ml-2 text-xs">/{t.slug}</span> : null}
//                                                 </div>
//                                                 {t.consegna ? (
//                                                     <div className="text-xs opacity-70">
//                                                         Consegna: {format(parseISO(t.consegna), "yyyy-MM-dd")}
//                                                     </div>
//                                                 ) : null}
//                                             </div>

//                                             <div className="mt-2 flex flex-wrap items-center gap-2">
//                                                 {utentiVisibili.map(uId => {
//                                                     const u = utenti.find(x => x.id === uId);
//                                                     const checked = checkedList.includes(uId);
//                                                     return (
//                                                         <label
//                                                             key={uId}
//                                                             className={`text-sm px-2 py-1 rounded cursor-pointer border ${checked
//                                                                 ? "selected-panel font-semibold"
//                                                                 : "hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent"
//                                                                 }`}
//                                                         >
//                                                             <input
//                                                                 type="checkbox"
//                                                                 className="mr-2"
//                                                                 checked={checked}
//                                                                 onChange={() => {
//                                                                     setSelezioniCorrenti(prev => {
//                                                                         const cur = new Set(prev[t.id] ?? []);
//                                                                         if (cur.has(uId)) cur.delete(uId);
//                                                                         else cur.add(uId);
//                                                                         return { ...prev, [t.id]: Array.from(cur) };
//                                                                     });
//                                                                 }}
//                                                             />
//                                                             {u ? `${u.nome} ${u.cognome}` : uId}
//                                                         </label>
//                                                     );
//                                                 })}
//                                             </div>

//                                             <div className="mt-2 text-xs">
//                                                 <button
//                                                     type="button"
//                                                     onClick={() =>
//                                                         setSelezioniCorrenti(prev => ({ ...prev, [t.id]: [...nuoviMembriPerQuestaModale] }))
//                                                     }
//                                                     className="underline hover:opacity-80"
//                                                 >
//                                                     Seleziona nuovi membri
//                                                 </button>
//                                                 <span className="mx-2">·</span>
//                                                 <button
//                                                     type="button"
//                                                     onClick={() => setSelezioniCorrenti(prev => ({ ...prev, [t.id]: [] }))}
//                                                     className="underline hover:opacity-80"
//                                                 >
//                                                     Svuota
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         </div>

//                         <div className="p-4 border-t border-gray-300 dark:border-gray-700 flex gap-3 justify-end">
//                             <button
//                                 onClick={() => setShowAssegnaModal(false)}
//                                 className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:opacity-90"
//                             >
//                                 Annulla
//                             </button>
//                             <button
//                                 onClick={confermaAssegnazioniModaleImmediata}
//                                 className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
//                             >
//                                 Conferma selezioni
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Modale principale */}
//             <div className="fixed top-16 bottom-0 left-0 right-0 z-50 bg-black/60 overflow-y-auto px-4 pt-4 pb-8 flex justify-center hide-scrollbar">
//                 <div className="modal-container p-6 rounded-xl shadow-xl w-full max-w-[600px] my-auto relative">
//                     <div className="flex justify-between items-center mb-4">
//                         <h2 className="text-xl font-bold text-theme">✏️ Modifica Progetto</h2>
//                         <button onClick={onClose}>
//                             <FontAwesomeIcon icon={faXmark} className="icon-color text-xl" />
//                         </button>
//                     </div>

//                     {/* Nome & Slug */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
//                         <div>
//                             <label className="text-sm font-semibold text-theme mb-1 block">Nome</label>
//                             <input value={nome} onChange={e => setNome(e.target.value)} className="w-full input-style" />
//                         </div>
//                         <div>
//                             <label className="text-sm font-semibold text-theme mb-1 block">Slug</label>
//                             <input value={slug} onChange={e => setSlug(e.target.value)} className="w-full input-style" />
//                             <p className="text-xs opacity-70 mt-1">URL: /progetti/{slug || "<vuoto>"}</p>
//                         </div>
//                     </div>

//                     {/* Cliente & Stato */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
//                         <div>
//                             <label className="text-sm font-semibold text-theme mb-1 block">Cliente</label>
//                             <select
//                                 value={clienteId ?? ""}
//                                 onChange={e => setClienteId(e.target.value || null)}
//                                 className="w-full input-style"
//                             >
//                                 <option value="">Seleziona cliente</option>
//                                 {clienti.map(c => (
//                                     <option key={c.id} value={c.id}>{c.nome}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div>
//                             <label className="text-sm font-semibold text-theme mb-1 block">Stato</label>
//                             <select
//                                 value={statoId ?? ""}
//                                 onChange={e => setStatoId(e.target.value === "" ? null : Number(e.target.value))}
//                                 className="w-full input-style"
//                             >
//                                 <option value="">Seleziona stato</option>
//                                 {stati.map(s => (
//                                     <option key={s.id} value={s.id}>{s.nome}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     </div>

//                     {/* Priorità & Consegna */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
//                         <div>
//                             <label className="text-sm font-semibold text-theme mb-1 block">Priorità</label>
//                             <select
//                                 value={prioritaId ?? ""}
//                                 onChange={e => setPrioritaId(e.target.value === "" ? null : Number(e.target.value))}
//                                 className="w-full input-style"
//                             >
//                                 <option value="">Seleziona priorità</option>
//                                 {priorita.map(p => (
//                                     <option key={p.id} value={p.id}>{p.nome}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div className="relative">
//                             <label className="text-sm font-semibold text-theme mb-1 block">Consegna</label>
//                             <input
//                                 type="text"
//                                 readOnly
//                                 value={consegna ? format(parseISO(consegna), "yyyy-MM-dd") : ""}
//                                 placeholder="Seleziona una data"
//                                 onClick={() => setShowDatePicker(prev => !prev)}
//                                 className="w-full input-style pr-10 cursor-pointer"
//                             />
//                             <FontAwesomeIcon
//                                 icon={faCalendarDays}
//                                 onClick={() => setShowDatePicker(prev => !prev)}
//                                 className="absolute right-3 top-[34px] text-gray-500 icon-color cursor-pointer"
//                             />
//                             {showDatePicker && (
//                                 <input
//                                     ref={dateRef}
//                                     type="date"
//                                     autoFocus
//                                     value={consegna}
//                                     onChange={e => {
//                                         setConsegna(e.target.value);
//                                         setShowDatePicker(false);
//                                     }}
//                                     className="absolute top-full mt-2 w-full input-date-native z-50"
//                                 />
//                             )}
//                         </div>
//                     </div>

//                     {/* Tempo & Membri */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 relative">
//                         <div>
//                             <label className="text-sm font-semibold text-theme mb-1 block">Tempo stimato</label>
//                             <input
//                                 value={tempoStimato}
//                                 onChange={e => setTempoStimato(e.target.value)}
//                                 placeholder="es: 10:00"
//                                 className="w-full input-style"
//                             />
//                         </div>
//                         <div className="relative">
//                             <label className="text-sm font-semibold text-theme mb-1 block">Membri</label>
//                             <div
//                                 onClick={() => setPopupOpen(!popupOpen)}
//                                 className="cursor-pointer input-style text-sm"
//                             >
//                                 {membriSelezionati.length > 0
//                                     ? `${membriSelezionati.length} membri selezionati`
//                                     : "Seleziona membri"}
//                             </div>
//                             {popupOpen && (
//                                 <div className="absolute top-full mt-2 left-0 w-full max-h-60 overflow-y-auto popup-panel z-40">
//                                     <div className="flex justify-between items-center px-3 py-2 border-b border-gray-300 dark:border-gray-600">
//                                         <strong className="text-theme">Membri</strong>
//                                         <button onClick={() => setPopupOpen(false)} className="icon-color">
//                                             <FontAwesomeIcon icon={faXmark} />
//                                         </button>
//                                     </div>
//                                     <div className="p-2 space-y-1">
//                                         {utenti.map(u => {
//                                             const selected = membriSelezionati.includes(u.id);
//                                             return (
//                                                 <div
//                                                     key={u.id}
//                                                     onClick={() => toggleMembro(u.id)}
//                                                     className={`cursor-pointer px-2 py-1 rounded border text-sm ${selected
//                                                         ? "selected-panel font-semibold"
//                                                         : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"
//                                                         }`}
//                                                 >
//                                                     {u.nome} {u.cognome}
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Note */}
//                     <div className="mb-4">
//                         <label className="text-sm font-semibold text-theme mb-1 block">Note</label>
//                         <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full input-style h-[38px]" />
//                     </div>

//                     <button
//                         onClick={salvaModifiche}
//                         className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all mt-4"
//                     >
//                         Salva modifiche
//                     </button>
//                 </div>
//             </div>
//         </>
//     );
// }
