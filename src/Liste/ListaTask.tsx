import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTasks, faUser } from "@fortawesome/free-solid-svg-icons";
import MiniTaskEditorModal from "../Modifica/MiniTaskEditorModal";
import FiltriTaskAvanzati, { type FiltroAvanzato } from "../supporto/FiltriTaskAvanzati";

export type Task = {
    id: string;
    nome: string;
    note?: string | null;
    consegna?: string | null;
    tempo_stimato?: string | null;
    created_at: string;
    modified_at: string;
    stato?: { id: number; nome: string; colore?: string | null } | null;
    priorita?: { id: number; nome: string } | null;
    progetto?: { id: string; nome: string } | null;
    assegnatari?: { id: string; nome: string }[];
};

export default function ListaTask() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskAssegnate, setTaskAssegnate] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [soloMie, setSoloMie] = useState(false);
    const [utenteId, setUtenteId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [taskDaModificareId, setTaskDaModificareId] = useState<string | null>(null);
    const [taskEspansaId, setTaskEspansaId] = useState<string | null>(null);
    const [filtroAvanzato, setFiltroAvanzato] = useState<FiltroAvanzato>({
        progetto: null,
        utente: null,
        stato: null,
        priorita: null,
        consegna: null,
        ordine: null,
    });

    useEffect(() => {
        const fetchUtente = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUtenteId(user.id);
            const { data: ruoloData } = await supabase.from("utenti").select("ruolo").eq("id", user.id).single();
            if (ruoloData?.ruolo === 1) setIsAdmin(true);
        };
        fetchUtente();
    }, []);

    useEffect(() => {
        const caricaTasks = async () => {
            setLoading(true);
            let taskIds: string[] = [];

            if ((soloMie || filtroAvanzato.utente) && utenteId) {
                const idFiltro = filtroAvanzato.utente || utenteId;
                const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", idFiltro);
                if (!data || data.length === 0) {
                    setTasks([]);
                    setLoading(false);
                    return;
                }
                taskIds = data.map(t => t.task_id);
            }

            const query = supabase
                .from("tasks")
                .select(`
                    id, nome, note, consegna, tempo_stimato, created_at, modified_at,
                    stato:stato_id (id, nome, colore),
                    priorita:priorita_id (id, nome),
                    progetti_task:progetti_task ( progetti ( id, nome ) ),
                    utenti_task ( utenti ( id, nome ) )
                `)
                .is("deleted_at", null);

            if ((soloMie || filtroAvanzato.utente) && taskIds.length > 0) query.in("id", taskIds);
            if (filtroAvanzato.stato) query.eq("stato_id", filtroAvanzato.stato);
            if (filtroAvanzato.priorita) query.eq("priorita_id", filtroAvanzato.priorita);
            if (filtroAvanzato.consegna) query.eq("consegna", filtroAvanzato.consegna);

            const { data } = await query;
            if (data) {
                const tasksPulite: Task[] = data.map((item: any) => ({
                    id: item.id,
                    nome: item.nome,
                    note: item.note,
                    consegna: item.consegna,
                    tempo_stimato: item.tempo_stimato,
                    created_at: item.created_at,
                    modified_at: item.modified_at,
                    stato: item.stato,
                    priorita: item.priorita,
                    progetto: item.progetti_task?.[0]?.progetti ?? null,
                    assegnatari: item.utenti_task?.map((u: any) => u.utenti) ?? [],
                }));
                setTasks(ordinaTaskClientSide(tasksPulite, filtroAvanzato.ordine ?? null));
            }
            setLoading(false);
        };

        const caricaTaskAssegnate = async () => {
            if (!utenteId) return;
            const { data } = await supabase.from("utenti_task").select("task_id").eq("utente_id", utenteId);
            if (data) setTaskAssegnate(new Set(data.map(t => t.task_id)));
        };

        if (utenteId) {
            caricaTasks();
            caricaTaskAssegnate();
        }
    }, [soloMie, filtroAvanzato, utenteId]);

    return (
        <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-theme">
                    <FontAwesomeIcon icon={faTasks} className="text-green-500 mr-2" />
                    Lista Task
                </h1>
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUser} className="w-5 h-5 icon-color" />
                    <span className="text-theme font-medium">Mie</span>
                    <div
                        onClick={() => setSoloMie(v => !v)}
                        className={`toggle-theme ${soloMie ? "active" : ""}`}
                    >
                        <div className={`toggle-thumb ${soloMie ? "translate" : ""}`} />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <FiltriTaskAvanzati
                    tasks={tasks}
                    isAdmin={isAdmin}
                    soloMie={soloMie}
                    onChange={setFiltroAvanzato}
                />
            </div>

            {loading ? (
                <p className="text-theme text-center text-lg">Caricamento...</p>
            ) : (
                <div className="rounded-xl overflow-hidden shadow-md card-theme">
                    <div className="hidden lg:flex px-4 py-2 text-xs font-semibold text-theme border-b border-gray-300 dark:border-gray-600">
                        <div className="flex-1">Nome</div>
                        <div className="w-40">Consegna</div>
                        <div className="w-32">Stato</div>
                        <div className="w-32">Priorità</div>
                        <div className="w-20 text-center">Azioni</div>
                    </div>


                    {tasks.map(task => {
                        const isAssegnata = taskAssegnate.has(task.id);
                        const isOpen = taskEspansaId === task.id;

                        return (
                            <div key={task.id} className="border-t border-gray-200 dark:border-gray-700 hover-bg-theme">
                                <div className="flex items-center px-4 py-3 text-sm text-theme">
                                    <div className="flex-1 font-medium flex items-center gap-2">
                                        {isAssegnata && (
                                            <span className="text-xs text-white bg-violet-600 px-2 py-1 rounded shadow">
                                                🧠
                                            </span>
                                        )}
                                        {task.nome}
                                    </div>

                                    {/* Solo in lg e oltre */}
                                    <div className="hidden lg:block w-40 text-sm">
                                        {task.consegna ? new Date(task.consegna).toLocaleDateString() : "—"}
                                    </div>
                                    <div className="hidden lg:block w-32 text-sm">
                                        {task.stato?.nome ?? "—"}
                                    </div>
                                    <div className="hidden lg:block w-32 text-sm">
                                        {task.priorita?.nome ?? "—"}
                                    </div>

                                    <div className="w-20 flex justify-end items-center gap-3">
                                        <button
                                            onClick={() => setTaskDaModificareId(task.id)}
                                            className="icon-color hover:text-blue-600"
                                            title="Modifica"
                                        >
                                            <FontAwesomeIcon icon={faPen} />
                                        </button>
                                        <button
                                            onClick={() => setTaskEspansaId(isOpen ? null : task.id)}
                                            className="text-theme text-xl font-bold"
                                            title={isOpen ? "Chiudi dettagli" : "Apri dettagli"}
                                        >
                                            {isOpen ? "−" : "+"}
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="animate-scale-fade px-6 pb-4 text-sm text-theme space-y-1">
                                        {task.progetto?.nome && <p>📁 Progetto: {task.progetto.nome}</p>}
                                        {task.tempo_stimato && <p>⏱️ Tempo stimato: {task.tempo_stimato}</p>}

                                        {/* Questi ora SEMPRE nei dettagli, da lg in giù visibili solo qui */}
                                        <p>📅 Consegna: {task.consegna ? new Date(task.consegna).toLocaleDateString() : "—"}</p>
                                        <p>📊 Stato: {task.stato?.nome ?? "—"}</p>
                                        <p>⏫ Priorità: {task.priorita?.nome ?? "—"}</p>

                                        {task.note && <p className="whitespace-pre-line">🗒️ {task.note}</p>}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                </div>
            )}

            {taskDaModificareId && (
                <MiniTaskEditorModal
                    taskId={taskDaModificareId}
                    onClose={() => setTaskDaModificareId(null)}
                />
            )}
        </div>
    );
}

function ordinaTaskClientSide(tasks: Task[], criterio: string | null): Task[] {
    if (!criterio) return tasks;

    const [conValore, senzaValore] = tasks.reduce<[Task[], Task[]]>((acc, task) => {
        const valore = getValore(task, criterio);
        if (valore === null || valore === undefined || valore === "") acc[1].push(task);
        else acc[0].push(task);
        return acc;
    }, [[], []]);

    conValore.sort((a, b) => {
        const aVal = getValore(a, criterio);
        const bVal = getValore(b, criterio);
        if (criterio.endsWith("_desc") || criterio.endsWith("za") || criterio.endsWith("meno_urgente"))
            return bVal > aVal ? 1 : -1;
        else return aVal > bVal ? 1 : -1;
    });

    return [...conValore, ...senzaValore];
}

function getValore(task: Task, criterio: string): any {
    switch (criterio) {
        case "consegna_asc":
        case "consegna_desc":
            return task.consegna ?? null;
        case "priorita_urgente":
        case "priorita_meno_urgente":
            return task.priorita?.id ?? null;
        case "stato_az":
        case "stato_za":
            return task.stato?.nome ?? null;
        case "nome_az":
        case "nome_za":
            return task.nome ?? null;
        default:
            return null;
    }
}
