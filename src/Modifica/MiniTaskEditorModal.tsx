// src/Modifica/MiniTaskEditorModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faXmark } from "@fortawesome/free-solid-svg-icons";
import { inviaNotifica } from "../Notifiche/notificheUtils";

type Props = {
    taskId: string;
    onClose: () => void;
};

type Utente = { id: string; nome: string; cognome: string };
type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };
type Progetto = { id: string; nome: string };
type Task = { id: string; nome: string; parent_id: string | null };

// 🔹 Aggiorna progetto ricorsivamente
const aggiornaProgettoTaskERicorsivi = async (taskId: string, nuovoProgettoId: string) => {
    await supabase.from("progetti_task").delete().eq("task_id", taskId);
    await supabase.from("progetti_task").insert({ progetti_id: nuovoProgettoId, task_id: taskId });

    await supabase.from("time_entries").update({ progetto_id: nuovoProgettoId }).eq("task_id", taskId);
    await supabase.from("task_durate_totali").update({ progetto_id: nuovoProgettoId }).eq("task_id", taskId);
    await supabase.from("notifiche").update({ progetto_id: nuovoProgettoId }).eq("task_id", taskId);

    const { data: childTasks } = await supabase.from("tasks").select("id").eq("parent_id", taskId);
    if (childTasks && childTasks.length > 0) {
        for (const child of childTasks) {
            await aggiornaProgettoTaskERicorsivi(child.id, nuovoProgettoId);
        }
    }
};

// 🔹 Aggiorna consegna e tempo stimato ricorsivamente
const aggiornaTaskConsegnaTempoRicorsivi = async (
    taskId: string,
    updates: { consegna?: string; tempo_stimato?: string | null }
) => {
    await supabase.from("tasks").update(updates).eq("id", taskId);

    const { data: childTasks } = await supabase.from("tasks").select("id").eq("parent_id", taskId);
    if (childTasks && childTasks.length > 0) {
        for (const child of childTasks) {
            await aggiornaTaskConsegnaTempoRicorsivi(child.id, updates);
        }
    }
};

