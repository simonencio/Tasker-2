// src/Liste/config/index.ts
import { statiConfig } from "./statiConfig";
import { ruoliConfig } from "./ruoliConfig";
import { prioritaConfig } from "./prioritaConfig";
import { clientiConfig } from "./clientiConfig";
import { utentiConfig } from "./utentiConfig";
import { progettiConfig } from "./progettiConfig";
import { tasksConfig } from "./tasksConfig";
import { timeEntriesConfig } from "./timeEntriesConfig";

export const resourceConfigs = {
    stati: statiConfig,
    ruoli: ruoliConfig,
    priorita: prioritaConfig,
    clienti: clientiConfig,
    utenti: utentiConfig,
    progetti: progettiConfig,
    tasks: tasksConfig,
    time_entries: timeEntriesConfig,
};

export type ResourceKey = keyof typeof resourceConfigs;
