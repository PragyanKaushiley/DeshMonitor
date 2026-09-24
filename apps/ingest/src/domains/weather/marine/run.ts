import { getLocationsByTag } from "@desh-monitor/db";
import { runScript } from "../../../core/logging";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createMarineAdapter } from "./adapter";

runScript({ task: "weather marine ingestion", domain: "weather" }, async ({ db, logger }) => {
  const locations = await getLocationsByTag(db, "coastal");

  await runWeatherIngestion({
    db,
    logger,
    dataType: "marine",
    sources: toWeatherSources(locations, "marine"),
    makeAdapter: createMarineAdapter,
  });
});
