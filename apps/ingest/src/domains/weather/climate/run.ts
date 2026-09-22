import { createDb, getAllActiveLocations } from "@desh-monitor/db";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createClimateAdapter } from "./adapter";

// Climate model output doesn't change daily — this is meant to be run rarely
// (manually or on a monthly-or-longer schedule), never alongside the other
// weather scripts. See CLIMATE_MODEL / CLIMATE_START_DATE / CLIMATE_END_DATE
// in ../openMeteo.ts for the scoped first-pass model and date range.
async function main() {
  const db = createDb();
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    dataType: "climate",
    sources: toWeatherSources(locations, "climate"),
    makeAdapter: createClimateAdapter,
    concurrency: 3,
  });
}

main().catch((error) => {
  console.error("weather climate ingestion run crashed:", error);
  process.exitCode = 1;
});
