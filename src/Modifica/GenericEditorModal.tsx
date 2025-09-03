// src/Modifica/GenericEditorModal.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faUpload } from "@fortawesome/free-solid-svg-icons";
import { editorConfigs, type CampoSelect, type CampoJoinMany } from "./editorConfigs";
import { traduciColore, traduciColoreInverso } from "../supporto/traduzioniColori";
import { dispatchResourceEvent } from "../Liste/config/azioniConfig";
import { resourceConfigs } from "../Liste/resourceConfigs"; // 👈 usare la stessa fetch della lista

type Props = {
    table: keyof typeof editorConfigs;
    id: string;
    onClose: () => void;
    onSaved?: () => void;   // 👈 aggiungi questa riga
};


const Loading = () => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="modal-container bg-theme text-theme p-6 rounded-xl">Caricamento...</div>
    </div>
);

const ModalFrame: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxW?: string }> = ({
    title,
    onClose,
    children,
    maxW = "max-w-[800px]",
}) => (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto px-4 py-8 flex justify-center">
        <div className={`modal-container p-6 rounded-xl shadow-xl w-full ${maxW} my-auto relative`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-theme">{title}</h2>
                <button onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} className="icon-color text-xl" />
                </button>
            </div>
            {children}
        </div>
    </div>
);

