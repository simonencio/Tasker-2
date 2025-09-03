// src/Liste/ToggleFiltri.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faLink } from "@fortawesome/free-solid-svg-icons";
import type { ResourceKey } from "../Liste/resourceConfigs";

type ToggleFiltriProps = {
    tipo: ResourceKey;
    config: {
        mostraToggleMie: boolean;
        mostraToggleCompletate: boolean;
        mostraToggleNonCompletate: boolean;
        mostraToggleCompletati: boolean;
        mostraToggleNonCompletati: boolean;
    };
    valori: {
        soloMieTasks: boolean;
        soloMieProgetti: boolean;
        soloCompletate: boolean;
        soloCompletati: boolean;
        soloNonCompletate: boolean;
        soloNonCompletati: boolean;
    };
    setters: {
        setSoloMieTasks: React.Dispatch<React.SetStateAction<boolean>>;
        setSoloMieProgetti: React.Dispatch<React.SetStateAction<boolean>>;
        setSoloCompletate: React.Dispatch<React.SetStateAction<boolean>>;
        setSoloCompletati: React.Dispatch<React.SetStateAction<boolean>>;
        setSoloNonCompletate: React.Dispatch<React.SetStateAction<boolean>>;
        setSoloNonCompletati: React.Dispatch<React.SetStateAction<boolean>>;
    };
};

export default function ToggleFiltri({
    tipo,
    config,
    valori,
    setters,
}: ToggleFiltriProps) {
    return (
        <>
            {config.mostraToggleMie && (
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faLink} className="w-5 h-5 icon-color" />
                    <span className="text-theme font-medium">{tipo === "progetti" ? "Miei" : "Mie"}</span>
                    <div
                        onClick={() =>
                            tipo === "tasks"
                                ? setters.setSoloMieTasks((v) => !v)
                                : tipo === "progetti"
                                    ? setters.setSoloMieProgetti((v) => !v)
                                    : null
                        }
                        className={`toggle-theme ${(tipo === "tasks" ? valori.soloMieTasks : tipo === "progetti" ? valori.soloMieProgetti : false)
                            ? "active"
                            : ""
                            }`}
                    >
                        <div
                            className={`toggle-thumb ${(tipo === "tasks" ? valori.soloMieTasks : tipo === "progetti" ? valori.soloMieProgetti : false)
                                ? "translate"
                                : ""
                                }`}
                        />
                    </div>
                </div>
            )}

            {config.mostraToggleCompletate && (
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 icon-success" />
                    <span className="text-theme font-medium">Completate</span>
                    <div
                        onClick={() => setters.setSoloCompletate((v) => !v)}
                        className={`toggle-theme ${valori.soloCompletate ? "active" : ""} cursor-pointer`}
                    >
                        <div className={`toggle-thumb ${valori.soloCompletate ? "translate" : ""}`} />
                    </div>

                </div>
            )}

            {config.mostraToggleNonCompletate && (
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 icon-danger" />
                    <span className="text-theme font-medium">Non completate</span>
                    <div
                        onClick={() => setters.setSoloNonCompletate((v) => !v)}
                        className={`toggle-theme ${valori.soloNonCompletate ? "active" : ""}`}
                    >
                        <div className={`toggle-thumb ${valori.soloNonCompletate ? "translate" : ""}`} />
                    </div>
                </div>
            )}

            {config.mostraToggleCompletati && (
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 icon-success" />
                    <span className="text-theme font-medium">Completati</span>
                    <div
                        onClick={() => setters.setSoloCompletati((v) => !v)}
                        className={`toggle-theme ${valori.soloCompletati ? "active" : ""}`}
                    >
                        <div className={`toggle-thumb ${valori.soloCompletati ? "translate" : ""}`} />
                    </div>
                </div>
            )}

            {config.mostraToggleNonCompletati && (
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 icon-danger" />
                    <span className="text-theme font-medium">Non completati</span>
                    <div
                        onClick={() => setters.setSoloNonCompletati((v) => !v)}
                        className={`toggle-theme ${valori.soloNonCompletati ? "active" : ""}`}
                    >
                        <div className={`toggle-thumb ${valori.soloNonCompletati ? "translate" : ""}`} />
                    </div>
                </div>
            )}
        </>
    );
}
