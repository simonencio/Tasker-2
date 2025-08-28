import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faUpload } from "@fortawesome/free-solid-svg-icons";
import { creatorConfigs, type CampoSelect, type CampoJoinMany } from "./creatorConfigs";
import { traduciColore, traduciColoreInverso } from "../supporto/traduzioniColori";
import { useNavigate } from "react-router-dom";

type Props = { table: keyof typeof creatorConfigs; onClose: () => void; offsetIndex?: number };

export default function GenericCreatorModal({ table, onClose, offsetIndex = 0 }: Props) {
    const config = creatorConfigs[table];
    const navigate = useNavigate();

    const [form, setForm] = useState<Record<string, any>>({});
    const [options, setOptions] = useState<Record<string, any[]>>({});
    const [joinSelections, setJoinSelections] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const loadOptions = async () => {
            const opts: Record<string, any[]> = {};
            for (const campo of config.campi) {
                if (campo.tipo === "select") {
                    const c = campo as CampoSelect;
                    let q = supabase.from(c.sorgente.tabella).select(`${c.sorgente.value},${c.sorgente.label}`);
                    if (c.sorgente.where) for (const [col, op, val] of c.sorgente.where) q = q.filter(col, op as any, val);
                    if (c.sorgente.orderBy) q = q.order(c.sorgente.orderBy.colonna, { ascending: c.sorgente.orderBy.asc ?? true });
                    const { data } = await q;
                    opts[campo.chiave] = data || [];
                }
                if (campo.tipo === "join-many") {
                    const c = campo as CampoJoinMany;
                    let q = supabase.from(c.pick.tabellaOther).select("*");
                    if (c.pick.where) for (const [col, op, val] of c.pick.where) q = q.filter(col, op as any, val);
                    if (c.pick.orderBy) q = q.order(c.pick.orderBy.colonna, { ascending: c.pick.orderBy.asc ?? true });
                    const { data: others } = await q;
                    opts[campo.chiave] = others || [];
                }
            }
            setOptions(opts);
        };
        loadOptions();
    }, [table]);

    const updateForm = (chiave: string, valore: any) => setForm((f) => ({ ...f, [chiave]: valore }));
    const toggleJoinValue = (campo: CampoJoinMany, value: string) => {
        setJoinSelections((prev) => {
            const prevVals = prev[campo.chiave] || [];
            const next = prevVals.includes(value) ? prevVals.filter((v) => v !== value) : [...prevVals, value];
            return { ...prev, [campo.chiave]: next };
        });
    };

    const salva = async () => {
        setLoading(true);
        try {
            const { data: created, error } = await supabase.from(table).insert(form).select().single();
            if (error || !created) throw error || new Error("Errore creazione record");
            const id = created.id;

            for (const campo of config.campi) {
                if (campo.tipo === "join-many") {
                    const c = campo as CampoJoinMany;
                    const sel = joinSelections[campo.chiave] || [];
                    if (sel.length > 0) {
                        await supabase.from(c.join.tabellaJoin).insert(sel.map((v) => ({ [c.join.thisKey]: id, [c.join.otherKey]: v })));
                    }
                }
            }

            if (config.hooks?.afterCreate) {
                await config.hooks.afterCreate({ form, supabase, id, joinSelections });
            }

            if (config.redirectPath) {
                const redirect = config.redirectPath(form);
                if (redirect) navigate(redirect, { replace: true });
            }
            onClose();
        } catch (err) {
            console.error("Errore salvataggio:", err);
        } finally {
            setLoading(false);
        }
    };

    const computedLeft = offsetIndex
        ? `min(calc(${offsetIndex} * 420px + 24px), calc(100% - 24px - 400px))`
        : "24px";

    return (
        <div
            className="fixed bottom-6 rounded-xl shadow-xl p-5 bg-white dark:bg-gray-800 modal-container"
            style={
                isMobile
                    ? { left: 0, right: 0, margin: "auto", width: "calc(100% - 32px)", maxWidth: "400px", zIndex: 100 + offsetIndex }
                    : { left: computedLeft, width: "400px", zIndex: 100 + offsetIndex }
            }
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-red-600 text-2xl">
                <FontAwesomeIcon icon={faXmark} />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-center text-theme">{config.titolo}</h2>

            <div className="space-y-4 text-sm">
                {config.campi.map((campo) => {
                    const val = form[campo.chiave] ?? "";
                    switch (campo.tipo) {
                        case "text":
                        case "email":
                        case "tel":
                        case "number":
                        case "slug":
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}{campo.required ? " *" : ""}</label>
                                    <input type={campo.tipo === "slug" ? "text" : campo.tipo}
                                        value={val}
                                        onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style" required={campo.required} />
                                </div>
                            );
                        case "textarea":
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    <textarea value={val} onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style min-h-[80px]" />
                                </div>
                            );
                        case "date":
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    <input type="date" value={val} onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style" />
                                </div>
                            );
                        case "time":
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    <input type="time" step={60} value={val} onChange={(e) => updateForm(campo.chiave, e.target.value)}
                                        className="w-full input-style" />
                                </div>
                            );
                        case "select": {
                            const opts = options[campo.chiave] || [];
                            const c = campo as CampoSelect;
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    <select value={val ?? ""} onChange={(e) => updateForm(campo.chiave, e.target.value || null)}
                                        className="w-full input-style">
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
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    <input type="text" value={val ? traduciColoreInverso(val) : ""}
                                        onChange={(e) => updateForm(campo.chiave, traduciColore(e.target.value))}
                                        className="w-full input-style" placeholder="es. rosso" />
                                </div>
                            );
                        case "avatar":
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    {val ? <img src={val} alt="avatar" className="w-12 h-12 rounded-full mb-2" /> : null}
                                    <label className="cursor-pointer px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2 w-fit">
                                        <FontAwesomeIcon icon={faUpload} /> Carica nuovo
                                        <input type="file" className="hidden" accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const ext = file.name.split(".").pop();
                                                const fileName = `${crypto.randomUUID()}.${ext}`;
                                                const { error } = await supabase.storage.from(campo.bucket).upload(fileName, file);
                                                if (error) return console.error("Upload fallito:", error);
                                                const { data } = supabase.storage.from(campo.bucket).getPublicUrl(fileName);
                                                updateForm(campo.chiave, data.publicUrl);
                                            }} />
                                    </label>
                                </div>
                            );
                        case "join-many": {
                            const c = campo as CampoJoinMany;
                            const opts = options[campo.chiave] || [];
                            const selected = joinSelections[campo.chiave] || [];
                            return (
                                <div key={campo.chiave}>
                                    <label className="block mb-1 font-medium text-theme">{campo.label}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {opts.map((o) => {
                                            const valOpt = o[c.pick.value];
                                            const lbl = c.pick.label(o);
                                            const checked = selected.includes(valOpt);
                                            return (
                                                <label key={valOpt}
                                                    className={`px-2 py-1 rounded cursor-pointer border text-sm ${checked ? "selected-panel font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-600 border-transparent"}`}>
                                                    <input type="checkbox" checked={checked} onChange={() => toggleJoinValue(c, valOpt)} className="mr-2" />
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

            <button onClick={salva} disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-6 disabled:opacity-60">
                {loading ? "Salvataggio..." : "Crea"}
            </button>
        </div>
    );
}
