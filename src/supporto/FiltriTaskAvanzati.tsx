// import { useEffect, useMemo, useState } from "react";
// import { DateRange } from "react-date-range";
// import { format } from "date-fns";
// import type { Range } from "react-date-range";
// import type { FiltroAvanzato, Task } from "./tipi";
// import { useRef } from "react";

// import "react-date-range/dist/styles.css";
// import "react-date-range/dist/theme/default.css";

// type Props = {
//     tasks: Task[];
//     isAdmin: boolean;
//     soloMie: boolean;
//     onChange: (f: FiltroAvanzato) => void;
// };

// export default function FiltriTaskAvanzati({ tasks, soloMie, onChange }: Props) {
//     const [mostraCalendario, setMostraCalendario] = useState(false);
//     const calendarioRef = useRef<HTMLDivElement>(null);

//     const [rangeSelezionato, setRangeSelezionato] = useState<Range[]>([{
//         startDate: undefined,
//         endDate: undefined,
//         key: "selection"
//     }]);

//     const [filtro, setFiltro] = useState<FiltroAvanzato>({
//         progetto: null,
//         utente: null,
//         stato: null,
//         priorita: null,
//         dataInizio: null,
//         dataFine: null,
//         ordine: null,
//     });

//     useEffect(() => {
//         const { startDate, endDate } = rangeSelezionato[0];
//         setFiltro(prev => ({
//             ...prev,
//             dataInizio: startDate ? format(startDate, "yyyy-MM-dd") : null,
//             dataFine: endDate ? format(endDate, "yyyy-MM-dd") : null,
//         }));
//     }, [rangeSelezionato]);

//     useEffect(() => {
//         onChange(filtro);
//     }, [filtro]);

//     const taskFiltrate = useMemo(() => {
//         return tasks.filter((t) => {
//             if (filtro.progetto && t.progetto?.id !== filtro.progetto) return false;
//             if (filtro.utente && !t.assegnatari?.some((u) => u.id === filtro.utente)) return false;
//             if (filtro.stato && t.stato?.id !== filtro.stato) return false;
//             if (filtro.priorita && t.priorita?.id !== filtro.priorita) return false;
//             if (filtro.dataInizio || filtro.dataFine) {
//                 const data = t.consegna ? new Date(t.consegna) : null;
//                 if (!data) return false;
//                 const inizio = filtro.dataInizio ? new Date(filtro.dataInizio) : null;
//                 const fine = filtro.dataFine ? new Date(filtro.dataFine) : null;
//                 if (inizio && data < inizio) return false;
//                 if (fine && data > fine) return false;
//             }
//             return true;
//         });
//     }, [tasks, filtro]);
//     useEffect(() => {
//         const handleClickOutside = (e: MouseEvent) => {
//             if (
//                 mostraCalendario &&
//                 calendarioRef.current &&
//                 !calendarioRef.current.contains(e.target as Node)
//             ) {
//                 setMostraCalendario(false);
//             }
//         };

//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, [mostraCalendario]);

//     const opzioniProgetti = useMemo(() => {
//         const set = new Map();
//         taskFiltrate.forEach((t) => {
//             if (t.progetto) set.set(t.progetto.id, t.progetto.nome);
//         });
//         return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
//     }, [taskFiltrate]);

//     const opzioniUtenti = useMemo(() => {
//         const set = new Map();
//         taskFiltrate.forEach((t) => {
//             t.assegnatari?.forEach((u) => set.set(u.id, u.nome));
//         });
//         return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
//     }, [taskFiltrate]);

//     const opzioniStati = useMemo(() => {
//         const set = new Map();
//         taskFiltrate.forEach((t) => {
//             if (t.stato) set.set(t.stato.id, t.stato.nome);
//         });
//         return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
//     }, [taskFiltrate]);

//     const opzioniPriorita = useMemo(() => {
//         const set = new Map();
//         taskFiltrate.forEach((t) => {
//             if (t.priorita) set.set(t.priorita.id, t.priorita.nome);
//         });
//         return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
//     }, [taskFiltrate]);

//     return (
//         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6 w-full">

//             {/* Progetto */}
//             <select
//                 className="input-style"
//                 value={filtro.progetto || ""}
//                 onChange={(e) => setFiltro((prev) => ({ ...prev, progetto: e.target.value || null }))}
//             >
//                 <option value="">📁 Tutti i progetti</option>
//                 {opzioniProgetti.map((p) => (
//                     <option key={p.id} value={p.id}>{p.nome}</option>
//                 ))}
//             </select>

//             {/* Utente (solo se admin e non soloMie) */}
//             {!soloMie ? (
//                 <select
//                     className="input-style"
//                     value={filtro.utente || ""}
//                     onChange={(e) => setFiltro((prev) => ({ ...prev, utente: e.target.value || null }))}
//                 >
//                     <option value="">🧑‍💼 Tutti gli utenti</option>
//                     {opzioniUtenti.map((u) => (
//                         <option key={u.id} value={u.id}>{u.nome}</option>
//                     ))}
//                 </select>
//             ) : (
//                 <div className="hidden md:block" />
//             )}

//             {/* Stato */}
//             <select
//                 className="input-style"
//                 value={filtro.stato || ""}
//                 onChange={(e) => setFiltro((prev) => ({ ...prev, stato: Number(e.target.value) || null }))}
//             >
//                 <option value="">📊 Tutti gli stati</option>
//                 {opzioniStati.map((s) => (
//                     <option key={s.id} value={s.id}>{s.nome}</option>
//                 ))}
//             </select>

