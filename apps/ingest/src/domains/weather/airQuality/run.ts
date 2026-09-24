import { getAllActiveLocations } from "@desh-monitor/db";
import { runScript } from "../../../core/logging";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createAirQualityAdapter } from "./adapter";

runScript({ task: "weather air quality ingestion", domain: "weather" }, async ({ db, logger }) => {
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    logger,
    dataType: "air_quality",
    sources: toWeatherSources(locations, "air_quality"),
    makeAdapter: createAirQualityAdapter,
  });
});
