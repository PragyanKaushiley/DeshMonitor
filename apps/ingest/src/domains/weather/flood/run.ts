import { getLocationsByTag } from "@desh-monitor/db";
import { runScript } from "../../../core/logging";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createFloodAdapter } from "./adapter";

runScript({ task: "weather flood ingestion", domain: "weather" }, async ({ db, logger }) => {
  const locations = await getLocationsByTag(db, "river_basin");

  await runWeatherIngestion({
    db,
    logger,
    dataType: "flood",
    sources: toWeatherSources(locations, "flood"),
    makeAdapter: createFloodAdapter,
  });
});
