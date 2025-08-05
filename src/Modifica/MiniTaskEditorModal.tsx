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

export default function MiniTaskEditorModal({ taskId, onClose }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [statoId, setStatoId] = useState<number | null>(null);
    const [prioritaId, setPrioritaId] = useState<number | null>(null);
    const [consegna, setConsegna] = useState("");
    const [tempoStimato, setTempoStimato] = useState("");
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [assegnati, setAssegnati] = useState<string[]>([]);
    const [, setAssegnatiPrecedenti] = useState<string[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from("tasks").select("*").eq("id", taskId).single(),
            supabase.from("utenti_task").select("utente_id").eq("task_id", taskId),
            supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
            supabase.from("stati").select("id, nome").is("deleted_at", null),
            supabase.from("priorita").select("id, nome").is("deleted_at", null),
        ]).then(([taskRes, assegnatiRes, utentiRes, statiRes, prioritaRes]) => {
            const task = taskRes.data;
            if (task) {
                setNome(task.nome || "");
                setNote(task.note || "");
                setStatoId(task.stato_id ?? null);
                setPrioritaId(task.priorita_id ?? null);
                setConsegna(task.consegna || "");
                setTempoStimato(task.tempo_stimato || "");
            }
            if (assegnatiRes.data) {
                const ids = assegnatiRes.data.map((r: any) => r.utente_id);
                setAssegnati(ids);
                setAssegnatiPrecedenti(ids);
            }
            if (utentiRes.data) setUtenti(utentiRes.data);
            if (statiRes.data) setStati(statiRes.data);
            if (prioritaRes.data) setPriorita(prioritaRes.data);
        });
    }, [taskId]);

    const toggleAssegnato = (id: string) => {
        setAssegnati(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
    };

    const salva = async () => {
        await supabase.from("tasks").update({
            nome,
            note,
            stato_id: statoId,
            priorita_id: prioritaId,
            consegna,
            tempo_stimato: tempoStimato,
        }).eq("id", taskId);

        const { data: esistenti } = await supabase
            .from("utenti_task")
            .select("utente_id")
            .eq("task_id", taskId);
        const esistentiIds = esistenti?.map((r: any) => r.utente_id) || [];

        const daAggiungere = assegnati.filter(id => !esistentiIds.includes(id));
        const daRimuovere = esistentiIds.filter(id => !assegnati.includes(id));
        const rimasti = assegnati.filter(id => esistentiIds.includes(id));

        const { data: user } = await supabase.auth.getUser();
        const creatoreId = user?.user?.id;

        if (daAggiungere.length > 0) {
            await supabase.from("utenti_task").insert(
                daAggiungere.map(id => ({ task_id: taskId, utente_id: id }))
            );
            await inviaNotifica("TASK_ASSEGNATA", daAggiungere, `Ti è stata assegnata una task: ${nome}`, creatoreId, { task_id: taskId });
        }

        if (daRimuovere.length > 0) {
            for (const id of daRimuovere) {
                await supabase.from("utenti_task")
                    .delete()
                    .eq("task_id", taskId)
                    .eq("utente_id", id);
            }
            await inviaNotifica("TASK_RIMOSSA", daRimuovere, `Sei stato rimosso dalla task: ${nome}`, creatoreId, { task_id: taskId });
        }

        if (rimasti.length > 0) {
            await inviaNotifica("TASK_MODIFICATA", rimasti, `La task "${nome}" è stata modificata.`, creatoreId, { task_id: taskId });
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

                {/* Nome e Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Nome</label>
                        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full input-style" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Note</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full input-style h-[38px]" />
                    </div>
                </div>

                {/* Stato & Priorità */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Stato</label>
                        <select
                            value={statoId ?? ""}
                            onChange={(e) => setStatoId(e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full input-style"
                        >
                            <option value="">Seleziona stato</option>
                            {stati.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Priorità</label>
                        <select
                            value={prioritaId ?? ""}
                            onChange={(e) => setPrioritaId(e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full input-style"
                        >
                            <option value="">Seleziona priorità</option>
                            {priorita.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>
                </div>

                {/* Consegna & Tempo stimato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="relative">
                        <label className="text-sm font-semibold text-theme mb-1 block">Consegna</label>
                        <input
                            type="date"
                            value={consegna}
                            onChange={(e) => setConsegna(e.target.value)}
                            className="w-full pr-10 input-style"
                        />
                        <FontAwesomeIcon
                            icon={faCalendarDays}
                            className="absolute right-3 top-[34px] text-gray-500 icon-color pointer-events-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-theme mb-1 block">Tempo stimato</label>
                        <input value={tempoStimato} onChange={(e) => setTempoStimato(e.target.value)} placeholder="es: 03:30" className="w-full input-style" />
                    </div>
                </div>

                {/* Assegnatari */}
                <div className="relative mb-4">
                    <label className="text-sm font-semibold text-theme mb-1 block">Assegnatari</label>
                    <div onClick={() => setPopupOpen(!popupOpen)} className="cursor-pointer input-style text-sm">
                        {assegnati.length > 0 ? `${assegnati.length} assegnati` : "Seleziona utenti"}
                    </div>
                    {popupOpen && (
                        <div className="absolute bottom-full mb-2 left-0 w-full max-h-60 overflow-y-auto popup-panel z-40">
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
                                        <div key={u.id}
                                            onClick={() => toggleAssegnato(u.id)}
                                            className={`cursor-pointer px-2 py-1 rounded border text-sm ${selected ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}>
                                            {u.nome} {u.cognome}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={salva} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all">
                    Salva modifiche
                </button>
            </div>
        </div>
    );
}
