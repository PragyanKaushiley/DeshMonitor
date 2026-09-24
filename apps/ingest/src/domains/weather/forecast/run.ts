import { getAllActiveLocations } from "@desh-monitor/db";
import { runScript } from "../../../core/logging";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createForecastAdapter } from "./adapter";

runScript({ task: "weather forecast ingestion", domain: "weather" }, async ({ db, logger }) => {
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    logger,
    dataType: "forecast",
    sources: toWeatherSources(locations, "forecast"),
    makeAdapter: createForecastAdapter,
  });
});
