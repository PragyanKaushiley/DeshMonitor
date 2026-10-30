import { z } from "zod";
import { fetchWithTimeout, sha256Hex } from "@desh-monitor/utils";
import {
  insertDisasterItems,
  type Database,
  type DisasterItemInput,
  type DisasterSourceRecord,
} from "@desh-monitor/db";
import type { SourceAdapter } from "../../core/types";

// USGS's FDSN event service, GeoJSON output. Documented at
// https://earthquake.usgs.gov/fdsnws/event/1/ — times are milliseconds since
// the epoch and coordinates are [longitude, latitude, depth in km].

const USER_AGENT = "DeshMonitorBot/0.1 (+https://github.com/desh-monitor; ingestion bot)";

const queryParamsSchema = z.object({
  minLatitude: z.number().min(-90).max(90),
  maxLatitude: z.number().min(-90).max(90),
  minLongitude: z.number().min(-360).max(360),
  maxLongitude: z.number().min(-360).max(360),
  minMagnitude: z.number().optional(),
  lookbackHours: z.number().positive().max(24 * 30),
  limit: z.number().int().min(1).max(20_000),
});

const featureSchema = z.object({
  id: z.string().trim().min(1),
  properties: z.object({
    time: z.number().int(),
    updated: z.number().int(),
    type: z.string().trim().min(1).default("earthquake"),
    title: z.string().nullish(),
    place: z.string().nullish(),
    mag: z.number().nullish(),
    magType: z.string().nullish(),
    status: z.string().nullish(),
    alert: z.string().nullish(),
    tsunami: z.number().nullish(),
    sig: z.number().nullish(),
    felt: z.number().nullish(),
    url: z.string().nullish(),
  }),
  geometry: z.object({
    coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
  }),
});

export type UsgsFeature = z.infer<typeof featureSchema>;

export function buildQueryUrl(source: DisasterSourceRecord, now: Date): string {
  const p = queryParamsSchema.parse(source.queryParams);
  const params = new URLSearchParams({
    format: "geojson",
    // Everything the provider created or revised recently, so a changed
    // magnitude or review status on an older event is picked up too.
    updatedafter: new Date(now.getTime() - p.lookbackHours * 3_600_000).toISOString().slice(0, 19),
    minlatitude: String(p.minLatitude),
    maxlatitude: String(p.maxLatitude),
    minlongitude: String(p.minLongitude),
    maxlongitude: String(p.maxLongitude),
    orderby: "time",
    limit: String(p.limit),
  });
  if (p.minMagnitude !== undefined) params.set("minmagnitude", String(p.minMagnitude));
  return `${source.url}?${params.toString()}`;
}

export function isValidFeature(item: unknown): boolean {
  return featureSchema.safeParse(item).success;
}

// Only called on items that passed isValidFeature; parsing again here is what
// gives the rest of the function a trusted type.
export function normalizeFeature(item: unknown, source: DisasterSourceRecord): DisasterItemInput {
  const feature = featureSchema.parse(item);
  const { properties: p, geometry } = feature;
  const [longitude, latitude, depthKm] = geometry.coordinates;
  const place = p.place?.trim() || null;

  return {
    sourceId: source.id,
    externalId: feature.id,
    sourceUpdatedAt: new Date(p.updated),
    occurredAt: new Date(p.time),
    hazardType: p.type,
    title: p.title?.trim() || place || feature.id,
    place,
    latitude,
    longitude,
    depthKm: depthKm ?? null,
    magnitude: p.mag ?? null,
    magnitudeType: p.magType ?? null,
    sourceStatus: p.status ?? null,
    sourceAlertLevel: p.alert ?? null,
    tsunamiFlag: p.tsunami === null || p.tsunami === undefined ? null : p.tsunami === 1,
    significance: p.sig ?? null,
    feltReports: p.felt ?? null,
    url: p.url ?? null,
    contentHash: sha256Hex(JSON.stringify(item)),
    rawPayload: item,
  };
}

export function createUsgsAdapter(
  db: Database,
  now: () => Date = () => new Date(),
): SourceAdapter<DisasterSourceRecord, unknown, DisasterItemInput> {
  return {
    async fetch(source) {
      const { status, body } = await fetchWithTimeout(buildQueryUrl(source, now()), {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        timeoutMs: 20_000,
      });

      // The service answers 204 when nothing matched: a healthy, empty result.
      if (status === 204) return { httpStatus: status, rawItems: [] };
      if (status !== 200) throw new Error(`USGS returned HTTP ${status}`);

      const parsed = JSON.parse(body) as { features?: unknown[] };
      const features: unknown[] = Array.isArray(parsed.features) ? parsed.features : [];
      return { httpStatus: status, rawItems: features };
    },

    validate: isValidFeature,

    normalize: normalizeFeature,

    async persist(_source, normalizedItems) {
      return insertDisasterItems(db, normalizedItems);
    },
  };
}
