import { z } from "zod";
import {
  startFetch,
  upsertClimateProjectionDays,
  type ClimateProjectionDayInput,
  type Database,
} from "@desh-monitor/db";
import type { SourceAdapter } from "../../../core/types";
import { climateUrl, CLIMATE_MODEL, fetchOpenMeteoJson } from "../openMeteo";
import type { WeatherSource } from "../types";

interface ClimateRawItem {
  date: string;
  temperature_2m_max?: number | undefined;
  temperature_2m_min?: number | undefined;
  precipitation_sum?: number | undefined;
}

const schema = z.object({
  date: z.string().min(1),
});

// The climate API has a much stricter per-minute request limit than the other
// 5 Open-Meteo products (confirmed live: a burst run returned HTTP 200 with a
// JSON "Minutely API request limit exceeded" body — not a 5xx, so the shared
// fetchWithTimeout retry logic doesn't catch it). This module-level gate
// paces climate calls across all concurrent workers regardless of the
// pipeline's concurrency setting; a single bounded retry covers the rare case
// the pacing estimate is still too tight, never an unbounded retry loop.
const MIN_INTERVAL_MS = 13_000;
let nextAvailableAt = 0;

async function paceClimateRequest(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, nextAvailableAt - now);
  nextAvailableAt = Math.max(now, nextAvailableAt) + MIN_INTERVAL_MS;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

async function fetchClimateJson(url: string) {
  await paceClimateRequest();
  try {
    return await fetchOpenMeteoJson(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("request limit exceeded")) throw error;
    await paceClimateRequest();
    return fetchOpenMeteoJson(url);
  }
}

export function createClimateAdapter(db: Database): SourceAdapter<WeatherSource, ClimateRawItem, ClimateProjectionDayInput> {
  return {
    async fetch(source) {
      const fetchId = await startFetch(db, {
        locationId: source.location.id,
        dataType: "climate",
        startedAt: new Date(),
      });
      source.fetchId = fetchId;

      const url = climateUrl(source.location.latitude, source.location.longitude);
      const { status, json } = await fetchClimateJson(url);

      const daily = json.daily as Record<string, unknown> | undefined;
      const dates = (daily?.time as string[] | undefined) ?? [];
      const tMax = (daily?.temperature_2m_max as (number | null)[] | undefined) ?? [];
      const tMin = (daily?.temperature_2m_min as (number | null)[] | undefined) ?? [];
      const precip = (daily?.precipitation_sum as (number | null)[] | undefined) ?? [];

      const rawItems: ClimateRawItem[] = dates.map((date, i) => ({
        date,
        temperature_2m_max: tMax[i] ?? undefined,
        temperature_2m_min: tMin[i] ?? undefined,
        precipitation_sum: precip[i] ?? undefined,
      }));

      return { httpStatus: status, rawItems };
    },

    validate(item) {
      return schema.safeParse(item).success;
    },

    normalize(item, source) {
      return {
        locationId: source.location.id,
        model: CLIMATE_MODEL,
        date: item.date,
        temperatureMaxC: item.temperature_2m_max ?? null,
        temperatureMinC: item.temperature_2m_min ?? null,
        precipitationSumMm: item.precipitation_sum ?? null,
      };
    },

    async persist(_source, normalizedItems) {
      const { insertedCount, updatedCount } = await upsertClimateProjectionDays(db, normalizedItems);
      return { insertedCount, duplicateCount: updatedCount };
    },
  };
}
