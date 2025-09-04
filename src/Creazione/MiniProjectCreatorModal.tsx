// MiniProjectCreatorModal.tsx
import React, { useEffect, useState, type JSX } from "react";
import { supabase } from "../supporto/supabaseClient";
import {
    faUserPlus, faBuilding, faFlag, faSignal, faCalendarDays, faClock, faXmark, faCopy
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { inviaNotifica } from "../Notifiche/notificheUtils";
import type { Cliente, Utente, Stato, Priorita, PopupType, MiniProjectModalProps } from "../supporto/types";
import { dispatchResourceEvent } from "../Liste/config/azioniConfig";
import { resourceConfigs } from "../Liste/config";

type Props = MiniProjectModalProps & { offsetIndex?: number };
// helper in cima al file (fuori dal componente)
function generaSlug(nome: string) {
    return nome
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")   // sostituisci spazi e caratteri speciali
        .replace(/^-+|-+$/g, "");      // rimuovi trattini iniziali/finali
}

export default function MiniProjectCreatorModal({ onClose, offsetIndex = 0 }: Props) {
    const [nome, setNome] = useState("");
    const [note, setNote] = useState("");
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [utentiSelezionati, setUtentiSelezionati] = useState<Utente[]>([]);
    const [statoId, setStatoId] = useState("");
    const [prioritaId, setPrioritaId] = useState("");
    const [consegna, setConsegna] = useState("");
    const [ore, setOre] = useState(0);
    const [minuti, setMinuti] = useState(0);
    const [popupOpen, setPopupOpen] = useState<PopupType | null>(null);
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [stati, setStati] = useState<Stato[]>([]);
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [templateList, setTemplateList] = useState<Array<{ id: string; nome: string }>>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");



    const reloadTemplateProgetti = async () => {
        const { data } = await supabase
            .from("templates_progetti")
            .select("id,nome")
            .order("nome", { ascending: true });
        setTemplateList(data || []);
    };


    useEffect(() => {
        const resize = () => setIsMobile(window.innerWidth <= 768);
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    useEffect(() => {
        Promise.all([
            supabase.from("clienti").select("id,nome").is("deleted_at", null),
            supabase.from("utenti").select("id,nome,cognome").is("deleted_at", null),
            supabase.from("stati").select("id,nome").is("deleted_at", null),
            supabase.from("priorita").select("id,nome").is("deleted_at", null),
        ]).then(([cl, u, s, p]) => {
            if (cl.data) setClienti(cl.data);
            if (u.data) setUtenti(u.data);
            if (s.data) setStati(s.data);
            if (p.data) setPriorita(p.data);
        });

        const channel = supabase.channel("realtime_project_dropdowns");

        channel
            .on("postgres_changes", { event: "*", schema: "public", table: "clienti" }, async () => {
                const { data } = await supabase.from("clienti").select("id,nome").is("deleted_at", null);
                if (data) setClienti(data);
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "utenti" }, async () => {
                const { data } = await supabase.from("utenti").select("id,nome,cognome").is("deleted_at", null);
                if (data) setUtenti(data);
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "stati" }, async () => {
                const { data } = await supabase.from("stati").select("id,nome").is("deleted_at", null);
                if (data) setStati(data);
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "priorita" }, async () => {
                const { data } = await supabase.from("priorita").select("id,nome").is("deleted_at", null);
                if (data) setPriorita(data);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // carica template progetti
    useEffect(() => {
        reloadTemplateProgetti();
    }, []);

    // realtime aggiornamenti templates_progetti
    useEffect(() => {
        const ch = supabase.channel("realtime_templates_progetti");
        ch.on("postgres_changes", { event: "*", schema: "public", table: "templates_progetti" }, reloadTemplateProgetti)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);




    const reset = () => {
        setNome(""); setNote(""); setClienteId(null);
        setUtentiSelezionati([]); setStatoId("");
        setPrioritaId(""); setConsegna("");
        setOre(0); setMinuti(0); setPopupOpen(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrore(null); setSuccess(false); setLoading(true);

        try {
            if (!nome.trim()) throw new Error("Il nome del progetto è obbligatorio.");

            // tempo stimato per IL PROGETTO
            const tempo_stimato = ore || minuti ? `${ore} hours ${minuti} minutes` : null;
            const userResp = await supabase.auth.getUser();

            // 1) Crea il progetto
            const { data: created, error } = await supabase
                .from("progetti")
                .insert({
                    nome,
                    slug: generaSlug(nome),
                    note: note || null,
                    cliente_id: clienteId,
                    stato_id: statoId ? +statoId : null,
                    priorita_id: prioritaId ? +prioritaId : null,
                    consegna: consegna || null,
                    tempo_stimato,
                })
                .select()
                .single();

            if (error || !created) throw new Error(error?.message || "Errore creazione progetto.");

            const progettoId = created.id;

            // 2) Inserisci membri in utenti_progetti + notifica
            for (const u of utentiSelezionati) {
                await supabase.from("utenti_progetti").insert({ progetto_id: progettoId, utente_id: u.id });
                await inviaNotifica(
                    "PROGETTO_ASSEGNATO",
                    [u.id],
                    `Sei stato assegnato al nuovo progetto: ${nome}`,
                    userResp.data?.user?.id,
                    { progetto_id: progettoId }
                );
            }

            // 3) Refetch coerente con la lista (JOIN completi)
            let nuovo: any = created;
            try {
                const rc: any = (resourceConfigs as any)["progetti"];
                const utenteId = userResp?.data?.user?.id ?? null;
                if (rc?.fetch) {
                    const all = await rc.fetch({ filtro: {}, utenteId });
                    nuovo = (all || []).find((x: any) => String(x.id) === String(created.id)) ?? created;
                }
            } catch (err) {
                console.warn("Refetch progetto fallito, uso record base:", err);
            }

            // 4) Dispatch finale
            // Non facciamo più "add", ci pensa il realtime.
            // Se ho fatto il refetch con join completo, aggiorno la riga esistente.
            if (nuovo && nuovo.id) {
                dispatchResourceEvent("replace", "progetti", { item: nuovo });
            }

            // 5) (OPZIONALE) Salva come MODELLO di progetto
            if (saveAsTemplate) {
                // tempo stimato per IL MODELLO (ricalcolato qui per evitare l’errore)
                const tempoTemplate = ore || minuti ? `${ore} hours ${minuti} minutes` : null;

                try {
                    const { data: tpl, error: e1 } = await supabase
                        .from("templates_progetti")
                        .insert({
                            nome: (templateName?.trim() || nome.trim()),
                            descrizione: note || null,
                            default_cliente_id: clienteId,
                            default_stato_id: statoId ? +statoId : null,
                            default_priorita_id: prioritaId ? +prioritaId : null,
                            consegna_offset_days: consegna
                                ? Math.round((new Date(consegna).getTime() - Date.now()) / 86400000)
                                : null,
                            default_tempo_stimato: tempoTemplate,
                        })
                        .select("id")
                        .single();

                    if (!e1 && tpl?.id && utentiSelezionati.length) {
                        await supabase
                            .from("templates_progetti_utenti")
                            .insert(utentiSelezionati.map(u => ({ template_id: tpl.id, utente_id: u.id })));
                    }

                    await reloadTemplateProgetti();               // aggiorna la lista subito
                    if (!e1 && tpl?.id) setSelectedTemplateId(tpl.id); // seleziona il nuovo in UI

                } catch (tplErr: any) {
                    // Non bloccare la creazione del progetto se fallisce il salvataggio del modello
                    console.warn("Salvataggio modello progetto fallito:", tplErr?.message || tplErr);
                }

            }


            setSuccess(true);
            reset();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setErrore(err?.message || "Errore durante il salvataggio.");
            setTimeout(() => setErrore(null), 3000);
        } finally {
            setLoading(false);
        }
    };



    const baseInputClass = "w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-offset-1 bg-theme text-theme";

    const popupContent: Record<PopupType, JSX.Element> = {
        cliente: (
            <div className="space-y-1 max-h-60">
                {clienti.map((c) => (
                    <div
                        key={c.id}
                        onClick={() => {
                            setClienteId(c.id === clienteId ? null : c.id);
                            setPopupOpen(null);
                        }}
                        className={`cursor-pointer px-2 py-1 rounded border ${clienteId === c.id
                            ? "selected-panel font-semibold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                    >
                        {c.nome}
                    </div>
                ))}
            </div>
        ),
        utenti: (
            <div className="space-y-1 max-h-60">
                {utenti.map(u => {
                    const selected = utentiSelezionati.some(s => s.id === u.id);
                    return (
                        <div
                            key={u.id}
                            onClick={() => setUtentiSelezionati(prev => selected ? prev.filter(s => s.id !== u.id) : [...prev, u]
                            )}
                            className={`cursor-pointer px-2 py-1 rounded border ${selected ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                        >
                            {u.nome} {u.cognome}
                        </div>
                    );
                })}
            </div>
        ),
        stato: (
            <div className="space-y-1 max-h-60">
                {stati.map((s) => (
                    <div
                        key={s.id}
                        onClick={() => {
                            setStatoId(String(s.id) === statoId ? "" : String(s.id));
                            setPopupOpen(null);
                        }}
                        className={`cursor-pointer px-2 py-1 rounded border ${statoId === String(s.id)
                            ? "selected-panel font-semibold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                    >
                        {s.nome}
                    </div>
                ))}
            </div>
        ),
        priorita: (
            <div className="space-y-1 max-h-60">
                {priorita.map((p) => (
                    <div
                        key={p.id}
                        onClick={() => {
                            setPrioritaId(String(p.id) === prioritaId ? "" : String(p.id));
                            setPopupOpen(null);
                        }}
                        className={`cursor-pointer px-2 py-1 rounded border ${prioritaId === String(p.id)
                            ? "selected-panel font-semibold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}
                    >
                        {p.nome}
                    </div>
                ))}
            </div>
        ),
        consegna: (
            <input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} className={baseInputClass} />
        ),
        tempo: (
            <div className="flex gap-2">
                <select value={ore} onChange={(e) => setOre(+e.target.value)} className={`${baseInputClass} w-1/2 hide-scrollbar`}>
                    {[...Array(25).keys()].map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
                <select value={minuti} onChange={(e) => setMinuti(+e.target.value)} className={`${baseInputClass} w-1/2 hide-scrollbar`}>
                    {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}min</option>)}
                </select>
            </div>
        ),
        modello: (
            <div className="space-y-1 max-h-60">
                {templateList.map((tpl) => (
                    <div
                        key={tpl.id}
                        onClick={async () => {
                            setSelectedTemplateId(tpl.id);
                            setPopupOpen(null);
                            // Fetch dettagli modello e applica ai campi
                            const { data } = await supabase
                                .from("templates_progetti")
                                .select("*, templates_progetti_utenti(utente_id)")
                                .eq("id", tpl.id)
                                .maybeSingle();

                            if (!data) return;
                            setNome(data.nome || "");
                            setNote(data.descrizione || "");
                            setClienteId(data.default_cliente_id || null);
                            setStatoId(data.default_stato_id ? String(data.default_stato_id) : "");
                            setPrioritaId(data.default_priorita_id ? String(data.default_priorita_id) : "");

                            if (data.consegna_offset_days != null) {
                                const d = new Date();
                                d.setDate(d.getDate() + data.consegna_offset_days);
                                setConsegna(d.toISOString().slice(0, 10));
                            }
                            if (data.default_tempo_stimato) {
                                const m = data.default_tempo_stimato.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i);
                                setOre(m ? +m[1] : 0);
                                setMinuti(m ? +m[2] : 0);
                            }
                            if (Array.isArray(data.templates_progetti_utenti)) {
                                const ids = data.templates_progetti_utenti.map((r: any) => r.utente_id);
                                setUtentiSelezionati(utenti.filter(u => ids.includes(u.id)));
                            }
                        }}
                        className={`cursor-pointer px-2 py-1 rounded border ${selectedTemplateId === tpl.id
                            ? "selected-panel font-semibold"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"
                            }`}
                    >
                        {tpl.nome}
                    </div>
                ))}
            </div>
        ),
    };

    const popupButtons = [
        { icon: faBuilding, popup: "cliente", color: "text-cyan-400", active: "text-cyan-600" },
        { icon: faUserPlus, popup: "utenti", color: "text-green-400", active: "text-green-600" },
        { icon: faFlag, popup: "stato", color: "text-red-400", active: "text-red-600" },
        { icon: faSignal, popup: "priorita", color: "text-yellow-400", active: "text-yellow-600" },
        { icon: faCalendarDays, popup: "consegna", color: "text-blue-400", active: "text-blue-600" },
        { icon: faClock, popup: "tempo", color: "text-purple-400", active: "text-purple-600" },


        { icon: faCopy, popup: "modello", color: "text-indigo-400", active: "text-indigo-600" },
    ] as const;

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

            <h2 className="text-xl font-semibold mb-4 text-center text-theme">Crea Nuovo Progetto</h2>

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
                                onClick={() => setPopupOpen(popupOpen === popup ? null : popup)}
                                className={`focus:outline-none ${popupOpen === popup ? active : color}`}
                            >
                                <FontAwesomeIcon icon={icon} />
                            </button>
                        ))}
                    </div>

                    {popupOpen && (
                        <div
                            key={`${popupOpen}-${clienti.length}-${utenti.length}-${stati.length}-${priorita.length}`}
                            className="absolute bottom-full mb-2 border rounded p-4 bg-theme text-theme shadow-md max-h-60 overflow-auto z-50 left-0 w-full hide-scrollbar"
                        >
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

                {(errore || success) && (
                    <div className="text-center text-sm">
                        {errore && <div className="text-red-600">{errore}</div>}
                        {success && <div className="text-green-600">✅ Progetto creato</div>}
                    </div>
                )}

                {saveAsTemplate && (
                    <input
                        className={baseInputClass}
                        placeholder="Nome modello"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                    />
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="saveAsTpl"
                        checked={saveAsTemplate}
                        onChange={e => setSaveAsTemplate(e.target.checked)}
                    />
                    <label htmlFor="saveAsTpl">Salva questa configurazione come modello</label>
                </div>


                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        {loading ? "Salvataggio..." : "Crea Progetto"}
                    </button>
                </div>
            </form>
        </div>
    );
}
