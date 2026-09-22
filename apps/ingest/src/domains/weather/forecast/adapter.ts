import { z } from "zod";
import {
  insertForecastDays,
  insertObservation,
  startFetch,
  updateLocationElevation,
  type Database,
  type ForecastDayInput,
  type ObservationInput,
} from "@desh-monitor/db";
import type { SourceAdapter } from "../../../core/types";
import { fetchOpenMeteoJson, forecastUrl } from "../openMeteo";
import type { WeatherSource } from "../types";

interface CurrentRawItem {
  kind: "current";
  time: string;
  temperature_2m?: number | undefined;
  relative_humidity_2m?: number | undefined;
  apparent_temperature?: number | undefined;
  precipitation?: number | undefined;
  weather_code?: number | undefined;
  wind_speed_10m?: number | undefined;
  wind_direction_10m?: number | undefined;
  surface_pressure?: number | undefined;
}

interface DailyRawItem {
  kind: "daily";
  date: string;
  weather_code?: number | undefined;
  temperature_2m_max?: number | undefined;
  temperature_2m_min?: number | undefined;
  precipitation_sum?: number | undefined;
  precipitation_probability_max?: number | undefined;
  wind_speed_10m_max?: number | undefined;
}

type ForecastRawItem = CurrentRawItem | DailyRawItem;
type ForecastNormalized =
  | { kind: "current"; row: ObservationInput }
  | { kind: "daily"; row: ForecastDayInput };

const currentSchema = z.object({
  kind: z.literal("current"),
  time: z.string().min(1),
  temperature_2m: z.number().finite().optional(),
});

const dailySchema = z.object({
  kind: z.literal("daily"),
  date: z.string().min(1),
});

export function createForecastAdapter(db: Database): SourceAdapter<WeatherSource, ForecastRawItem, ForecastNormalized> {
  return {
    async fetch(source) {
      const fetchId = await startFetch(db, {
        locationId: source.location.id,
        dataType: "forecast",
        startedAt: new Date(),
      });
      source.fetchId = fetchId;

      const url = forecastUrl(source.location.latitude, source.location.longitude);
      const { status, json } = await fetchOpenMeteoJson(url);

      if (typeof json.elevation === "number") {
        await updateLocationElevation(db, source.location.id, json.elevation);
      }

      const rawItems: ForecastRawItem[] = [];
      const current = json.current as Record<string, unknown> | undefined;
      if (current && typeof current.time === "string") {
        rawItems.push({
          kind: "current",
          time: current.time,
          temperature_2m: current.temperature_2m as number | undefined,
          relative_humidity_2m: current.relative_humidity_2m as number | undefined,
          apparent_temperature: current.apparent_temperature as number | undefined,
          precipitation: current.precipitation as number | undefined,
          weather_code: current.weather_code as number | undefined,
          wind_speed_10m: current.wind_speed_10m as number | undefined,
          wind_direction_10m: current.wind_direction_10m as number | undefined,
          surface_pressure: current.surface_pressure as number | undefined,
        });
      }

      const daily = json.daily as Record<string, unknown[]> | undefined;
      const dates = (daily?.time as string[] | undefined) ?? [];
      for (let i = 0; i < dates.length; i++) {
        rawItems.push({
          kind: "daily",
          date: dates[i] as string,
          weather_code: daily?.weather_code?.[i] as number | undefined,
          temperature_2m_max: daily?.temperature_2m_max?.[i] as number | undefined,
          temperature_2m_min: daily?.temperature_2m_min?.[i] as number | undefined,
          precipitation_sum: daily?.precipitation_sum?.[i] as number | undefined,
          precipitation_probability_max: daily?.precipitation_probability_max?.[i] as number | undefined,
          wind_speed_10m_max: daily?.wind_speed_10m_max?.[i] as number | undefined,
        });
      }

      return { httpStatus: status, rawItems };
    },

    validate(item) {
      if (item.kind === "current") return currentSchema.safeParse(item).success;
      return dailySchema.safeParse(item).success;
    },

    normalize(item, source) {
      const fetchId = source.fetchId!;
      if (item.kind === "current") {
        return {
          kind: "current",
          row: {
            locationId: source.location.id,
            fetchId,
            observedAt: new Date(item.time),
            temperatureC: item.temperature_2m ?? null,
            relativeHumidityPct: item.relative_humidity_2m ?? null,
            apparentTemperatureC: item.apparent_temperature ?? null,
            precipitationMm: item.precipitation ?? null,
            weatherCode: item.weather_code ?? null,
            windSpeedKmh: item.wind_speed_10m ?? null,
            windDirectionDeg: item.wind_direction_10m ?? null,
            surfacePressureHpa: item.surface_pressure ?? null,
            rawPayload: item,
          },
        };
      }

      return {
        kind: "daily",
        row: {
          locationId: source.location.id,
          fetchId,
          targetDate: item.date,
          weatherCode: item.weather_code ?? null,
          temperatureMaxC: item.temperature_2m_max ?? null,
          temperatureMinC: item.temperature_2m_min ?? null,
          precipitationSumMm: item.precipitation_sum ?? null,
          precipitationProbabilityPct: item.precipitation_probability_max ?? null,
          windSpeedMaxKmh: item.wind_speed_10m_max ?? null,
          rawPayload: item,
        },
      };
    },

    async persist(_source, normalizedItems) {
      const currentItem = normalizedItems.find((item) => item.kind === "current");
      const dailyItems = normalizedItems.filter((item) => item.kind === "daily").map((item) => item.row);

      if (currentItem) {
        await insertObservation(db, currentItem.row);
      }
      const dailyInserted = await insertForecastDays(db, dailyItems);

      return {
        insertedCount: (currentItem ? 1 : 0) + dailyInserted,
        duplicateCount: 0,
      };
    },
  };
}
