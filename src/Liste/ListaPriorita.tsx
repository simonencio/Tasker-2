import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import MiniPrioritaEditorModal from "../Modifica/MiniPrioritaEditorModal";
import ListaGenerica from "./ListaGenerica";

type Priorita = {
    id: number;
    nome: string;
    colore?: string | null;
};

export default function ListaPriorita() {
    const [priorita, setPriorita] = useState<Priorita[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const caricaPriorita = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("priorita")
                .select("id, nome, colore, deleted_at") // 👈 includo colore
                .order("id", { ascending: true });

            if (!error && data) {
                setPriorita(data.filter((p: any) => !p.deleted_at));
            }
            setLoading(false);
        };
        caricaPriorita();
    }, []);

    return (
        <ListaGenerica<Priorita>
            titolo="Lista Priorità"
            icona={faExclamationTriangle}
            coloreIcona="text-red-500"
            tipo="priorita"
            dati={priorita}
            loading={loading}
            colonne={[
                { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
                {
                    chiave: "colore",
                    label: "Colore",
                    className: "w-20 text-center",
                    render: (p) =>
                        p.colore ? (
                            <span
                                className="inline-block w-5 h-5 rounded-full border"
                                style={{ backgroundColor: p.colore }}
                            ></span>
                        ) : (
                            "-"
                        ),
                },
            ]}
            renderDettaglio={(p) => (
                <p>
                    ID: {p.id}
                    {p.colore && <span className="ml-2">({p.colore})</span>}
                </p>
            )}
            renderModaleModifica={(id, onClose) => (
                <MiniPrioritaEditorModal prioritaId={id} onClose={onClose} />
            )}
        />
    );
}
