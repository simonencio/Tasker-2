// src/Pagine/Cestino.tsx
import ListaDinamica from "../Liste/ListaDinamica";
import type { ResourceKey } from "../Liste/resourceConfigs";

const sezioni: ResourceKey[] = [
    "tasks", "progetti", "utenti", "clienti", "stati", "priorita", "ruoli", "time_entries"
];

export default function Cestino() {
    return (
        <div className="space-y-10">
            {sezioni.map(key => (
                <ListaDinamica key={key} tipo={key} modalitaCestino />
            ))}
        </div>
    );
}