export default function MiniTaskEditorModal({ taskId, onClose }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [statoId, setStatoId] = useState<number | null>(null);
    const [prioritaId, setPrioritaId] = useState<number | null>(null);
    const [consegna, setConsegna] = useState("");
    const [tempoStimato, setTempoStimato] = useState("");
    const [slug, setSlug] = useState("");

    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [assegnati, setAssegnati] = useState<string[]>([]);
    const [, setAssegnatiPrecedenti] = useState<string[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [progettoId, setProgettoId] = useState<string | null>(null);

    const [tutteLeTask, setTutteLeTask] = useState<Task[]>([]);
    const [parentId, setParentId] = useState<string | null>(null);

    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from("tasks").select("*").eq("id", taskId).single(),
            supabase.from("utenti_task").select("utente_id").eq("task_id", taskId),
            supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
            supabase.from("stati").select("id, nome").is("deleted_at", null),
            supabase.from("priorita").select("id, nome").is("deleted_at", null),
            supabase.from("progetti").select("id, nome").is("deleted_at", null),
            supabase.from("progetti_task").select("progetti_id").eq("task_id", taskId).maybeSingle(),
            supabase.from("tasks").select("id, nome, parent_id").is("deleted_at", null)
        ]).then(([taskRes, assegnatiRes, utentiRes, statiRes, prioritaRes, progettiRes, progettoTaskRes, allTasksRes]) => {
            const task = taskRes.data;
            if (task) {
                setNome(task.nome || "");
                setNote(task.note || "");
                setStatoId(task.stato_id ?? null);
                setPrioritaId(task.priorita_id ?? null);
                setConsegna(task.consegna || "");
                setTempoStimato(task.tempo_stimato || "");
                setSlug(task.slug || "");
                setParentId(task.parent_id ?? null);
            }
            if (assegnatiRes.data) {
                const ids = assegnatiRes.data.map((r: any) => r.utente_id);
                setAssegnati(ids);
                setAssegnatiPrecedenti(ids);
            }
            if (utentiRes.data) setUtenti(utentiRes.data);
            if (statiRes.data) setStati(statiRes.data);
            if (prioritaRes.data) setPriorita(prioritaRes.data);
            if (progettiRes.data) setProgetti(progettiRes.data);
            if (progettoTaskRes?.data) setProgettoId(progettoTaskRes.data.progetti_id);
            if (allTasksRes.data) setTutteLeTask(allTasksRes.data);
        });
    }, [taskId]);

    const toggleAssegnato = (id: string) => {
        setAssegnati(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
    };

    const salva = async () => {
        await supabase
            .from("tasks")
            .update({
                nome,
                note,
                stato_id: statoId,
                priorita_id: prioritaId,
                slug: slug || null,
                parent_id: parentId
            })
            .eq("id", taskId);

        // 🔹 aggiorna progetto
        if (parentId) {
            const { data: parentProgetto } = await supabase
                .from("progetti_task")
                .select("progetti_id")
                .eq("task_id", parentId)
                .maybeSingle();
            if (parentProgetto?.progetti_id) {
                await aggiornaProgettoTaskERicorsivi(taskId, parentProgetto.progetti_id);
            }
        } else if (progettoId) {
            await aggiornaProgettoTaskERicorsivi(taskId, progettoId);
        }

        // 🔹 aggiorna consegna e tempo stimato
        await aggiornaTaskConsegnaTempoRicorsivi(taskId, {
            consegna,
            tempo_stimato: tempoStimato || null,
        });

        // 🔹 aggiorna assegnatari
        const { data: esistenti } = await supabase
            .from("utenti_task")
            .select("utente_id")
            .eq("task_id", taskId);

        const esistentiIds = esistenti?.map((r: any) => r.utente_id) || [];
        const daAggiungere = assegnati.filter(id => !esistentiIds.includes(id));
        const daRimuovere = esistentiIds.filter(id => !assegnati.includes(id));
        const rimasti = assegnati.filter(id => esistentiIds.includes(id));

        const { data: userData } = await supabase.auth.getUser();
        const creatoreId = userData?.user?.id;

        if (daAggiungere.length > 0) {
            await supabase.from("utenti_task").insert(
                daAggiungere.map(id => ({ task_id: taskId, utente_id: id }))
            );
            await inviaNotifica("TASK_ASSEGNATO", daAggiungere, `Ti è stata assegnata una task: ${nome}`, creatoreId, { task_id: taskId });
        }
        if (daRimuovere.length > 0) {
            for (const id of daRimuovere) {
                await supabase.from("utenti_task").delete().eq("task_id", taskId).eq("utente_id", id);
            }
            await inviaNotifica("TASK_RIMOSSO", daRimuovere, `Sei stato rimosso dalla task: ${nome}`, creatoreId, { task_id: taskId });
        }
        if (rimasti.length > 0) {
            await inviaNotifica("TASK_MODIFICATO", rimasti, `La task "${nome}" è stata modificata.`, creatoreId, { task_id: taskId });
        }

        onClose();
    };

    return (
        <div className="fixed top-16 bottom-0 left-0 right-0 z-50 bg-black/60 overflow-y-auto px-4 pt-4 pb-8 flex justify-center hide-scrollbar">
            <div className="modal-container p-6 rounded-xl shadow-xl w-full max-w-[600px] my-auto relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-theme">✏️ Modifica Task</h2>
                    <button onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} className="icon-color text-xl" />
                    </button>
                </div>

                {/* nome e slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Nome</label>
                        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full input-style" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Slug</label>
                        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full input-style" placeholder="es: nome-task" />
                    </div>
                </div>

                {/* progetto e assegnatari */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Progetto</label>
                        <select
                            value={progettoId ?? ""}
                            onChange={(e) => setProgettoId(e.target.value || null)}
                            className="w-full input-style"
                        >
                            <option value="">Seleziona progetto</option>
                            {progetti.map((p) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <label className="text-sm font-semibold text-theme mb-1 block">Assegnatari</label>
                        <div onClick={() => setPopupOpen(!popupOpen)} className="cursor-pointer input-style text-sm">
                            {assegnati.length > 0 ? `${assegnati.length} assegnati` : "Seleziona utenti"}
                        </div>
                        {popupOpen && (
                            <div className="absolute top-full mt-1 left-0 w-full popup-panel max-h-60 overflow-y-auto z-40">
                                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-300 dark:border-gray-600">
                                    <strong className="text-theme">Utenti</strong>
                                    <button onClick={() => setPopupOpen(false)} className="icon-color">
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                                <div className="p-2 space-y-1">
                                    {utenti.map((u) => {
                                        const selected = assegnati.includes(u.id);
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleAssegnato(u.id)}
                                                className={`cursor-pointer px-2 py-1 rounded border text-sm ${selected ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                                            >
                                                {u.nome} {u.cognome}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* parent (mostrato solo se la task è figlia) */}
                {parentId !== null && (
                    <div className="mb-4">
                        <label className="text-sm font-semibold text-theme mb-1 block">Task padre</label>
                        <select
                            value={parentId ?? ""}
                            onChange={(e) => setParentId(e.target.value || null)}
                            className="w-full input-style"
                        >
                            <option value="">Nessuna (task principale)</option>
                            {tutteLeTask
                                .filter(t => t.id !== taskId)
                                .map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                        </select>
                    </div>
                )}

                {/* stato e priorità */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Stato</label>
                        <select value={statoId ?? ""} onChange={(e) => setStatoId(e.target.value === "" ? null : Number(e.target.value))} className="w-full input-style">
                            <option value="">Seleziona stato</option>
                            {stati.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Priorità</label>
                        <select value={prioritaId ?? ""} onChange={(e) => setPrioritaId(e.target.value === "" ? null : Number(e.target.value))} className="w-full input-style">
                            <option value="">Seleziona priorità</option>
                            {priorita.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>
                </div>

                {/* consegna e tempo stimato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="relative">
                        <label className="text-sm font-semibold text-theme mb-1 block">Consegna</label>
                        <input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} className="w-full pr-10 input-style" />
                        <FontAwesomeIcon icon={faCalendarDays} className="absolute right-3 top-[34px] text-gray-500 icon-color pointer-events-none" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Tempo stimato</label>
                        <input type="time" step="60" value={tempoStimato} onChange={(e) => setTempoStimato(e.target.value)} className="w-full input-style" />
                    </div>
                </div>

                {/* note */}
                <div className="mb-4">
                    <label className="text-sm font-semibold text-theme mb-1 block">Note</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full input-style min-h-[80px]" />
                </div>

                <button onClick={salva} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all">
                    Salva modifiche
                </button>
            </div>
        </div>
    );
}
