// // src/components/NasLinks.tsx
// import { useRef, useState, type JSX } from "react";

// export const INV = "\u2063"; // Invisible Separator per marcare senza “sporcare” la textarea
// type NasRef = { id: string; unc: string; label: string };

// export function normalizeUNC(input: string): string {
//     let x = input.trim().replace(/\//g, "\\");
//     if (!x.startsWith("\\\\")) x = "\\\\" + x.replace(/^\\+/, "");
//     return x;
// }
// export function lastSegmentFromUNC(unc: string): string {
//     const s = unc.replace(/\\+$/, "");
//     const parts = s.split("\\").filter(Boolean);
//     return parts[parts.length - 1] || "NAS";
// }
// export function toFileUrlFromUNC(unc: string): string {
//     const noLead = unc.replace(/^\\\\+/, "");
//     const segments = noLead.split("\\").filter(Boolean).map(encodeURIComponent);
//     return `file://///${segments.join("/")}`; // 5 slash
// }
// export async function copyToClipboard(txt: string) {
//     try { await navigator.clipboard.writeText(txt); } catch { prompt("Copia manualmente:", txt); }
// }
// export function downloadInternetShortcut(unc: string, label: string) {
//     const url = toFileUrlFromUNC(unc);
//     const content = `[InternetShortcut]\nURL=${url}\n`;
//     const blob = new Blob([content], { type: "text/plain" });
//     const a = document.createElement("a");
//     a.href = URL.createObjectURL(blob);
//     a.download = `${label}.url`;
//     document.body.appendChild(a);
//     a.click();
//     URL.revokeObjectURL(a.href);
//     a.remove();
// }

// /* ====================================================
//    Hook per gestire marcatori invisibili nella textarea
//    ==================================================== */
// export function useNasRefs() {
//     const [refs, setRefs] = useState<NasRef[]>([]);
//     const counter = useRef(0);
//     const makeId = () => `nas${++counter.current}`;

//     // Inserisce nella textarea solo la label visibile ma marcata invisibilmente
//     function insertLabelWithMarkers(text: string, caret: number, label: string, unc: string) {
//         const id = makeId();
//         const token = `${INV}${id}${INV}${label}${INV}${id}${INV}`;
//         const before = text.slice(0, caret);
//         const after = text.slice(caret);
//         setRefs((r) => [...r, { id, unc, label }]);
//         return { newText: before + token + after, id };
//     }

//     // Converte i marcatori invisibili in tag completi [[nas:\\\\...|label]]
//     function serializeForSend(text: string) {
//         let out = text;
//         for (const r of refs) {
//             const pattern = new RegExp(
//                 `${INV}${r.id}${INV}${r.label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}${INV}${r.id}${INV}`,
//                 "g"
//             );
//             const tag = `[[nas:${normalizeUNC(r.unc)}|${r.label}]]`;
//             out = out.replace(pattern, tag);
//         }
//         return out;
//     }

//     // Mostra solo la label in textarea (nasconde marcatori)
//     function displayOnlyLabels(text: string) {
//         let out = text;
//         for (const r of refs) {
//             const pattern = new RegExp(
//                 `${INV}${r.id}${INV}(${r.label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})${INV}${r.id}${INV}`,
//                 "g"
//             );
//             out = out.replace(pattern, "$1");
//         }
//         return out;
//     }

//     return { refs, insertLabelWithMarkers, serializeForSend, displayOnlyLabels };
// }

// /* ==============================
//    Mini modale per input del path
//    ============================== */
// export function NasPathModal({
//     onClose, onInsert,
// }: {
//     onClose: () => void;
//     onInsert: (unc: string, label: string) => void;
// }) {
//     const [val, setVal] = useState<string>("\\\\192.168.1.43\\public\\LAVORI\\acquedotto_del_fiora\\social\\2022\\");
//     function handleInsert() {
//         const unc = normalizeUNC(val);
//         const label = lastSegmentFromUNC(unc);
//         onInsert(unc, label);
//         onClose();
//     }
//     return (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//             <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 w-[520px] max-w-[92vw] shadow-xl">
//                 <div className="text-base font-semibold mb-2">Inserisci percorso NAS (UNC)</div>
//                 <input
//                     value={val}
//                     onChange={(e) => setVal(e.target.value)}
//                     placeholder="\\server\share\percorso\file.ext"
//                     className="w-full border rounded px-3 py-2 text-sm"
//                 />
//                 <div className="mt-3 flex gap-2 justify-end">
//                     <button onClick={onClose} className="px-3 py-1.5 text-sm rounded border">Annulla</button>
//                     <button onClick={handleInsert} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white">Inserisci</button>
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* =====================================================
//    Renderer messaggi: trasforma [[nas:..|label]] in UI
//    ===================================================== */
// export function RenderNasText({ text }: { text: string }) {
//     const parts: Array<JSX.Element | string> = [];
//     const re = /\[\[nas:([^\]|]+)\|([^\]]+)\]\]/g; // unc, label
//     let last = 0; let match: RegExpExecArray | null;
//     while ((match = re.exec(text))) {
//         const [full, unc, label] = match;
//         const start = match.index;
//         if (start > last) parts.push(text.slice(last, start));
//         const fileUrl = toFileUrlFromUNC(unc);
//         parts.push(
//             <span key={full + start} className="inline-flex items-center gap-2 underline underline-offset-2">
//                 <a href={fileUrl} target="_blank" rel="noreferrer" title={unc}>{label}</a>
//                 <button className="text-xs" onClick={() => copyToClipboard(unc)} title="Copia percorso UNC">Copia</button>
//                 <button className="text-xs" onClick={() => downloadInternetShortcut(unc, label)} title="Scarica collegamento (.url)">.url</button>
//             </span>
//         );
//         last = start + full.length;
//     }
//     if (last < text.length) parts.push(text.slice(last));
//     return <>{parts}</>;
// }
