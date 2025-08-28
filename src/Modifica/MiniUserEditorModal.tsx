// import { useEffect, useState } from "react";
// import { supabase } from "../supporto/supabaseClient";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faXmark, faUpload } from "@fortawesome/free-solid-svg-icons";

// type Props = {
//     utenteId: string;
//     onClose: () => void;
// };

// function getInitials(nome: string, cognome?: string): string {
//     if (!nome && !cognome) return "?";
//     return [nome, cognome]
//         .filter(Boolean)
//         .map((n) => n![0]?.toUpperCase())
//         .join("")
//         .slice(0, 2);
// }

// export default function MiniUserEditorModal({ utenteId, onClose }: Props) {
//     const [nome, setNome] = useState("");
//     const [cognome, setCognome] = useState("");
//     const [email, setEmail] = useState<string | null>(null);
//     const [ruoloId, setRuoloId] = useState<number | null>(null);
//     const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [uploading, setUploading] = useState(false);
//     const [avatarEsistenti, setAvatarEsistenti] = useState<string[]>([]);

//     useEffect(() => {
//         const caricaUtente = async () => {
//             setLoading(true);
//             const { data } = await supabase
//                 .from("utenti")
//                 .select("*")
//                 .eq("id", utenteId)
//                 .single();

//             if (data) {
//                 setNome(data.nome || "");
//                 setCognome(data.cognome || "");
//                 setEmail(data.email || null);
//                 setAvatarUrl(data.avatar_url || null);
//                 setRuoloId(data.ruolo || null);
//             }
//             setLoading(false);
//         };

//         const caricaAvatars = async () => {
//             const { data, error } = await supabase.storage
//                 .from("avatars")
//                 .list("", { sortBy: { column: "created_at", order: "desc" } });

//             if (!error && data) {
//                 const urls = data
//                     .filter((f) => f.name && !f.name.startsWith(".")) // 🔹 escludi placeholder
//                     .map(
//                         (f) =>
//                             supabase.storage
//                                 .from("avatars")
//                                 .getPublicUrl(f.name).data.publicUrl
//                     );
//                 setAvatarEsistenti(urls);
//             }
//         };

//         if (utenteId) {
//             caricaUtente();
//             caricaAvatars();
//         }
//     }, [utenteId]);

//     const salvaModifiche = async () => {
//         await supabase
//             .from("utenti")
//             .update({
//                 nome,
//                 cognome,
//                 email,
//                 avatar_url: avatarUrl,
//                 ruolo: ruoloId,
//             })
//             .eq("id", utenteId);

//         onClose();
//     };

//     const handleAvatarUpload = async (
//         e: React.ChangeEvent<HTMLInputElement>
//     ) => {
//         try {
//             const file = e.target.files?.[0];
//             if (!file) return;

//             setUploading(true);

//             const ext = file.name.split(".").pop();
//             const fileName = `${crypto.randomUUID()}.${ext}`;
//             const filePath = `${fileName}`;

//             const { error: uploadError } = await supabase.storage
//                 .from("avatars")
//                 .upload(filePath, file);

//             if (uploadError) throw uploadError;

//             const { data } = supabase.storage
//                 .from("avatars")
//                 .getPublicUrl(filePath);

//             setAvatarUrl(data.publicUrl);

//             // aggiorno lista
//             const { data: list } = await supabase.storage
//                 .from("avatars")
//                 .list("");
//             if (list) {
//                 const urls = list
//                     .filter((f) => f.name && !f.name.startsWith("."))
//                     .map(
//                         (f) =>
//                             supabase.storage
//                                 .from("avatars")
//                                 .getPublicUrl(f.name).data.publicUrl
//                     );
//                 setAvatarEsistenti(urls);
//             }
//         } catch (err) {
//             console.error("Errore upload avatar:", err);
//         } finally {
//             setUploading(false);
//         }
//     };

//     if (loading) {
//         return (
//             <div className="fixed top-16 bottom-0 left-0 right-0 z-50 bg-black/60 flex items-center justify-center">
//                 <div className="modal-container p-6 rounded-xl shadow-xl w-full max-w-[500px] bg-theme text-theme">
//                     <p className="text-center">Caricamento...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="fixed top-16 bottom-0 left-0 right-0 z-50 bg-black/60 overflow-y-auto px-4 pt-4 pb-8 flex justify-center hide-scrollbar">
//             <div className="modal-container p-6 rounded-xl shadow-xl w-full max-w-[500px] my-auto relative bg-theme text-theme">
//                 <div className="flex justify-between items-center mb-4">
//                     <h2 className="text-xl font-bold text-theme">✏️ Modifica Utente</h2>
//                     <button onClick={onClose}>
//                         <FontAwesomeIcon icon={faXmark} className="icon-color text-xl" />
//                     </button>
//                 </div>

//                 {/* Nome */}
//                 <div className="mb-4">
//                     <label className="text-sm font-semibold text-theme mb-1 block">
//                         Nome
//                     </label>
//                     <input
//                         value={nome}
//                         onChange={(e) => setNome(e.target.value)}
//                         className="w-full input-style"
//                         placeholder="Nome utente"
//                     />
//                 </div>

//                 {/* Cognome */}
//                 <div className="mb-4">
//                     <label className="text-sm font-semibold text-theme mb-1 block">
//                         Cognome
//                     </label>
//                     <input
//                         value={cognome}
//                         onChange={(e) => setCognome(e.target.value)}
//                         className="w-full input-style"
//                         placeholder="Cognome utente"
//                     />
//                 </div>

//                 {/* Email */}
//                 <div className="mb-4">
//                     <label className="text-sm font-semibold text-theme mb-1 block">
//                         Email
//                     </label>
//                     <input
//                         type="email"
//                         value={email || ""}
//                         onChange={(e) => setEmail(e.target.value)}
//                         className="w-full input-style"
//                         placeholder="Email utente"
//                     />
//                 </div>

//                 {/* Avatar */}
//                 <div className="mb-4">
//                     <label className="text-sm font-semibold text-theme mb-2 block">
//                         Avatar
//                     </label>

//                     <div className="flex gap-2 overflow-x-auto py-2">
//                         {avatarEsistenti.map((url) => (
//                             <img
//                                 key={url}
//                                 src={url}
//                                 alt="avatar"
//                                 className={`w-12 h-12 rounded-full object-cover cursor-pointer border-2 transition
//                                     ${avatarUrl === url ? "border-blue-500" : "border-transparent"}`}
//                                 onClick={() => setAvatarUrl(url)}
//                             />
//                         ))}

//                         {avatarEsistenti.length === 0 && (
//                             <div
//                                 className="w-12 h-12 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-bold"
//                             >
//                                 {getInitials(nome, cognome)}
//                             </div>
//                         )}
//                     </div>

//                     {/* Carica nuovo */}
//                     <label className="cursor-pointer px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2 w-fit mb-3">
//                         <FontAwesomeIcon icon={faUpload} />
//                         {uploading ? "Caricamento..." : "Carica nuovo"}
//                         <input
//                             type="file"
//                             className="hidden"
//                             accept="image/*"
//                             onChange={handleAvatarUpload}
//                         />
//                     </label>
//                 </div>

//                 {/* Pulsante Salva */}
//                 <button
//                     onClick={salvaModifiche}
//                     className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all mt-4"
//                 >
//                     Salva modifiche
//                 </button>
//             </div>
//         </div>
//     );
// }
