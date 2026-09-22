import { z } from "zod";
import { insertAirQuality, startFetch, type AirQualityInput, type Database } from "@desh-monitor/db";
import type { SourceAdapter } from "../../../core/types";
import { airQualityUrl, fetchOpenMeteoJson } from "../openMeteo";
import type { WeatherSource } from "../types";

interface AirQualityRawItem {
  time: string;
  pm10?: number | undefined;
  pm2_5?: number | undefined;
  carbon_monoxide?: number | undefined;
  nitrogen_dioxide?: number | undefined;
  sulphur_dioxide?: number | undefined;
  ozone?: number | undefined;
  us_aqi?: number | undefined;
}

const schema = z.object({
  time: z.string().min(1),
});

export function createAirQualityAdapter(db: Database): SourceAdapter<WeatherSource, AirQualityRawItem, AirQualityInput> {
  return {
    async fetch(source) {
      const fetchId = await startFetch(db, {
        locationId: source.location.id,
        dataType: "air_quality",
        startedAt: new Date(),
      });
      source.fetchId = fetchId;

      const url = airQualityUrl(source.location.latitude, source.location.longitude);
      const { status, json } = await fetchOpenMeteoJson(url);

      const current = json.current as Record<string, unknown> | undefined;
      const rawItems: AirQualityRawItem[] = [];
      if (current && typeof current.time === "string") {
        rawItems.push({
          time: current.time,
          pm10: current.pm10 as number | undefined,
          pm2_5: current.pm2_5 as number | undefined,
          carbon_monoxide: current.carbon_monoxide as number | undefined,
          nitrogen_dioxide: current.nitrogen_dioxide as number | undefined,
          sulphur_dioxide: current.sulphur_dioxide as number | undefined,
          ozone: current.ozone as number | undefined,
          us_aqi: current.us_aqi as number | undefined,
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
        pm10: item.pm10 ?? null,
        pm2_5: item.pm2_5 ?? null,
        carbonMonoxide: item.carbon_monoxide ?? null,
        nitrogenDioxide: item.nitrogen_dioxide ?? null,
        sulphurDioxide: item.sulphur_dioxide ?? null,
        ozone: item.ozone ?? null,
        usAqi: item.us_aqi ?? null,
        rawPayload: item,
      };
    },

    async persist(_source, normalizedItems) {
      for (const row of normalizedItems) {
        await insertAirQuality(db, row);
      }
      return { insertedCount: normalizedItems.length, duplicateCount: 0 };
    },
  };
}