//             {/* Priorità */}
//             <select
//                 className="input-style"
//                 value={filtro.priorita || ""}
//                 onChange={(e) => setFiltro((prev) => ({ ...prev, priorita: Number(e.target.value) || null }))}
//             >
//                 <option value="">⏫ Tutte le priorità</option>
//                 {opzioniPriorita.map((p) => (
//                     <option key={p.id} value={p.id}>{p.nome}</option>
//                 ))}
//             </select>

//             {/* Intervallo date */}
//             <div className="relative">
//                 <button
//                     type="button"
//                     onClick={() => setMostraCalendario(prev => !prev)}
//                     className="input-style w-full text-left"
//                 >
//                     📅 {filtro.dataInizio && filtro.dataFine
//                         ? `${filtro.dataInizio} → ${filtro.dataFine}`
//                         : "Filtra per intervallo"}
//                 </button>
//                 {mostraCalendario && (
//                     <div
//                         ref={calendarioRef}
//                         className="absolute z-20 mt-2 popup-panel shadow-xl rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f2937]"
//                     >
//                         <DateRange
//                             editableDateInputs
//                             onChange={item => {
//                                 const { startDate, endDate, key } = item.selection;
//                                 setRangeSelezionato([{ startDate, endDate, key: key ?? "selection" }]);
//                                 setFiltro(prev => ({
//                                     ...prev,
//                                     dataInizio: startDate ? format(startDate, "yyyy-MM-dd") : null,
//                                     dataFine: endDate ? format(endDate, "yyyy-MM-dd") : null
//                                 }));
//                             }}
//                             moveRangeOnFirstSelection={false}
//                             ranges={[{
//                                 startDate: rangeSelezionato[0].startDate ?? new Date(),
//                                 endDate: rangeSelezionato[0].endDate ?? new Date(),
//                                 key: "selection"
//                             }]}
//                             showDateDisplay={false}
//                             rangeColors={
//                                 rangeSelezionato[0].startDate && rangeSelezionato[0].endDate
//                                     ? ["#2563eb"]
//                                     : ["transparent"]
//                             }
//                             className="popup-panel text-theme border rounded shadow-xl"
//                         />
//                         <div className="flex justify-end px-4 py-2">
//                             <button
//                                 className="text-sm text-red-600 hover:underline"
//                                 onClick={() => {
//                                     setRangeSelezionato([{ startDate: undefined, endDate: undefined, key: "selection" }]);
//                                     setFiltro(prev => ({ ...prev, dataInizio: null, dataFine: null }));
//                                     setMostraCalendario(false);
//                                 }}
//                             >
//                                 ❌ Pulisci intervallo
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {/* Ordina */}
//             <select
//                 className="input-style"
//                 value={filtro.ordine || ""}
//                 onChange={(e) => setFiltro((prev) => ({ ...prev, ordine: e.target.value || null }))}
//             >
//                 <option value="">🔀 Ordina per...</option>
//                 <option value="consegna_asc">📈 Data crescente</option>
//                 <option value="consegna_desc">📉 Data decrescente</option>
//                 <option value="priorita_urgente">🔥 Più urgente</option>
//                 <option value="priorita_meno_urgente">🧊 Meno urgente</option>
//                 <option value="stato_az">🔤 Stato A-Z</option>
//                 <option value="stato_za">🔡 Stato Z-A</option>
//                 <option value="nome_az">🔤 Nome A-Z</option>
//                 <option value="nome_za">🔡 Nome Z-A</option>
//             </select>
//         </div>

//     );
// }

// // ✅ ORDINAMENTO
// export function ordinaTaskClientSide(tasks: Task[], criterio: string | null): Task[] {
//     if (!criterio) return tasks;

//     if (criterio === "priorita_urgente" || criterio === "priorita_meno_urgente") {
//         const crescente = criterio === "priorita_urgente";
//         return [...tasks].sort((a, b) => {
//             const aPriorita = a.priorita?.id ?? Infinity;
//             const bPriorita = b.priorita?.id ?? Infinity;
//             if (aPriorita !== bPriorita) {
//                 return crescente ? aPriorita - bPriorita : bPriorita - aPriorita;
//             }
//             const aData = a.consegna ? new Date(a.consegna).getTime() : Infinity;
//             const bData = b.consegna ? new Date(b.consegna).getTime() : Infinity;
//             return aData - bData;
//         });
//     }

//     const [conValore, senzaValore] = tasks.reduce<[Task[], Task[]]>((acc, task) => {
//         const valore = getValore(task, criterio);
//         if (valore === null || valore === undefined || valore === "") acc[1].push(task);
//         else acc[0].push(task);
//         return acc;
//     }, [[], []]);

//     conValore.sort((a, b) => {
//         const aVal = getValore(a, criterio);
//         const bVal = getValore(b, criterio);
//         if (criterio.endsWith("_desc") || criterio.endsWith("za")) return bVal > aVal ? 1 : -1;
//         return aVal > bVal ? 1 : -1;
//     });

//     return [...conValore, ...senzaValore];
// }

// function getValore(task: Task, criterio: string): any {
//     switch (criterio) {
//         case "consegna_asc":
//         case "consegna_desc":
//             return task.consegna ?? null;
//         case "priorita_urgente":
//         case "priorita_meno_urgente":
//             return task.priorita?.id ?? null;
//         case "stato_az":
//         case "stato_za":
//             return task.stato?.nome ?? null;
//         case "nome_az":
//         case "nome_za":
//             return task.nome ?? null;
//         default:
//             return null;
//     }
// }
