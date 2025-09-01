// src/Pagine/Cestino.tsx
import ListaDinamica from "../Liste/ListaDinamica";
import type { ResourceKey } from "../Liste/resourceConfigs";
import { resourceConfigs } from "../Liste/resourceConfigs";
import { cestinoActions } from "../supporto/cestinoActions";
import { notificaEvento } from "../supporto/notificheService";
import { supabase } from "../supporto/supabaseClient";

const sezioni: ResourceKey[] = [
    "tasks",
    "progetti",
    "utenti",
    "clienti",
    "stati",
    "priorita",
    "ruoli",
    "time_entries",
];

function ListaConNotifiche({ tipo }: { tipo: ResourceKey }) {
    const baseConfig = resourceConfigs[tipo];
    const cestino = baseConfig.cestino;

    if (!cestino?.actions?.hardDelete) {
        return <ListaDinamica tipo={tipo} modalitaCestino />;
    }

    const hardDeleteWithNotify = async (id: string | number) => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        const creatoreId = user?.id ?? undefined;

        let dettagli: any = {};

        switch (tipo) {
            case "tasks": {
                const { data: task } = await supabase
                    .from("tasks")
                    .select("id, nome")
                    .eq("id", id)
                    .maybeSingle();

                let progettoNome: string | null = null;
                let progettoId: string | null = null;
                if (task) {
                    const { data: link } = await supabase
                        .from("progetti_task")
                        .select("progetti_id")
                        .eq("task_id", task.id)
                        .maybeSingle();

                    if (link) {
                        progettoId = link.progetti_id;
                        const { data: progetto } = await supabase
                            .from("progetti")
                            .select("nome")
                            .eq("id", progettoId)
                            .maybeSingle();
                        progettoNome = progetto?.nome ?? null;
                    }
                }

                dettagli = {
                    task_id: String(id),
                    taskNome: task?.nome ?? "—",
                    progetto_id: progettoId,
                    progettoNome,
                };

                await notificaEvento("HARD_DELETE_TASK", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.tasks.hardDelete(id);
                break;
            }

            case "progetti": {
                const { data: progetto } = await supabase
                    .from("progetti")
                    .select("id, nome, cliente_id")
                    .eq("id", id)
                    .maybeSingle();

                let clienteNome: string | null = null;
                if (progetto?.cliente_id) {
                    const { data: cliente } = await supabase
                        .from("clienti")
                        .select("nome")
                        .eq("id", progetto.cliente_id)
                        .maybeSingle();
                    clienteNome = cliente?.nome ?? null;
                }

                dettagli = {
                    progetto_id: String(id),
                    progettoNome: progetto?.nome ?? "—",
                    cliente_id: progetto?.cliente_id ?? null,
                    clienteNome,
                };

                await notificaEvento("HARD_DELETE_PROGETTO", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.progetti.hardDelete(id);
                break;
            }

            case "utenti": {
                const { data: utente } = await supabase
                    .from("utenti")
                    .select("id, nome, cognome, email")
                    .eq("id", id)
                    .maybeSingle();

                dettagli = {
                    utente_id: String(id),
                    utenteNome: `${utente?.nome ?? ""} ${utente?.cognome ?? ""}`.trim(),
                    email: utente?.email,
                };

                await notificaEvento("HARD_DELETE_UTENTE", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.utenti.hardDelete(id);
                break;
            }

            case "clienti": {
                const { data: cliente } = await supabase
                    .from("clienti")
                    .select("id, nome, email")
                    .eq("id", id)
                    .maybeSingle();

                dettagli = {
                    cliente_id: String(id),
                    clienteNome: cliente?.nome ?? "—",
                    email: cliente?.email,
                };

                await notificaEvento("HARD_DELETE_CLIENTE", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.clienti.hardDelete(id);
                break;
            }

            case "stati": {
                const { data: stato } = await supabase
                    .from("stati")
                    .select("id, nome")
                    .eq("id", id)
                    .maybeSingle();

                dettagli = { stato_id: String(id), statoNome: stato?.nome ?? "—" };

                await notificaEvento("HARD_DELETE_STATO", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.stati.hardDelete(id);
                break;
            }

            case "priorita": {
                const { data: priorita } = await supabase
                    .from("priorita")
                    .select("id, nome")
                    .eq("id", id)
                    .maybeSingle();

                dettagli = { priorita_id: String(id), prioritaNome: priorita?.nome ?? "—" };

                await notificaEvento("HARD_DELETE_PRIORITA", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.priorita.hardDelete(id);
                break;
            }

            case "ruoli": {
                const { data: ruolo } = await supabase
                    .from("ruoli")
                    .select("id, nome")
                    .eq("id", id)
                    .maybeSingle();

                dettagli = { ruolo_id: String(id), ruoloNome: ruolo?.nome ?? "—" };

                await notificaEvento("HARD_DELETE_RUOLO", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.ruoli.hardDelete(id);
                break;
            }

            case "time_entries": {
                const { data: entry } = await supabase
                    .from("time_entries")
                    .select("id, nome, task_id, progetto_id")
                    .eq("id", id)
                    .maybeSingle();

                let taskNome: string | null = null;
                if (entry?.task_id) {
                    const { data: task } = await supabase
                        .from("tasks")
                        .select("nome")
                        .eq("id", entry.task_id)
                        .maybeSingle();
                    taskNome = task?.nome ?? null;
                }

                dettagli = {
                    time_entry_id: String(id),
                    nome: entry?.nome ?? "—",
                    taskNome,
                };

                await notificaEvento("HARD_DELETE_TIME_ENTRY", [creatoreId!], creatoreId, dettagli);
                await cestinoActions.time_entries.hardDelete(id);
                break;
            }
        }
    };

    const configConNotifiche = {
        ...baseConfig,
        cestino: {
            ...cestino,
            actions: {
                ...cestino.actions,
                hardDelete: hardDeleteWithNotify,
            },
        },
    } as typeof baseConfig;

    return (
        <ListaDinamica
            tipo={tipo}
            modalitaCestino
            configOverride={configConNotifiche}
        />
    );
}

export default function Cestino() {
    return (
        <div className="space-y-10">
            {sezioni.map((key) => (
                <ListaConNotifiche key={key} tipo={key} />
            ))}
        </div>
    );
}