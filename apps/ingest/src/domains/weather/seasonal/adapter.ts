import { z } from "zod";
import { insertSeasonalForecast, startFetch, type Database, type SeasonalForecastInput } from "@desh-monitor/db";
import type { SourceAdapter } from "../../../core/types";
import { fetchOpenMeteoJson, seasonalUrl } from "../openMeteo";
import type { WeatherSource } from "../types";

interface SeasonalRawItem {
  dates: string[];
  daily: Record<string, unknown>;
}

const schema = z.object({
  dates: z.array(z.string()).min(1),
});

export function createSeasonalAdapter(db: Database): SourceAdapter<WeatherSource, SeasonalRawItem, SeasonalForecastInput> {
  return {
    async fetch(source) {
      const fetchId = await startFetch(db, {
        locationId: source.location.id,
        dataType: "seasonal",
        startedAt: new Date(),
      });
      source.fetchId = fetchId;

      const url = seasonalUrl(source.location.latitude, source.location.longitude);
      const { status, json } = await fetchOpenMeteoJson(url);

      const daily = (json.daily as Record<string, unknown>) ?? {};
      const dates = (daily.time as string[] | undefined) ?? [];

      const rawItems: SeasonalRawItem[] = dates.length > 0 ? [{ dates, daily }] : [];

      return { httpStatus: status, rawItems };
    },

    validate(item) {
      return schema.safeParse(item).success;
    },

    normalize(item, source) {
      return {
        locationId: source.location.id,
        fetchId: source.fetchId!,
        forecastDays: item.dates.length,
        rawPayload: item.daily,
      };
    },

    async persist(_source, normalizedItems) {
      for (const row of normalizedItems) {
        await insertSeasonalForecast(db, row);
      }
      return { insertedCount: normalizedItems.length, duplicateCount: 0 };
    },
  };
}
