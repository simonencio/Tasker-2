// src/components/ConfermaSostituzioneModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";

type Props = {
    tipo: "stati" | "priorita" | "ruoli";
    excludeId: number;
    onConfirm: (newId: number) => void;
    onCancel: () => void;
};

export default function ConfermaSostituzioneModal({
    tipo,
    excludeId,
    onConfirm,
    onCancel,
}: Props) {
    const [options, setOptions] = useState<{ id: number; nome: string }[]>([]);
    const [selected, setSelected] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from(tipo)
                .select("id, nome")
                .is("deleted_at", null)
                .neq("id", excludeId)
                .order("id");
            if (data) setOptions(data);
        };
        load();
    }, [tipo, excludeId]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="modal-container rounded-xl shadow-lg w-11/12 max-w-md p-6 animate-scale-fade">
                <h2 className="form-heading mb-4 text-center">
                    Seleziona un altro {tipo.slice(0, -1)} da sostituire
                </h2>

                <select
                    className="input-style w-full mb-4"
                    value={selected ?? ""}
                    onChange={(e) => setSelected(Number(e.target.value))}
                >
                    <option value="">-- Seleziona --</option>
                    {options.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.nome}
                        </option>
                    ))}
                </select>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400 transition-colors dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
                    >
                        Annulla
                    </button>
                    <button
                        disabled={!selected}
                        onClick={() => selected && onConfirm(selected)}
                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        Conferma
                    </button>
                </div>
            </div>
        </div>
    );
}
