import { z } from "zod";
import { insertFloodDays, startFetch, type Database, type FloodDayInput } from "@desh-monitor/db";
import type { SourceAdapter } from "../../../core/types";
import { fetchOpenMeteoJson, floodUrl } from "../openMeteo";
import type { WeatherSource } from "../types";

interface FloodRawItem {
  date: string;
  river_discharge?: number | undefined;
}

const schema = z.object({
  date: z.string().min(1),
});

export function createFloodAdapter(db: Database): SourceAdapter<WeatherSource, FloodRawItem, FloodDayInput> {
  return {
    async fetch(source) {
      const fetchId = await startFetch(db, {
        locationId: source.location.id,
        dataType: "flood",
        startedAt: new Date(),
      });
      source.fetchId = fetchId;

      const url = floodUrl(source.location.latitude, source.location.longitude);
      const { status, json } = await fetchOpenMeteoJson(url);

      const daily = json.daily as Record<string, unknown> | undefined;
      const dates = (daily?.time as string[] | undefined) ?? [];
      const discharge = (daily?.river_discharge as (number | null)[] | undefined) ?? [];

      const rawItems: FloodRawItem[] = dates.map((date, i) => ({
        date,
        river_discharge: discharge[i] ?? undefined,
      }));

      return { httpStatus: status, rawItems };
    },

    validate(item) {
      return schema.safeParse(item).success;
    },

    normalize(item, source) {
      return {
        locationId: source.location.id,
        fetchId: source.fetchId!,
        targetDate: item.date,
        riverDischargeM3s: item.river_discharge ?? null,
      };
    },

    async persist(_source, normalizedItems) {
      const inserted = await insertFloodDays(db, normalizedItems);
      return { insertedCount: inserted, duplicateCount: 0 };
    },
  };
}
