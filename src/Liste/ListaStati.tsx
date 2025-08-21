import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { faFlag } from "@fortawesome/free-solid-svg-icons";
import MiniStatoEditorModal from "../Modifica/MiniStatoEditorModal";
import ListaGenerica from "./ListaGenerica";

type Stato = {
    id: number;
    nome: string;
    colore?: string | null;
};

export default function ListaStati() {
    const [stati, setStati] = useState<Stato[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const caricaStati = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("stati")
                .select("id, nome, colore, deleted_at")
                .order("id", { ascending: true });

            if (!error && data) {
                setStati(data.filter((s: any) => !s.deleted_at));
            }
            setLoading(false);
        };
        caricaStati();
    }, []);

    return (
        <ListaGenerica<Stato>
            titolo="Lista Stati"
            icona={faFlag}
            coloreIcona="text-green-500"
            tipo="stati"
            dati={stati}
            loading={loading}
            colonne={[
                { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
                {
                    chiave: "colore",
                    label: "Colore",
                    className: "w-20 text-center",
                    render: (s) =>
                        s.colore ? (
                            <span
                                className="inline-block w-5 h-5 rounded-full border"
                                style={{ backgroundColor: s.colore }}
                            ></span>
                        ) : (
                            "-"
                        ),
                },
            ]}
            renderDettaglio={(s) => (
                <p>
                    ID: {s.id}
                    {s.colore && <span className="ml-2">({s.colore})</span>}
                </p>
            )}
            renderModaleModifica={(id, onClose) => (
                <MiniStatoEditorModal statoId={id} onClose={onClose} />
            )}
        />
    );
}
