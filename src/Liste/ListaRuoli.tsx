import { useEffect, useState } from "react";
import { supabase } from "../supporto/supabaseClient";
import { faUserShield } from "@fortawesome/free-solid-svg-icons";
import MiniRuoloEditorModal from "../Modifica/MiniRuoloEditorModal";
import ListaGenerica from "./ListaGenerica";

type Ruolo = {
    id: number;
    nome: string;
};

export default function ListaRuoli() {
    const [ruoli, setRuoli] = useState<Ruolo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const caricaRuoli = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("ruoli")
                .select("id, nome, deleted_at")
                .order("id", { ascending: true });

            if (!error && data) {
                setRuoli(data.filter((r: any) => !r.deleted_at));
            }
            setLoading(false);
        };
        caricaRuoli();
    }, []);

    return (
        <ListaGenerica<Ruolo>
            titolo="Lista Ruoli"
            icona={faUserShield}
            coloreIcona="text-blue-500"
            tipo="ruoli"
            dati={ruoli}
            loading={loading}
            colonne={[
                { chiave: "nome", label: "Nome", className: "flex-1 font-medium truncate" },
            ]}
            renderDettaglio={(r) => <p>ID: {r.id}</p>}
            renderModaleModifica={(id, onClose) => (
                <MiniRuoloEditorModal ruoloId={id} onClose={onClose} />
            )}
        />
    );
}
