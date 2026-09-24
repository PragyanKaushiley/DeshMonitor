import { getAllActiveLocations } from "@desh-monitor/db";
import { runScript } from "../../../core/logging";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createSeasonalAdapter } from "./adapter";

runScript({ task: "weather seasonal ingestion", domain: "weather" }, async ({ db, logger }) => {
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    logger,
    dataType: "seasonal",
    sources: toWeatherSources(locations, "seasonal"),
    makeAdapter: createSeasonalAdapter,
  });
});
