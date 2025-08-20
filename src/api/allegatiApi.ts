// import { supabase } from "../supporto/supabaseClient";

// export type Allegato = {
//     id: string;
//     bucket: string;
//     storage_path: string;
//     file_name: string;
//     mime_type: string;
//     byte_size: number;
//     uploaded_by: string;
//     created_at: string;
// };

// export async function uploadAllegatiPerCommento(opts: {
//     files: File[];
//     taskId: string;
//     commentoId: string;
//     utenteId: string;
// }) {
//     const { files, taskId, commentoId, utenteId } = opts;

//     for (const f of files) {
//         const key = `${crypto.randomUUID()}_${f.name.replace(/\s+/g, "_")}`;
//         const path = `task/${taskId}/commento/${commentoId}/${key}`;

//         // 1) upload binario
//         const up = await supabase.storage.from("allegati").upload(path, f, {
//             upsert: false,
//         });
//         if (up.error) throw up.error;

//         // 2) metadati
//         const metaIns = await supabase
//             .from("allegati")
//             .insert({
//                 bucket: "allegati",
//                 storage_path: path,
//                 file_name: f.name,
//                 mime_type: f.type || "application/octet-stream",
//                 byte_size: f.size,
//                 uploaded_by: utenteId,
//             })
//             .select("id")
//             .single();
//         if (metaIns.error) throw metaIns.error;

//         // 3) link commento <-> allegato
//         const link = await supabase
//             .from("commenti_allegati")
//             .insert({ commento_id: commentoId, allegato_id: metaIns.data.id });
//         if (link.error) throw link.error;
//     }
// }

// export async function listAllegatiPerCommento(commentoId: string) {
//     const q = await supabase
//         .from("v_commenti_allegati")
//         .select("*")
//         .eq("commento_id", commentoId)
//         .order("created_at", { ascending: true });
//     if (q.error) throw q.error;
//     return q.data as Array<{
//         commento_id: string;
//         allegato_id: string;
//         file_name: string;
//         mime_type: string;
//         byte_size: number;
//         bucket: string;
//         storage_path: string;
//         uploaded_by: string;
//         created_at: string;
//     }>;
// }

// export async function getSignedUrl(storage_path: string, expiresSec = 600) {
//     const { data, error } = await supabase.storage
//         .from("allegati")
//         .createSignedUrl(storage_path, expiresSec);
//     if (error) throw error;
//     return data.signedUrl;
// }

// export async function deleteAllegato(allegato: Allegato) {
//     // 1) cancella link (on delete cascade su allegati non è sufficiente se cancelli solo lo storage)
//     // Meglio: cancella record meta -> trigger elimina lo storage object
//     const del = await supabase
//         .from("allegati")
//         .delete()
//         .eq("id", allegato.id);
//     if (del.error) throw del.error;
// }
