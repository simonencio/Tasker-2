// import { useEffect, useState } from "react";
// import { supabase } from "../supporto/supabaseClient";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faXmark } from "@fortawesome/free-solid-svg-icons";
// import { traduciColore, traduciColoreInverso } from "../supporto/traduzioniColori";

// type Props = {
//     prioritaId: string;
//     onClose: () => void;
// };

// export default function MiniPrioritaEditorModal({ prioritaId, onClose }: Props) {
//     const [nome, setNome] = useState("");
//     const [colore, setColore] = useState<string | null>(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const caricaPriorita = async () => {
//             setLoading(true);
//             const { data } = await supabase
//                 .from("priorita")
//                 .select("*")
//                 .eq("id", Number(prioritaId))
//                 .single();

//             if (data) {
//                 setNome(data.nome || "");
//                 // 🔹 converto ENG → ITA per mostrarlo all’utente
//                 setColore(data.colore ? traduciColoreInverso(data.colore) : null);
//             }
//             setLoading(false);
//         };

//         if (prioritaId) caricaPriorita();
//     }, [prioritaId]);

//     const salvaModifiche = async () => {
//         // 🔹 converto ITA → ENG prima di salvare
//         const coloreTradotto = colore ? traduciColore(colore) : null;

//         await supabase
//             .from("priorita")
//             .update({ nome, colore: coloreTradotto })
//             .eq("id", Number(prioritaId));

//         onClose();
//     };

//     if (loading) {
//         return (
//             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
//                 <div className="modal-container bg-theme text-theme p-6 rounded-xl">
//                     Caricamento...
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto px-4 py-8 flex justify-center">
//             <div className="modal-container bg-theme text-theme p-6 rounded-xl shadow-xl w-full max-w-[500px] my-auto relative">
//                 <div className="flex justify-between items-center mb-4">
//                     <h2 className="text-xl font-bold">✏️ Modifica Priorità</h2>
//                     <button onClick={onClose}>
//                         <FontAwesomeIcon icon={faXmark} className="text-xl" />
//                     </button>
//                 </div>

//                 <div className="mb-4">
//                     <label className="text-sm font-semibold mb-1 block">Nome</label>
//                     <input
//                         value={nome}
//                         onChange={(e) => setNome(e.target.value)}
//                         className="w-full input-style"
//                         placeholder="Nome priorità"
//                     />
//                 </div>

//                 <div className="mb-4">
//                     <label className="text-sm font-semibold mb-1 block">Colore</label>
//                     <input
//                         value={colore || ""}
//                         onChange={(e) => setColore(e.target.value)}
//                         className="w-full input-style"
//                         placeholder="es. rosso"
//                     />
//                 </div>

//                 <button
//                     onClick={salvaModifiche}
//                     className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mt-4"
//                 >
//                     Salva modifiche
//                 </button>
//             </div>
//         </div>
//     );
// }
