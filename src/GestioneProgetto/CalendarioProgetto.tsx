// 📅 src/GestioneProgetto/CalendarioProgetto.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supporto/supabaseClient';
import {
    format, addDays
} from 'date-fns';
import { it } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTasks
} from '@fortawesome/free-solid-svg-icons';
import IntestazioneProgetto from './IntestazioneProgetto';
import { isUtenteAdmin } from '../supporto/ruolo';
import {
    filtraTask,
    getColorClass,
    getMessaggio,
    calcolaSettimana,
    calcolaMeseEsteso,
    generaTaskScadute
} from '../supporto/calendarioUtils';
import type { Task } from './DettaglioProgetto';

type VistaCalendario = 'settimana' | 'mese';

export default function CalendarioProgetto() {
    const { id } = useParams<{ id: string }>();
    const [taskList, setTaskList] = useState<Task[]>([]);
    const [utenteLoggatoId, setUtenteLoggatoId] = useState<string | null>(null);
    const [soloMieTask, setSoloMieTask] = useState(false);
    const [vista, setVista] = useState<VistaCalendario>('settimana');
    const [settimanaBase, setSettimanaBase] = useState(new Date());
    const [meseCorrente, setMeseCorrente] = useState(new Date());
    const [expandedGiorno, setExpandedGiorno] = useState<Date | null>(null);
    const [giornoSelezionato, setGiornoSelezionato] = useState<Date | null>(null);
    const [showPopupScadute, setShowPopupScadute] = useState(false);
    const [taskScadute, setTaskScadute] = useState<{ giorno: string; utenti: string[] }[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const oggi = new Date();
    const giorniSettimana = calcolaSettimana(settimanaBase);
    const giorniMese = vista === 'mese' ? calcolaMeseEsteso(meseCorrente) : [];

    useEffect(() => {
        let mounted = true;
        isUtenteAdmin().then(res => {
            if (mounted) {
                setIsAdmin(res);
                if (!res) setSoloMieTask(true);
            }
        });
        return () => { mounted = false };
    }, []);

    useEffect(() => {
        if (!id) return;
        supabase
            .from('progetti_task')
            .select(`task:tasks (
                id, stato_id, nome, note, consegna, tempo_stimato,
                stati (nome),
                priorita (nome),
                utenti_task:utenti_task (
                    utente:utenti (id, nome, cognome)
                )
            )`)
            .eq('progetti_id', id)
            .then(({ data, error }) => {
                if (!error && data) setTaskList(data.map((r: any) => r.task));
            });
    }, [id]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUtenteLoggatoId(data?.session?.user.id ?? null);
        });
    }, []);

    useEffect(() => {
        if (!taskList.length || document.cookie.includes('hideExpiredPopup=true')) return;
        const lista = generaTaskScadute(taskList);
        if (lista.length) {
            setTaskScadute(lista);
            setShowPopupScadute(true);
        }
    }, [taskList]);

    const renderGiornoSettimana = (giorno: Date) => {
        const tasks = filtraTask(taskList, giorno, soloMieTask, utenteLoggatoId);
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
                        <div className="flex-1 text-center text-sm px-3 py-1 rounded-md flex items-center justify-center gap-2 bg-white/60 dark:bg-white/10 shadow-sm">
                            <FontAwesomeIcon icon={faTasks} className="icon-color" />
                            <span className="truncate font-medium">{getMessaggio(giorno, oggi)}</span>
                        </div>
                    )}
                    <div className="text-sm text-theme/70 whitespace-nowrap font-medium">{tasks.length} task</div>
                </div>
                {isExpanded && (
                    <div className="px-6 py-5 bg-white dark:bg-[#1f1f1f]">
                        {tasks.length === 0 ? (
                            <div className="text-sm text-theme/60 italic">Nessuna task assegnata</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {tasks.map(t => (
                                    <div key={t.id} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
                                        <FontAwesomeIcon icon={faTasks} className="icon-color" />
                                        <span className="truncate font-medium text-sm">{t.nome}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderGiornoMese = (giorno: Date) => {
        const tasks = filtraTask(taskList, giorno, soloMieTask, utenteLoggatoId);
        const haTask = tasks.length > 0;
        return (
            <div
                key={giorno.toISOString()}
                onClick={() => haTask && setGiornoSelezionato(giorno)}
                className={`h-36 p-3 sm:p-4 cursor-pointer rounded-xl transition-colors flex flex-col justify-between border ${haTask ? getColorClass(giorno, oggi) + ' shadow-md' : 'card-theme border-transparent'}`}
            >
                <div className="flex justify-between items-start">
                    <div className="text-xs font-semibold">{format(giorno, 'd', { locale: it })}</div>
                    {haTask && <FontAwesomeIcon icon={faTasks} className="icon-color" />}
                </div>
                {haTask && (
                    <div className="text-[13px] font-medium text-center leading-snug mt-4">
                        {getMessaggio(giorno, oggi)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-theme text-theme">
            <IntestazioneProgetto
                id={id!}
                soloMieTask={soloMieTask}
                setSoloMieTask={isAdmin ? setSoloMieTask : () => { }}
            />

            <div className="p-4 sm:p-6">
                <h1 className="text-2xl font-bold mb-6 text-theme text-center sm:text-left">📅 Calendario</h1>

                <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                    <select value={vista} onChange={e => setVista(e.target.value as VistaCalendario)} className="input-style w-full sm:w-auto">
                        <option value="settimana">Vista Settimana</option>
                        <option value="mese">Vista Mese</option>
                    </select>
                </div>

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
                    {vista === 'settimana' ? (
                        <>
                            <button onClick={() => setSettimanaBase(p => addDays(p, -7))} className="text-sm hover-bg-theme px-4 py-2 rounded-md shadow-sm">← Settimana precedente</button>
                            <button onClick={() => setSettimanaBase(new Date())} className="text-sm font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 px-4 py-2 rounded-md shadow">Oggi</button>
                            <button onClick={() => setSettimanaBase(p => addDays(p, 7))} className="text-sm hover-bg-theme px-4 py-2 rounded-md shadow-sm">Settimana successiva →</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setMeseCorrente(p => new Date(p.setMonth(p.getMonth() - 1)))} className="text-sm hover-bg-theme px-4 py-2 rounded-md shadow-sm">← Mese precedente</button>
                            <div className="px-4 py-2 text-sm font-semibold text-theme rounded-md shadow-sm bg-white/40 dark:bg-white/10">
                                {format(meseCorrente, 'MMMM yyyy', { locale: it }).replace(/^./, c => c.toUpperCase())}
                            </div>
                            <button onClick={() => setMeseCorrente(new Date())} className="text-sm font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 px-4 py-2 rounded-md shadow">Oggi</button>
                            <button onClick={() => setMeseCorrente(p => new Date(p.setMonth(p.getMonth() + 1)))} className="text-sm hover-bg-theme px-4 py-2 rounded-md shadow-sm">Mese successivo →</button>
                        </>
                    )}
                </div>

                {vista === 'settimana' ? (
                    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full px-2 sm:px-4">
                        {giorniSettimana.map(renderGiornoSettimana)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3 max-w-6xl mx-auto w-full px-2 sm:px-4">
                        {giorniMese.map(renderGiornoMese)}
                    </div>
                )}

                {giornoSelezionato && vista === 'mese' && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="modal-container w-[calc(100%-32px)] max-w-md rounded-2xl shadow-2xl p-6 relative">
                            <button onClick={() => setGiornoSelezionato(null)} className="absolute top-3 right-4 text-xl text-theme/60 hover:text-red-500" aria-label="Chiudi">×</button>
                            <h2 className="text-lg font-semibold mb-4 text-center">
                                Task in scadenza il {format(giornoSelezionato, 'EEEE dd MMMM yyyy', { locale: it }).replace(/^./, c => c.toUpperCase())}
                            </h2>
                            <div className="flex flex-col gap-3 max-h-[60vh] overflow-auto scrollbar-thin">
                                {filtraTask(taskList, giornoSelezionato, soloMieTask, utenteLoggatoId).map(t => (
                                    <div key={t.id} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2 rounded shadow flex items-center gap-3 text-sm">
                                        <FontAwesomeIcon icon={faTasks} className="icon-color" />
                                        <span className="break-words">{t.nome}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