const GenericEditorModal: React.FC<Props> = ({ table, id, onClose, onSaved }) => {

    const config = editorConfigs[table];

    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<Record<string, any>>({});
    const [originale, setOriginale] = useState<Record<string, any> | null>(null);
    const [options, setOptions] = useState<Record<string, any[]>>({});
    const [joinSelections, setJoinSelections] = useState<Record<string, string[]>>({});
    const [joinOriginals, setJoinOriginals] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: record } = await supabase.from(table).select("*").eq("id", id).maybeSingle();

            if (record) {
                // mappa speciale tasks → progetto_id dalla pivot se presente
                if (table === "tasks") {
                    const { data: link } = await supabase
                        .from("progetti_task")
                        .select("progetti_id")
                        .eq("task_id", id)
                        .maybeSingle();
                    if (link) record.progetto_id = link.progetti_id;
                }
                setForm(record);
                setOriginale(record);
            }

            const opts: Record<string, any[]> = {};
            const joins: Record<string, string[]> = {};
            const joinsOrig: Record<string, string[]> = {};

            for (const campo of config.campi) {
                if (campo.tipo === "select") {
                    const c = campo as CampoSelect;
                    let q = supabase.from(c.sorgente.tabella).select(`${c.sorgente.value},${c.sorgente.label}`);
                    if (c.sorgente.where) {
                        for (const [col, op, val] of c.sorgente.where) q = q.filter(col, op as any, val);
                    }
                    if (c.sorgente.orderBy) {
                        q = q.order(c.sorgente.orderBy.colonna, { ascending: c.sorgente.orderBy.asc ?? true });
                    }
                    const { data } = await q;
                    opts[campo.chiave] = data || [];
                }

                if (campo.tipo === "join-many") {
                    const c = campo as CampoJoinMany;
                    const { data } = await supabase
                        .from(c.join.tabellaJoin)
                        .select(c.join.otherKey)
                        .eq(c.join.thisKey, id);
                    const values = (data || []).map((r: any) => r[c.join.otherKey]);
                    joins[campo.chiave] = values;
                    joinsOrig[campo.chiave] = values;

                    let q = supabase.from(c.pick.tabellaOther).select("*");
                    if (c.pick.where) {
                        for (const [col, op, val] of c.pick.where) q = q.filter(col, op as any, val);
                    }
                    if (c.pick.orderBy) {
                        q = q.order(c.pick.orderBy.colonna, { ascending: c.pick.orderBy.asc ?? true });
                    }
                    const { data: others } = await q;
                    opts[campo.chiave] = others || [];
                }
            }

            setOptions(opts);
            setJoinSelections(joins);
            setJoinOriginals(joinsOrig);
            setLoading(false);
        };
        load();
    }, [id, table, config.campi]);

    const updateForm = (chiave: string, valore: any) => setForm((f) => ({ ...f, [chiave]: valore }));

    const toggleJoinValue = (campo: CampoJoinMany, value: string) => {
        setJoinSelections((prev) => {
            const prevVals = prev[campo.chiave] || [];
            const next = prevVals.includes(value) ? prevVals.filter((v) => v !== value) : [...prevVals, value];
            return { ...prev, [campo.chiave]: next };
        });
    };

    // 🔁 Refetch coerente con la lista (usa resourceConfigs.fetch, poi trova l'item per id)
    const refetchRecordConFetchDellaLista = async (): Promise<any | null> => {
        try {
            const rc: any = (resourceConfigs as any)[table as string];
            const utenteResp = await supabase.auth.getUser();
            const utenteId = utenteResp?.data?.user?.id ?? null;

            if (rc?.fetch) {
                const all = await rc.fetch({ filtro: {}, utenteId });
                const trovato = (all || []).find((x: any) => String(x.id) === String(id)) ?? null;
                if (trovato) return trovato;
            }
        } catch {
            // fallback sotto
        }

        // Fallback minimale (senza join): manteniamo la vecchia logica base
        const { data: base } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
        if (base && table === "tasks") {
            const { data: link } = await supabase
                .from("progetti_task")
                .select("progetti_id")
                .eq("task_id", id)
                .maybeSingle();
            if (link) base.progetto_id = link.progetti_id;
        }
        return base ?? null;
    };

    const salva = async () => {
        setSaving(true);
        setSuccess(null);
        setError(null);

        try {
            // 1) update tabella principale
            let payload = { ...form };
            delete payload.id;
            if (table === "tasks") delete payload.progetto_id;

            const { error: errUpdate } = await supabase.from(table).update(payload).eq("id", id);
            if (errUpdate) throw errUpdate;

            // Aggiorna subito i campi semplici (merge) per reattività immediata
            dispatchResourceEvent("update", table as string, { id, patch: payload });

            // 2) sync join-many
            for (const campo of config.campi) {
                if (campo.tipo === "join-many") {
                    const c = campo as CampoJoinMany;
                    const prev = joinOriginals[campo.chiave] || [];
                    const next = joinSelections[campo.chiave] || [];
                    const daAggiungere = next.filter((x) => !prev.includes(x));
                    const daRimuovere = prev.filter((x) => !next.includes(x));

                    if (daRimuovere.length > 0) {
                        await supabase
                            .from(c.join.tabellaJoin)
                            .delete()
                            .eq(c.join.thisKey, id)
                            .in(c.join.otherKey, daRimuovere);
                    }
                    if (daAggiungere.length > 0) {
                        await supabase
                            .from(c.join.tabellaJoin)
                            .insert(daAggiungere.map((v) => ({ [c.join.thisKey]: id, [c.join.otherKey]: v })));
                    }
                }
            }

            // 3) caso speciale tasks: pivot progetto
            if (table === "tasks") {
                const newProjId = form.progetto_id;
                const { data: oldLink } = await supabase
                    .from("progetti_task")
                    .select("progetti_id")
                    .eq("task_id", id)
                    .maybeSingle();

                if (oldLink?.progetti_id !== newProjId) {
                    await supabase.from("progetti_task").delete().eq("task_id", id);
                    if (newProjId) {
                        await supabase.from("progetti_task").insert({ progetti_id: newProjId, task_id: id });
                    }
                }
            }

            // 4) hook custom post-save
            if (config.hooks?.afterSave) {
                await config.hooks.afterSave({ form, originale, joinOriginals, joinSelections, supabase, id });
            }

            // 5) 🔥 Refetch completo con la stessa fetch della lista (join & calcolati allineati)
            const nuovo = await refetchRecordConFetchDellaLista();
            if (nuovo) {
                dispatchResourceEvent("replace", table as string, { item: nuovo });
            }
            // 👇 qui richiami il callback subito dopo il salvataggio
            if (onSaved) {
                onSaved();
            }



            setSuccess("Salvato con successo ✅");
            setOriginale(form);
            setJoinOriginals(joinSelections);
        } catch (err: any) {
            setError(err?.message || "Errore durante il salvataggio");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <ModalFrame title={config.titolo as string} onClose={onClose}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.campi.map((campo) => {
                    const val = form[campo.chiave] ?? "";
                    switch (campo.tipo) {
                        case "text":
                        case "email":
                        case "tel":
                        case "number":
                        case "slug":
                            return (
                                <div key={campo.chiave} className="col-span-1">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <input
                                        type={campo.tipo === "slug" ? "text" : campo.tipo}
                                        value={val || ""}
                                        onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style"
                                    />
                                </div>
                            );
                        case "textarea":
                            return (
                                <div key={campo.chiave} className="col-span-2">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <textarea
                                        value={val || ""}
                                        onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style min-h-[80px]"
                                    />
                                </div>
                            );
                        case "date":
                            return (
                                <div key={campo.chiave} className="col-span-1">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <input
                                        type="date"
                                        value={val || ""}
                                        onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style pr-10"
                                    />
                                </div>
                            );
                        case "time":
                            return (
                                <div key={campo.chiave} className="col-span-1">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <input
                                        type="time"
                                        step={60}
                                        value={val || ""}
                                        onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style"
                                    />
                                </div>
                            );
                        case "select": {
                            const opts = options[campo.chiave] || [];
                            const c = campo as CampoSelect;
                            return (
                                <div key={campo.chiave} className="col-span-1">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <select
                                        value={val ?? ""}
                                        onChange={(e) => updateForm(campo.chiave, e.target.value || null)}
                                        className="w-full input-style"
                                    >
                                        <option value="">—</option>
                                        {opts.map((o) => (
                                            <option key={o[c.sorgente.value]} value={o[c.sorgente.value]}>
                                                {o[c.sorgente.label]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        }
                        case "color-ita-eng":
                            return (
                                <div key={campo.chiave} className="col-span-1">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <input
                                        type="text"
                                        value={val ? traduciColoreInverso(val) : ""}
                                        onChange={(e) => updateForm(campo.chiave, traduciColore(e.target.value))}
                                        className="w-full input-style"
                                        placeholder="es. rosso"
                                    />
                                </div>
                            );
                        case "avatar":
                            return (
                                <div key={campo.chiave} className="col-span-2">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    {val ? <img src={val} alt="avatar" className="w-12 h-12 rounded-full mb-2" /> : null}
                                    <label className="cursor-pointer px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2 w-fit">
                                        <FontAwesomeIcon icon={faUpload} />
                                        Carica nuovo
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const ext = file.name.split(".").pop();
                                                const fileName = `${crypto.randomUUID()}.${ext}`;
                                                const { error } = await supabase.storage.from(campo.bucket).upload(fileName, file);
                                                if (error) {
                                                    console.error("Upload avatar fallito:", error);
                                                    return;
                                                }
                                                const { data } = supabase.storage.from(campo.bucket).getPublicUrl(fileName);
                                                updateForm(campo.chiave, data.publicUrl);
                                            }}
                                        />
                                    </label>
                                </div>
                            );
                        case "join-many": {
                            const c = campo as CampoJoinMany;
                            const opts = options[campo.chiave] || [];
                            const selected = joinSelections[campo.chiave] || [];
                            return (
                                <div key={campo.chiave} className="col-span-2">
                                    <label className="text-sm font-semibold mb-1 block">{campo.label}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {opts.map((o) => {
                                            const valOpt = o[c.pick.value];
                                            const lbl = c.pick.label(o);
                                            const checked = selected.includes(valOpt);
                                            return (
                                                <label
                                                    key={valOpt}
                                                    className={`px-2 py-1 rounded cursor-pointer border text-sm ${checked ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleJoinValue(c, valOpt)}
                                                        className="mr-2"
                                                    />
                                                    {lbl}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }
                        default:
                            return null;
                    }
                })}
            </div>

            <button
                onClick={salva}
                disabled={saving}
                className={`w-full py-2 rounded-md mt-6 flex items-center justify-center gap-2 ${saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
            >
                {saving ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Salvataggio...
                    </>
                ) : (
                    "Salva modifiche"
                )}
            </button>

            {success && <p className="text-green-600 mt-2 text-sm">{success}</p>}
            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
        </ModalFrame>
    );
};

export default GenericEditorModal;
