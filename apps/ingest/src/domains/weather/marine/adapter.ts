import { z } from "zod";
import { insertMarineForecast, startFetch, type Database, type MarineForecastInput } from "@desh-monitor/db";
import type { SourceAdapter } from "../../../core/types";
import { fetchOpenMeteoJson, marineUrl } from "../openMeteo";
import type { WeatherSource } from "../types";

interface MarineRawItem {
  time: string;
  wave_height?: number | undefined;
  wave_direction?: number | undefined;
  wave_period?: number | undefined;
  dailyWaveHeightMax: { date: string; value: number | null }[];
  raw: Record<string, unknown>;
}

const schema = z.object({
  time: z.string().min(1),
});

export function createMarineAdapter(db: Database): SourceAdapter<WeatherSource, MarineRawItem, MarineForecastInput> {
  return {
    async fetch(source) {
      const fetchId = await startFetch(db, {
        locationId: source.location.id,
        dataType: "marine",
        startedAt: new Date(),
      });
      source.fetchId = fetchId;

      const url = marineUrl(source.location.latitude, source.location.longitude);
      const { status, json } = await fetchOpenMeteoJson(url);

      const current = json.current as Record<string, unknown> | undefined;
      const daily = json.daily as Record<string, unknown> | undefined;
      const dates = (daily?.time as string[] | undefined) ?? [];
      const maxHeights = (daily?.wave_height_max as (number | null)[] | undefined) ?? [];

      const rawItems: MarineRawItem[] = [];
      if (current && typeof current.time === "string") {
        rawItems.push({
          time: current.time,
          wave_height: current.wave_height as number | undefined,
          wave_direction: current.wave_direction as number | undefined,
          wave_period: current.wave_period as number | undefined,
          dailyWaveHeightMax: dates.map((date, i) => ({ date, value: maxHeights[i] ?? null })),
          raw: { current, daily },
        });
      }

      return { httpStatus: status, rawItems };
    },

    validate(item) {
      return schema.safeParse(item).success;
    },

    normalize(item, source) {
      return {
        locationId: source.location.id,
        fetchId: source.fetchId!,
        observedAt: new Date(item.time),
        waveHeightM: item.wave_height ?? null,
        waveDirectionDeg: item.wave_direction ?? null,
        wavePeriodS: item.wave_period ?? null,
        dailyWaveHeightMax: item.dailyWaveHeightMax,
        rawPayload: item.raw,
      };
    },

    async persist(_source, normalizedItems) {
      for (const row of normalizedItems) {
        await insertMarineForecast(db, row);
      }
      return { insertedCount: normalizedItems.length, duplicateCount: 0 };
    },
  };
}
