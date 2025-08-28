// 📅 src/GestioneProgetto/CalendarioProgetto.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supporto/supabaseClient';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronDown, faTasks, faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
// import IntestazioneProgetto from '../GestioneProgetto/IntestazioneProgetto';
import { isUtenteAdmin } from '../supporto/ruolo';
import {
    filtraTask,
    getColorClass,
    getMessaggio,
    calcolaSettimana,
    generaTaskScadute
} from '../supporto/calendarioUtils';
import type { Task } from '../supporto/tipi';
import ToggleMie from '../GestioneProgetto/ToggleMie';

export default function CalendarioProgetto() {
    // accetta sia :id che :slug (oltre al caso /calendario senza parametri)
    const { id: routeId, slug } = useParams<{ id?: string; slug?: string }>();

    const [projectId, setProjectId] = useState<string | null>(routeId ?? null);
    // prima: const [taskList, setTaskList] = useState<Task[]>([]);
    const [taskList, setTaskList] = useState<(Task & { progetto_nome?: string | null })[]>([]);

    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [soloMieTask, setSoloMieTask] = useState(() => localStorage.getItem('calSoloMie') === '1');

    const [isAdmin, setIsAdmin] = useState(false);
    // mappa: idTaskPadre -> aperto/chiuso
    const [openParents, setOpenParents] = useState<Record<string, boolean>>({});

    // tiene traccia delle task che stanno aggiornandosi (disabilita il doppio click)
    const [updating, setUpdating] = useState<Set<string>>(new Set());




    // Vista SOLO SETTIMANA
    const [settimanaBase, setSettimanaBase] = useState(new Date());
    const oggi = new Date();
    const giorniSettimana = useMemo(() => calcolaSettimana(settimanaBase), [settimanaBase]);

    // admin?
    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then(res => {
            if (mounted) {
                setIsAdmin(res);
            }
        });
        return () => { mounted = false };
    }, []);

    // identifica projectId da slug (se serve)
    useEffect(() => {
        let alive = true;
        (async () => {
            if (projectId || !slug) return; // ho già un id o non ho slug
            const { data, error } = await supabase
                .from('progetti')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();
            if (!alive) return;
            if (!error && data?.id) setProjectId(data.id);
        })();
        return () => { alive = false };
    }, [slug, projectId]);

    // carica sessione utente
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUtenteLoggatoId(data?.session?.user.id ?? null);
        });
    }, []);

    // carica task (per progetto se ho projectId, altrimenti tutte)
    useEffect(() => {
        let alive = true;
        (async () => {
            let query = supabase
                .from('progetti_task')
                .select(
                    `progetti_id,
                    progetto:progetti ( id, nome ),
                    task:tasks (
                    id, stato_id, parent_id, fine_task, nome, note, consegna, tempo_stimato,
                    stati (nome),
                    priorita (nome),
                    utenti_task:utenti_task (
                    utente:utenti (id, nome, cognome)
                    )
                )
            `);

            if (projectId) query = query.eq('progetti_id', projectId);

            const { data, error } = await query;
            if (!alive) return;
            if (!error && data) {
                setTaskList(
                    data.map((r: any) => ({
                        ...r.task,
                        progetto_nome: r.progetto?.nome ?? null,
                    }))
                );
            }
        })();
        return () => { alive = false };
    }, [projectId]);

    // popup scadute
    const [showPopupScadute, setShowPopupScadute] = useState(false);
    const [taskScadute, setTaskScadute] = useState<{ giorno: string; utenti: string[] }[]>([]);
    useEffect(() => {
        if (!taskList.length || document.cookie.includes('hideExpiredPopup=true')) return;
        const lista = generaTaskScadute(taskList);
        if (lista.length) {
            setTaskScadute(lista);
            setShowPopupScadute(true);
        }
    }, [taskList]);


    // ——— versione con stato globale come in origine ———
    const [expandedGiorno, setExpandedGiorno] = useState<Date | null>(null);
    const [giornoSelezionato, setGiornoSelezionato] = useState<Date | null>(null);

    async function toggleCompletata(t: Task) {
        if (!t || updating.has(t.id)) return;
        const next = new Set(updating);
        next.add(t.id);
        setUpdating(next);

        const markComplete = !t.fine_task;
        const nowIso = new Date().toISOString();

        const { error } = await supabase
            .from('tasks')
            .update({ fine_task: markComplete ? nowIso : null })
            .eq('id', t.id);

        if (!error) {
            setTaskList(prev =>
                prev.map(x =>
                    x.id === t.id ? { ...x, fine_task: markComplete ? nowIso : null } : x
                )
            );
        }
        setUpdating(prev => {
            const n = new Set(prev);
            n.delete(t.id);
            return n;
        });
    }
    const renderCard = (giorno: Date) => {
        const tasks = filtraTask(taskList, giorno, soloMieTask, utenteLoggatoId, isAdmin);
        const isExpanded = giornoSelezionato && expandedGiorno && giorno.toDateString() === expandedGiorno.toDateString();


        return (
            <div key={giorno.toISOString()} className="card-theme rounded-xl overflow-hidden shadow-md transition-all">
                <div
                    onClick={() => {
                        const chiuso = expandedGiorno?.toDateString() === giorno.toDateString();
                        setExpandedGiorno(chiuso ? null : giorno);
                        setGiornoSelezionato(chiuso ? null : giorno);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-5 sm:py-6 cursor-pointer ${tasks.length > 0 ? getColorClass(giorno, oggi) : ''}`}
                >
                    <div className="text-base font-semibold whitespace-nowrap">
                        {format(giorno, 'EEEE dd/MM', { locale: it }).replace(/^./, c => c.toUpperCase())}
                    </div>
                    {tasks.length > 0 && (
                        <div className="hidden sm:flex flex-1 text-center text-sm px-3 py-1 rounded-md items-center justify-center gap-2 bg-white/60 dark:bg-white/10 shadow-sm">
                            <FontAwesomeIcon icon={faTasks} className="icon-color w-4 h-4" />
                            <span className="truncate font-medium">{getMessaggio(giorno, oggi)}</span>
                        </div>
                    )}
                    <div className="text-sm text-theme/70 whitespace-nowrap font-medium">{tasks.length} task</div>
                </div>

                {isExpanded && (
                    <div className="px-6 py-5">
                        {tasks.length === 0 ? (
                            <div className="text-sm text-theme/60 italic">Nessuna task assegnata</div>
                        ) : (
                            (() => {
                                const { parents, childrenByParent, orphans } = groupByParent(tasks);
                                return (
                                    <div className="flex flex-col gap-4">
                                        {/* PADRI con toggle */}
                                        {parents.map(parent => {
                                            const isOpen = !!openParents[parent.id];
                                            return (
                                                <div key={parent.id} className="rounded-xl shadow-sm bg-task">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenParents(prev => ({ ...prev, [parent.id]: !prev[parent.id] }))
                                                        }
                                                        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover-bg-theme rounded-md"
                                                        aria-expanded={isOpen}
                                                        aria-controls={`children-${parent.id}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <FontAwesomeIcon
                                                                icon={isOpen ? faChevronDown : faChevronRight}
                                                                className="icon-color w-4 h-4"
                                                            />
                                                            <FontAwesomeIcon icon={faTasks} className="icon-color w-4 h-4" />

                                                            {/* spunta/toggle stato (come ListaTask, ma cliccabile) */}
                                                            {/* spunta/toggle stato */}
                                                            <span
                                                                onClick={(e) => { e.stopPropagation(); toggleCompletata(parent); }}
                                                                title={parent.fine_task ? "Segna come NON completata" : "Segna come completata"}
                                                                className={`inline-flex items-center justify-center ${updating.has(parent.id) ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:text-green-600'
                                                                    }`}
                                                            >
                                                                {parent.fine_task ? (
                                                                    <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
                                                                ) : (
                                                                    <FontAwesomeIcon icon={faCircle} className="w-4 h-4 icon-color" />
                                                                )}
                                                            </span>

                                                            <span className="truncate font-medium text-sm">
                                                                {parent.nome}
                                                                {(parent as any).progetto_nome && <> ({(parent as any).progetto_nome})</>}
                                                            </span>

                                                        </div>
                                                        {/* opzionale: badge numero figli */}
                                                        {
                                                            !!childrenByParent.get(parent.id)?.length && (
                                                                <span className="text-xs px-2 py-1 rounded-md bg-white/60 dark:bg-white/10">
                                                                    {childrenByParent.get(parent.id)!.length}
                                                                </span>
                                                            )
                                                        }
                                                    </button>

                                                    {
                                                        isOpen && !!childrenByParent.get(parent.id)?.length && (
                                                            <div
                                                                id={`children-${parent.id}`}
                                                                className="mt-1 pb-3 pl-6 pr-4 flex flex-col gap-2 border-l border-theme/20"
                                                            >
                                                                {childrenByParent.get(parent.id)!.map(child => (
                                                                    <div
                                                                        key={child.id}
                                                                        className="px-3 py-2 rounded-md bg-task shadow-sm flex items-center gap-2"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTasks} className="icon-color w-4 h-4" />
                                                                        <span
                                                                            onClick={(e) => { e.stopPropagation(); toggleCompletata(child); }}
                                                                            title={child.fine_task ? "Segna come NON completata" : "Segna come completata"}
                                                                            className={`inline-flex items-center justify-center ${updating.has(child.id) ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:text-green-600'
                                                                                }`}
                                                                        >
                                                                            {child.fine_task ? (
                                                                                <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
                                                                            ) : (
                                                                                <FontAwesomeIcon icon={faCircle} className="w-4 h-4 icon-color" />
                                                                            )}
                                                                        </span>
                                                                        {/* mostra il nome progetto anche nelel sotto task
                                                                        {!projectId && (child as any).progetto_nome && <> 
                                                                            <span className="text-sm truncate">
                                                                                {child.nome}
                                                                                {(child as any).progetto_nome && <> ({(child as any).progetto_nome})</>}
                                                                            </span>
                                                                        </>}*/}
                                                                        <span className="text-sm truncate">{child.nome}</span>


                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            );
                                        })}

                                        {/* SOTTO‑TASK ORFANE */}
                                        {orphans.length > 0 && (
                                            <div className="rounded-xl shadow-sm bg-task p-4">
                                                <div className="text-xs font-semibold mb-2 opacity-70">
                                                    Altre sotto‑task
                                                </div>
                                                <div className="flex flex-col gap-2 pl-1">
                                                    {orphans.map(t => (
                                                        <div key={t.id} className="px-3 py-2 rounded-md bg-task shadow-sm flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faTasks} className="icon-color w-4 h-4" />
                                                            <span
                                                                onClick={(e) => { e.stopPropagation(); toggleCompletata(t); }}
                                                                title={t.fine_task ? "Segna come NON completata" : "Segna come completata"}
                                                                className={`inline-flex items-center justify-center ${updating.has(t.id) ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:text-green-600'
                                                                    }`}
                                                            >
                                                                {t.fine_task ? (
                                                                    <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
                                                                ) : (
                                                                    <FontAwesomeIcon icon={faCircle} className="w-4 h-4 icon-color" />
                                                                )}
                                                            </span>
                                                            <span className="text-sm truncate">
                                                                {t.nome}
                                                                {(t as any).progetto_nome && <> ({(t as any).progetto_nome})</>}
                                                            </span>


                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()
                        )
                        }
                    </div >
                )}
            </div >
        );
    }




    function groupByParent(tasks: Task[]) {
        const byId = new Map(tasks.map(t => [t.id, t]));
        const parents: Task[] = [];
        const childrenByParent = new Map<string, Task[]>();
        const orphans: Task[] = [];

        for (const t of tasks) {
            const pid = (t as any).parent_id as string | null | undefined;
            if (!pid) {
                parents.push(t);
                continue;
            }
            if (byId.has(pid)) {
                if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
                childrenByParent.get(pid)!.push(t);
            } else {
                orphans.push(t);
            }
        }

        // ordina per nome (cambia qui se vuoi ordine per priorità/stato)
        parents.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
        for (const arr of childrenByParent.values()) {
            arr.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
        }
        orphans.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

        return { parents, childrenByParent, orphans };
    }


    /*mantiene la preferenza del toggle nel local storage*/
    // carica preferenza salvata
    useEffect(() => {
        const saved = localStorage.getItem('calSoloMie');
        if (saved != null) setSoloMieTask(saved === '1');
    }, []);

    // salva quando cambia
    useEffect(() => {
        localStorage.setItem('calSoloMie', soloMieTask ? '1' : '0');
    }, [soloMieTask]);



    return (
        <div className="min-h-screen bg-theme text-theme">
            {/* {slug && (
                <IntestazioneProgetto
                    slug={slug}
                    soloMieTask={soloMieTask}
                    setSoloMieTask={setSoloMieTask}
                />
            )} */}

            <div className="p-4 sm:p-6">
                <div className="flex flex-row items-center justify-between flex-wrap gap-3 mb-6">
                    <h1 className="text-2xl font-bold text-theme">📅 Calendario (settimanale)</h1>
                    {/*
                    {isAdmin && !projectId && (
                        // In vista globale manteniamo il toggle se sei admin
                        <ToggleMie soloMieTask={soloMieTask} setSoloMieTask={setSoloMieTask} />
                    )}
                    {isAdmin && projectId && (
                        <ToggleMie soloMieTask={soloMieTask} setSoloMieTask={setSoloMieTask} />
                    )}
                    */}

                    <ToggleMie soloMieTask={soloMieTask} setSoloMieTask={setSoloMieTask} />
                </div>

                {/* Navigazione settimana */}
                <div className="flex flex-col sm:flex-row sm:justify-center gap-2 sm:gap-3 w-full sm:max-w-md mx-auto mb-6">
                    <button
                        onClick={() => setSettimanaBase(p => addDays(p, -7))}
                        className="w-full sm:w-auto text-sm px-4 py-2 rounded-md shadow-sm hover-bg-theme whitespace-nowrap"
                    >
                        ← Settimana precedente
                    </button>
                    <button
                        onClick={() => setSettimanaBase(new Date())}
                        className="w-full sm:w-auto text-sm font-semibold px-4 py-2 rounded-md shadow bg-button-oggi whitespace-nowrap"
                    >
                        Oggi
                    </button>
                    <button
                        onClick={() => setSettimanaBase(p => addDays(p, 7))}
                        className="w-full sm:w-auto text-sm px-4 py-2 rounded-md shadow-sm hover-bg-theme whitespace-nowrap"
                    >
                        Settimana successiva →
                    </button>
                </div>

                {/* Lista giorni della settimana */}
                <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full px-2 sm:px-4">
                    {giorniSettimana.map(renderCard)}
                </div>

                {/* Popup task scadute */}
                {showPopupScadute && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                        <div className="modal-container p-6 rounded-xl max-w-lg w-[calc(100%-40px)] shadow-2xl relative">
                            <h2 className="text-lg font-semibold mb-4">🔔 Hai delle task scadute</h2>
                            <ul className="mb-4 max-h-60 overflow-auto text-sm scrollbar-thin">
                                {taskScadute.map(({ giorno, utenti }) => (
                                    <li key={giorno} className="mb-2">📅 <strong>{giorno}</strong> – {utenti.join(', ')}</li>
                                ))}
                            </ul>
                            <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    onChange={e => {
                                        if (e.target.checked) {
                                            const expires = new Date();
                                            expires.setHours(23, 59, 59, 999);
                                            document.cookie = `hideExpiredPopup=true; expires=${expires.toUTCString()}; path=/`;
                                        }
                                    }}
                                />
                                Non ricordarmelo più oggi
                            </label>
                            <button
                                onClick={() => setShowPopupScadute(false)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
