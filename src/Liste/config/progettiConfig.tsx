import { faProjectDiagram, faLink, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { supabase } from "../../supporto/supabaseClient";
import { fetchProgetti, fetchProgettiDeleted, cestinoActions } from "../../supporto/fetchData";
import { softDeleteProgetto } from "../../supporto/softDeleteRecursive";
import type { ResourceConfig, Progetto } from "../typesLista";
import { fmt } from "./common";
import { azioni, dispatchResourceEvent } from "./azioniConfig";

export const progettiConfig: ResourceConfig<Progetto> = {
    key: "progetti",
    titolo: "Lista Progetti",
    icona: faProjectDiagram,
    coloreIcona: "text-blue-500",
    useHeaderFilters: true,

    fetch: async ({ filtro, utenteId }) => {
        const all = await fetchProgetti({ ...filtro, soloMie: !!filtro.soloMieProgetti }, utenteId ?? undefined);
        let items = all;
        if (filtro?.soloMieProgetti && utenteId) {
            items = (all || []).filter((p: any) => (p.membri || []).some((m: any) => m.id === utenteId));
        }
        return filtro.soloCompletati
            ? items.filter((p: any) => p.completato === true || p.fine_progetto != null)
            : items;
    },

    cestino: {
        fetch: async ({ filtro }) => await fetchProgettiDeleted(filtro),
        actions: cestinoActions.progetti,
    },

    colonne: [
        {
            chiave: "nome",
            label: "Nome",
            render: (proj, { utenteId }) => (
                <div className="flex items-center gap-2">
                    {proj.membri?.some((m) => m.id === utenteId) && (
                        <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-blue-600" title="Membro" />
                    )}
                    {(proj.completato || proj.fine_progetto) && (
                        <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" title="Completato" />
                    )}
                    <span>{proj.nome}</span>
                </div>
            ),
        },
        { chiave: "consegna", label: "Consegna", className: "w-40 hidden lg:block", render: (p) => fmt.date(p.consegna) },
        { chiave: "stato", label: "Stato", className: "w-32 hidden lg:block", render: (p) => p.stato?.nome ?? "—" },
        { chiave: "priorita", label: "Priorità", className: "w-32 hidden lg:block", render: (p) => p.priorita?.nome ?? "—" },
    ],

    azioni: (proj, { navigate, patchItem }) => {
        const completaProgetto = async () => {
            if (proj.fine_progetto) return;
            const { error } = await supabase.rpc("complete_project", { p_id: proj.id });
            if (error) {
                alert("Errore nel completare il progetto: " + error.message);
                return;
            }
            const nowIso = new Date().toISOString();
            patchItem?.(proj.id, { fine_progetto: nowIso });
            dispatchResourceEvent("update", "progetti", { id: proj.id, patch: { fine_progetto: nowIso } });
        };

        const eliminaProgetto = async () => {
            if (!window.confirm("Eliminare questo progetto?")) return;
            try {
                await softDeleteProgetto(proj.id);
                dispatchResourceEvent("remove", "progetti", { id: proj.id });
            } catch (err: any) {
                alert("Errore eliminazione: " + err.message);
            }
        };

        return (
            <>
                {azioni.edit(() => (window as any).__openMiniEdit("progetti", proj.id))}
                {azioni.complete(completaProgetto, proj.fine_progetto ? "Già completato" : "Segna come completato")}
                {azioni.navigateTo(() => navigate(`/progetti/${proj.slug ?? proj.id}`), "Vai al dettaglio")}
                {azioni.trashSoft(eliminaProgetto)}
            </>
        );
    },

    renderDettaglio: (proj) => (
        <div className="space-y-1">
            {proj.cliente?.nome && <p>👤 Cliente: {proj.cliente.nome}</p>}
            {proj.membri?.length > 0 && (
                <p>👥 Membri: {proj.membri.map((m) => `${m.nome} ${m.cognome ?? ""}`).join(", ")}</p>
            )}
            {proj.tempo_stimato && <p>⏱️ Tempo stimato: {proj.tempo_stimato}</p>}
            {proj.note && <p>🗒️ Note: {proj.note}</p>}
        </div>
    ),
};
