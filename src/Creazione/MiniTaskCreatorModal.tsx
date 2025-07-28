import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faFlag,
    faSignal,
    faCalendarDays,
    faClock,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { inviaNotifica } from "../Notifiche/notificheUtils";

type Stato = { id: number; nome: string };
type Priorita = { id: number; nome: string };
type Progetto = { id: string; nome: string };
type Utente = { id: string; nome: string; cognome: string };
type PopupType = "stato" | "priorita" | "consegna" | "tempo";

type Props = { onClose: () => void };

export default function MiniTaskCreatorModal({ onClose }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [statoId, setStatoId] = useState("");
    const [prioritaId, setPrioritaId] = useState("");
    const [consegna, setConsegna] = useState("");
    const [ore, setOre] = useState(0);
    const [minuti, setMinuti] = useState(0);

    const [popupOpen, setPopupOpen] = useState<PopupType | null>(null);
    const [selecting, setSelecting] = useState<"progetto" | "utente" | null>(
        null
    );

    const [progettoId, setProgettoId] = useState("");
    const [assegnatario, setAssegnatario] = useState<Utente | null>(null);
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

    useEffect(() => {
        const load = async () => {
            const [{ data: s }, { data: p }, { data: pr }, { data: u }] =
                await Promise.all([
                    supabase.from("stati").select("id, nome").is("deleted_at", null),
                    supabase.from("priorita").select("id, nome").is("deleted_at", null),
                    supabase.from("progetti").select("id, nome").is("deleted_at", null),
                    supabase
                        .from("utenti")
                        .select("id, nome, cognome")
                        .is("deleted_at", null),
                ]);
            if (s) setStati(s);
            if (p) setPriorita(p);
            if (pr) setProgetti(pr);
            if (u) setUtenti(u);
        };
        load();
    }, []);

    useEffect(() => {
        if (!progettoId) return;

        const fetchMembri = async () => {
            const { data: membri } = await supabase
                .from("utenti_progetti")
                .select("utente_id")
                .eq("progetto_id", progettoId);

            const membriIds = membri?.map((m) => m.utente_id) || [];

            setPartecipanti(utenti.filter((u) => membriIds.includes(u.id)));
            setEsterni(utenti.filter((u) => !membriIds.includes(u.id)));

            if (assegnatario) {
                setMostraAvviso(!membriIds.includes(assegnatario.id));
            }
        };

        fetchMembri();
    }, [progettoId, utenti, assegnatario]);

    const resetForm = () => {
        setNome("");
        setNote("");
        setStatoId("");
        setPrioritaId("");
        setConsegna("");
        setOre(0);
        setMinuti(0);
        setPopupOpen(null);
        setSelecting(null);
        setProgettoId("");
        setAssegnatario(null);
        setMostraAvviso(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null);
        setLoading(true);

        const tempoStimato =
            ore === 0 && minuti === 0 ? null : `${ore} hours ${minuti} minutes`;

        const { data: userInfo } = await supabase.auth.getUser();

        const { data: createdTask, error: taskError } = await supabase
            .from("tasks")
            .insert({
                nome,
                note: note || null,
                stato_id: statoId ? Number(statoId) : null,
                priorita_id: prioritaId ? Number(prioritaId) : null,
                consegna: consegna || null,
                tempo_stimato: tempoStimato,
            })
            .select()
            .single();

        if (taskError || !createdTask) {
            setErrore(taskError?.message || "Errore creazione task");
            setLoading(false);
            setTimeout(() => setErrore(null), 1000);
            return;
        }

        const taskId = createdTask.id;
        const azioni = [];

        if (progettoId) {
            azioni.push(
                supabase.from("progetti_task").insert({
                    task_id: taskId,
                    progetti_id: progettoId,
                })
            );
        }

        if (assegnatario) {
            if (progettoId) {
                const { data: esiste } = await supabase
                    .from("utenti_progetti")
                    .select("id")
                    .eq("utente_id", assegnatario.id)
                    .eq("progetto_id", progettoId)
                    .maybeSingle();

                if (!esiste) {
                    azioni.push(
                        supabase.from("utenti_progetti").insert({
                            utente_id: assegnatario.id,
                            progetto_id: progettoId,
                        })
                    );
                    inviaNotifica(
                        "PROGETTO_ASSEGNATO",
                        [assegnatario.id],
                        `Sei stato assegnato al progetto contenente la nuova attività: ${nome}`,
                        userInfo.user?.id,
                        { progetto_id: progettoId }
                    );
                }
            }

            azioni.push(
                supabase.from("utenti_task").insert({
                    utente_id: assegnatario.id,
                    task_id: taskId,
                })
            );

            inviaNotifica(
                "TASK_ASSEGNATO",
                [assegnatario.id],
                `Ti è stata assegnata una nuova attività: ${nome}`,
                userInfo.user?.id,
                { progetto_id: progettoId || undefined, task_id: taskId }
            );
        }

        await Promise.all(azioni);
        setLoading(false);
        setSuccess(true);
        resetForm();
        setTimeout(() => setSuccess(false), 1000);
    };

    const popupButtons = [
        {
            icon: faFlag,
            popup: "stato",
            color: "text-red-400",
            activeColor: "text-red-600",
        },
        {
            icon: faSignal,
            popup: "priorita",
            color: "text-yellow-400",
            activeColor: "text-yellow-600",
        },
        {
            icon: faCalendarDays,
            popup: "consegna",
            color: "text-blue-400",
            activeColor: "text-blue-600",
        },
        {
            icon: faClock,
            popup: "tempo",
            color: "text-purple-400",
            activeColor: "text-purple-600",
        },
    ];

    return (
        <div className="fixed bottom-6 left-6 z-50 w-[460px] bg-white border border-gray-300 rounded-xl shadow-xl p-5 ">
            {/* Pulsante X in alto a destra */}
            <div className="absolute top-2 right-2">
                <button
                    onClick={onClose}
                    className="text-red-600 hover:text-red-800 text-lg"
                    title="Chiudi"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <h2 className="text-xl font-semibold mb-4 text-center">
                Crea Nuova Attività
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                {/* Selezione progetto e utente */}
                <div className="flex flex-wrap items-center gap-2 border border-gray-200 p-3 rounded bg-gray-50">
                    <span className="font-medium">in</span>
                    <div
                        onClick={() => setSelecting("progetto")}
                        className="cursor-pointer px-3 py-1 bg-white border border-gray-300 rounded flex items-center gap-2 min-w-[120px]"
                    >
                        {progettoId ? (
                            <>
                                <span>{progetti.find((p) => p.id === progettoId)?.nome}</span>
                                <FontAwesomeIcon
                                    icon={faXmark}
                                    className="text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setProgettoId("");
                                        setMostraAvviso(false);
                                    }}
                                />
                            </>
                        ) : (
                            <span className="text-gray-400">Seleziona progetto</span>
                        )}
                    </div>

                    <span className="font-medium">per</span>
                    <div
                        onClick={() => setSelecting("utente")}
                        className="cursor-pointer px-3 py-1 bg-white border border-gray-300 rounded flex items-center gap-2 min-w-[120px]"
                    >
                        {assegnatario ? (
                            <>
                                <span>
                                    {assegnatario.nome} {assegnatario.cognome}
                                </span>
                                <FontAwesomeIcon
                                    icon={faXmark}
                                    className="text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAssegnatario(null);
                                        setMostraAvviso(false);
                                    }}
                                />
                            </>
                        ) : (
                            <span className="text-gray-400">Seleziona utente</span>
                        )}
                    </div>
                </div>

                {/* Popup selezione progetto/utente */}
                {selecting && (
                    <div className="border mt-1 rounded bg-white max-h-[200px] overflow-y-auto shadow p-2">
                        {selecting === "progetto" &&
                            progetti.map((p) => (
                                <div
                                    key={p.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                                    onClick={() => {
                                        setProgettoId(p.id);
                                        setSelecting(null);
                                    }}
                                >
                                    {p.nome}
                                </div>
                            ))}
                        {selecting === "utente" &&
                            (progettoId ? (
                                <>
                                    <div className="text-xs text-gray-500 px-2 mb-1">Partecipanti</div>
                                    {partecipanti.map((u) => (
                                        <div
                                            key={u.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                                            onClick={() => {
                                                setAssegnatario(u);
                                                setSelecting(null);
                                                setMostraAvviso(false);
                                            }}
                                        >
                                            {u.nome} {u.cognome}
                                        </div>
                                    ))}
                                    <div className="text-xs text-gray-500 px-2 mt-2 mb-1">Altri</div>
                                    {esterni.map((u) => (
                                        <div
                                            key={u.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                                            onClick={() => {
                                                setAssegnatario(u);
                                                setSelecting(null);
                                                setMostraAvviso(true);
                                            }}
                                        >
                                            {u.nome} {u.cognome}{" "}
                                            <span className="text-xs text-gray-400">(non partecipa)</span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                utenti.map((u) => (
                                    <div
                                        key={u.id}
                                        className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                                        onClick={() => {
                                            setAssegnatario(u);
                                            setSelecting(null);
                                        }}
                                    >
                                        {u.nome} {u.cognome}
                                    </div>
                                ))
                            ))}
                    </div>
                )}

                {/* Avviso utente esterno */}
                {mostraAvviso && (
                    <div className="text-yellow-600 text-xs">
                        ⚠️ L’utente selezionato non è membro del progetto. Sarà aggiunto automaticamente.
                    </div>
                )}

                {/* Campo nome */}
                <div>
                    <label className="block mb-1 font-medium">Nome *</label>
                    <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="w-full border rounded px-3 py-2"
                    />
                </div>

                {/* Note */}
                <div>
                    <label className="block mb-1 font-medium">Note</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full border rounded px-3 py-2 resize-none"
                    />
                </div>

                {/* Icone popup */}
                <div className="flex justify-center gap-4 text-lg">
                    {popupButtons.map(({ icon, popup, color, activeColor }) => {
                        const isActive = popupOpen === popup;
                        return (
                            <button
                                key={popup}
                                type="button"
                                title={popup}
                                onClick={() =>
                                    setPopupOpen((isActive ? null : popup) as PopupType | null)
                                }
                                className={`${isActive ? activeColor : color} transition-colors duration-200`}
                            >
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        );
                    })}
                </div>

                {/* Popup contenuti */}
                {popupOpen && (
                    <div className="absolute bottom-28 left-6 bg-white shadow-lg border rounded p-4 z-50 w-[300px]">
                        <div className="flex justify-between items-center mb-2">
                            <strong className="capitalize">{popupOpen}</strong>
                            <FontAwesomeIcon
                                icon={faXmark}
                                className="cursor-pointer"
                                onClick={() => setPopupOpen(null)}
                            />
                        </div>

                        {popupOpen === "stato" && (
                            <select
                                value={statoId}
                                onChange={(e) => setStatoId(e.target.value)}
                                className="w-full border rounded px-2 py-1"
                            >
                                <option value="">-- seleziona --</option>
                                {stati.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nome}
                                    </option>
                                ))}
                            </select>
                        )}
                        {popupOpen === "priorita" && (
                            <select
                                value={prioritaId}
                                onChange={(e) => setPrioritaId(e.target.value)}
                                className="w-full border rounded px-2 py-1"
                            >
                                <option value="">-- seleziona --</option>
                                {priorita.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome}
                                    </option>
                                ))}
                            </select>
                        )}
                        {popupOpen === "consegna" && (
                            <input
                                type="date"
                                value={consegna}
                                onChange={(e) => setConsegna(e.target.value)}
                                className="w-full border rounded px-2 py-1"
                            />
                        )}
                        {popupOpen === "tempo" && (
                            <div className="flex gap-2">
                                <select
                                    value={ore}
                                    onChange={(e) => setOre(Number(e.target.value))}
                                    className="w-1/2 border rounded px-2 py-1"
                                >
                                    {[...Array(25).keys()].map((h) => (
                                        <option key={h} value={h}>
                                            {h}h
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={minuti}
                                    onChange={(e) => setMinuti(Number(e.target.value))}
                                    className="w-1/2 border rounded px-2 py-1"
                                >
                                    {[0, 15, 30, 45].map((m) => (
                                        <option key={m} value={m}>
                                            {m}min
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Messaggi */}
                {(errore || success) && (
                    <div className="text-center">
                        {errore && <div className="text-red-600 text-sm">{errore}</div>}
                        {success && <div className="text-green-600 text-sm">✅ Attività creata</div>}
                    </div>
                )}

                {/* Pulsante invio */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        {loading ? "Salvataggio..." : "Crea Attività"}
                    </button>
                </div>
            </form>
        </div>
    );

}
