import React, { useEffect, useState, type JSX } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faFlag, faSignal, faCalendarDays, faClock,
    faUserPlus, faBuilding, faXmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { inviaNotifica } from "../Notifiche/notificheUtils";

type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };
type Progetto = { id: string; nome: string };
type Utente = { id: string; nome: string; cognome: string };
type PopupType = "stato" | "priorita" | "consegna" | "tempo" | "progetto" | "utente";

type Props = { onClose: () => void; offsetIndex?: number };

export default function MiniTaskCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [statoId, setStatoId] = useState("");
    const [prioritaId, setPrioritaId] = useState("");
    const [consegna, setConsegna] = useState("");
    const [ore, setOre] = useState(0);
    const [minuti, setMinuti] = useState(0);
    const [popupOpen, setPopupOpen] = useState<PopupType | null>(null);
    const [progettoId, setProgettoId] = useState("");
    const [assegnatari, setAssegnatari] = useState<Utente[]>([]);
    const [mostraAvviso, setMostraAvviso] = useState(false);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [partecipanti, setPartecipanti] = useState<Utente[]>([]);
    const [esterni, setEsterni] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        Promise.all([
            supabase.from("stati").select("id, nome").is("deleted_at", null),
            supabase.from("priorita").select("id, nome").is("deleted_at", null),
            supabase.from("progetti").select("id, nome").is("deleted_at", null),
            supabase.from("utenti").select("id, nome, cognome").is("deleted_at", null),
        ]).then(([s, p, pr, u]) => {
            if (s.data) setStati(s.data);
            if (p.data) setPriorita(p.data);
            if (pr.data) setProgetti(pr.data);
            if (u.data) setUtenti(u.data);
        });
    }, []);

    useEffect(() => {
        if (!progettoId) return;
        supabase.from("utenti_progetti").select("utente_id").eq("progetto_id", progettoId).then(({ data }) => {
            const ids = data?.map((m) => m.utente_id) || [];
            setPartecipanti(utenti.filter((u) => ids.includes(u.id)));
            setEsterni(utenti.filter((u) => !ids.includes(u.id)));
            setMostraAvviso(assegnatari.some(u => !ids.includes(u.id)));
        });
    }, [progettoId, utenti, assegnatari]);

    const reset = () => {
        setNome(""); setNote(""); setStatoId(""); setPrioritaId("");
        setConsegna(""); setOre(0); setMinuti(0); setPopupOpen(null);
        setProgettoId(""); setAssegnatari([]); setMostraAvviso(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setSuccess(false);
        setLoading(true);

        if (!nome.trim()) {
            setErrore("Il nome dell’attività è obbligatorio.");
            setLoading(false);
            return;
        }

        const { data: userInfo } = await supabase.auth.getUser();
        const tempo = ore || minuti ? `${ore} hours ${minuti} minutes` : null;

        const { data: createdTask, error } = await supabase
            .from("tasks")
            .insert({
                nome,
                note: note || null,
                stato_id: statoId ? +statoId : null,
                priorita_id: prioritaId ? +prioritaId : null,
                consegna: consegna || null,
                tempo_stimato: tempo,
            })
            .select()
            .single();

        if (error || !createdTask) {
            setErrore(error?.message || "Errore creazione attività.");
            setLoading(false);
            setTimeout(() => setErrore(null), 3000);
            return;
        }

        const taskId = createdTask.id;
        const azioni = [];

        if (progettoId)
            azioni.push(supabase.from("progetti_task").insert({ task_id: taskId, progetti_id: progettoId }));

        for (const u of assegnatari) {
            if (progettoId) {
                const { data: esiste } = await supabase
                    .from("utenti_progetti")
                    .select("id")
                    .eq("utente_id", u.id)
                    .eq("progetto_id", progettoId)
                    .maybeSingle();

                if (!esiste)
                    azioni.push(supabase.from("utenti_progetti").insert({ utente_id: u.id, progetto_id: progettoId }));

                inviaNotifica("PROGETTO_ASSEGNATO", [u.id], `Sei stato assegnato al progetto con nuova attività: ${nome}`, userInfo.user?.id, { progetto_id: progettoId });
            }

            azioni.push(supabase.from("utenti_task").insert({ utente_id: u.id, task_id: taskId }));
            inviaNotifica("TASK_ASSEGNATO", [u.id], `Ti è stata assegnata una nuova attività: ${nome}`, userInfo.user?.id, { progetto_id: progettoId || undefined, task_id: taskId });
        }

        await Promise.all(azioni);
        setSuccess(true);
        reset();
        setLoading(false);
        setTimeout(() => setSuccess(false), 3000);
    };

    const baseInputClass = "w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-offset-1 bg-theme text-theme";

    const popupContent: Record<PopupType, JSX.Element> = {
        stato: (
            <select value={statoId} onChange={(e) => setStatoId(e.target.value)} className={baseInputClass}>
                <option value="">-- seleziona --</option>
                {stati.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
        ),
        priorita: (
            <select value={prioritaId} onChange={(e) => setPrioritaId(e.target.value)} className={baseInputClass}>
                <option value="">-- seleziona --</option>
                {priorita.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
        ),
        consegna: (
            <input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} className={baseInputClass} />
        ),
        tempo: (
            <div className="flex gap-2">
                <select value={ore} onChange={(e) => setOre(+e.target.value)} className={`${baseInputClass} w-1/2`}>
                    {[...Array(25).keys()].map((h) => <option key={h} value={h}>{h}h</option>)}
                </select>
                <select value={minuti} onChange={(e) => setMinuti(+e.target.value)} className={`${baseInputClass} w-1/2`}>
                    {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m}min</option>)}
                </select>
            </div>
        ),
        progetto: (
            <div className="space-y-1 max-h-60 overflow-auto">
                {progetti.map((p) => (
                    <div
                        key={p.id}
                        className={`p-2 rounded cursor-pointer border ${progettoId === p.id ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                        onClick={() => { setProgettoId(p.id); setPopupOpen(null); }}
                    >
                        {p.nome}
                    </div>
                ))}
            </div>
        ),
        utente: (
            <div className="space-y-1 max-h-60 overflow-auto">
                {(progettoId ? [...partecipanti, ...esterni] : utenti).map((u) => {
                    const selected = assegnatari.some(a => a.id === u.id);
                    return (
                        <div
                            key={u.id}
                            onClick={() =>
                                setAssegnatari(prev =>
                                    selected ? prev.filter(a => a.id !== u.id) : [...prev, u]
                                )
                            }
                            className={`p-2 rounded cursor-pointer border ${selected ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                        >
                            {u.nome} {u.cognome}
                            {esterni.includes(u) && <span className="text-xs text-gray-400"> (non partecipa)</span>}
                        </div>
                    );
                })}
            </div>
        ),
    };

    const popupButtons: { icon: any; popup: PopupType; color: string; active: string }[] = [
        { icon: faFlag, popup: "stato", color: "text-red-400", active: "text-red-600" },
        { icon: faSignal, popup: "priorita", color: "text-yellow-400", active: "text-yellow-600" },
        { icon: faCalendarDays, popup: "consegna", color: "text-blue-400", active: "text-blue-600" },
        { icon: faClock, popup: "tempo", color: "text-purple-400", active: "text-purple-600" },
        { icon: faBuilding, popup: "progetto", color: "text-cyan-400", active: "text-cyan-600" },
        { icon: faUserPlus, popup: "utente", color: "text-green-400", active: "text-green-600" },
    ];

    const computedLeft = offsetIndex
        ? `min(calc(${offsetIndex} * 420px + 24px), calc(100% - 24px - 400px))`
        : "24px";

    return (
        <div
            className="fixed bottom-6 z-50 rounded-xl shadow-xl p-5 bg-white dark:bg-gray-800 modal-container"
            style={
                isMobile
                    ? {
                        left: 0,
                        right: 0,
                        marginLeft: "auto",
                        marginRight: "auto",
                        width: "calc(100% - 32px)",
                        maxWidth: "400px",
                        zIndex: 100 + offsetIndex,
                    }
                    : {
                        left: computedLeft,
                        width: "400px",
                        zIndex: 100 + offsetIndex,
                    }
            }
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-red-600 text-2xl" title="Chiudi">
                <FontAwesomeIcon icon={faXmark} />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center text-theme">Crea Nuova Attività</h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                    <label className="block mb-1 font-medium text-theme">Nome *</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className={baseInputClass} />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-theme">Note</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${baseInputClass} resize-none`} />
                </div>

                <div className="relative">
                    <div className="flex gap-4 text-lg mb-2">
                        {popupButtons.map(({ icon, popup, color, active }) => (
                            <button
                                key={popup}
                                type="button"
                                aria-label={popup}
                                onClick={() => setPopupOpen((o) => (o === popup ? null : popup))}
                                className={`focus:outline-none ${popupOpen === popup ? active : color}`}
                            >
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        ))}
                    </div>

                    {popupOpen && (
                        <div className="absolute bottom-full mb-2 border rounded p-4 bg-theme text-theme shadow-md max-h-60 overflow-auto z-50 left-0 w-full">
                            <div className="flex justify-between items-center mb-2">
                                <strong className="capitalize text-theme">{popupOpen}</strong>
                                <button type="button" onClick={() => setPopupOpen(null)} className="text-sm">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                            {popupContent[popupOpen]}
                        </div>
                    )}
                </div>

                {(mostraAvviso || errore || success) && (
                    <div className="text-center text-sm">
                        {mostraAvviso && (
                            <div className="text-yellow-600 text-xs">⚠️ Alcuni utenti selezionati non partecipano al progetto. Saranno aggiunti automaticamente.</div>
                        )}
                        {errore && <div className="text-red-600">{errore}</div>}
                        {success && <div className="text-green-600">✅ Attività creata</div>}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Salvataggio..." : "Crea Attività"}
                    </button>
                </div>
            </form>
        </div>
    );
}
