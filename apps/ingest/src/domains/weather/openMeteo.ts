import { fetchWithTimeout } from "@desh-monitor/utils";

export interface OpenMeteoResponse {
  status: number;
  json: Record<string, unknown>;
}

export async function fetchOpenMeteoJson(url: string): Promise<OpenMeteoResponse> {
  const { status, body } = await fetchWithTimeout(url, {
    headers: { "User-Agent": "DeshMonitorBot/0.1 (+https://github.com/desh-monitor; ingestion bot)" },
  });
  const json = JSON.parse(body) as Record<string, unknown>;
  if (json.error) {
    throw new Error(`Open-Meteo error: ${String(json.reason ?? "unknown")}`);
  }
  return { status, json };
}

function buildUrl(host: string, path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `https://${host}${path}?${query.toString()}`;
}

export function forecastUrl(latitude: number, longitude: number): string {
  return buildUrl("api.open-meteo.com", "/v1/forecast", {
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    timezone: "auto",
  });
}

export function airQualityUrl(latitude: number, longitude: number): string {
  return buildUrl("air-quality-api.open-meteo.com", "/v1/air-quality", {
    latitude: String(latitude),
    longitude: String(longitude),
    current: "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
  });
}

export function seasonalUrl(latitude: number, longitude: number): string {
  return buildUrl("seasonal-api.open-meteo.com", "/v1/seasonal", {
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
  });
}

export function marineUrl(latitude: number, longitude: number): string {
  return buildUrl("marine-api.open-meteo.com", "/v1/marine", {
    latitude: String(latitude),
    longitude: String(longitude),
    current: "wave_height,wave_direction,wave_period",
    daily: "wave_height_max",
  });
}

export function floodUrl(latitude: number, longitude: number): string {
  return buildUrl("flood-api.open-meteo.com", "/v1/flood", {
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "river_discharge",
  });
}

export const CLIMATE_MODEL = "EC_Earth3P_HR";
export const CLIMATE_START_DATE = "2015-01-01";
export const CLIMATE_END_DATE = "2035-12-31";

export function climateUrl(latitude: number, longitude: number): string {
  return buildUrl("climate-api.open-meteo.com", "/v1/climate", {
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: CLIMATE_START_DATE,
    end_date: CLIMATE_END_DATE,
    models: CLIMATE_MODEL,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
  });
}
