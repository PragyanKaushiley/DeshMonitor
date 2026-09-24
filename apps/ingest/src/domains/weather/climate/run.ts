import { getAllActiveLocations } from "@desh-monitor/db";
import { runScript } from "../../../core/logging";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createClimateAdapter } from "./adapter";

// Climate model output doesn't change daily — this is meant to be run rarely
// (manually or on a monthly-or-longer schedule), never alongside the other
// weather scripts. See CLIMATE_MODEL / CLIMATE_START_DATE / CLIMATE_END_DATE
// in ../openMeteo.ts for the scoped first-pass model and date range.
runScript({ task: "weather climate ingestion", domain: "weather" }, async ({ db, logger }) => {
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    logger,
    dataType: "climate",
    sources: toWeatherSources(locations, "climate"),
    makeAdapter: createClimateAdapter,
    concurrency: 3,
  });
});
