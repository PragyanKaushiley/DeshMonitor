import { z } from "zod";
import { fetchWithTimeout, sha256Hex } from "@desh-monitor/utils";
import {
  insertDisasterItems,
  type Database,
  type DisasterItemInput,
  type DisasterSourceRecord,
} from "@desh-monitor/db";
import type { SourceAdapter } from "../../core/types";

// NASA's Earth Observatory Natural Event Tracker (EONET v3), which curates
// wildfires, floods, severe storms and similar events from other agencies.
// Documented at https://eonet.gsfc.nasa.gov/docs/v3 — no API key. The API
// allows 60 requests per window (X-RateLimit-Limit), far above one per run.

const USER_AGENT = "DeshMonitorBot/0.1 (+https://github.com/desh-monitor; ingestion bot)";

const queryParamsSchema = z.object({
  minLongitude: z.number().min(-180).max(180),
  maxLongitude: z.number().min(-180).max(180),
  minLatitude: z.number().min(-90).max(90),
  maxLatitude: z.number().min(-90).max(90),
  lookbackDays: z.number().int().min(1).max(365),
  limit: z.number().int().min(1).max(1000),
});

const eventSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  link: z.string().nullish(),
  closed: z.string().nullish(),
  categories: z.array(z.object({ id: z.string().min(1) })).min(1),
  geometry: z
    .array(
      z.object({
        date: z.string().min(1),
        type: z.string(),
        magnitudeValue: z.number().nullish(),
        magnitudeUnit: z.string().nullish(),
        coordinates: z.unknown(),
      }),
    )
    .min(1),
});

type EonetEvent = z.infer<typeof eventSchema>;

export function buildEonetUrl(source: DisasterSourceRecord): string {
  const p = queryParamsSchema.parse(source.queryParams);
  const params = new URLSearchParams({
    status: "all",
    days: String(p.lookbackDays),
    limit: String(p.limit),
    // EONET's order: min lon, max lat, max lon, min lat.
    bbox: [p.minLongitude, p.maxLatitude, p.maxLongitude, p.minLatitude].join(","),
  });
  return `${source.url}?${params.toString()}`;
}

export function isValidEvent(item: unknown): boolean {
  const parsed = eventSchema.safeParse(item);
  return parsed.success && parsed.data.geometry.every((g) => !Number.isNaN(Date.parse(g.date)));
}

function pointOf(coordinates: unknown): [number, number] | null {
  if (!Array.isArray(coordinates)) return null;
  const [lon, lat] = coordinates;
  return typeof lon === "number" && typeof lat === "number" ? [lon, lat] : null;
}

// EONET gives no "last revised" time, so the latest time it reports for an
// event — its newest position or its close date — stands in for one: when the
// event gains a position or is closed, that changes, and the new state is
// stored as a new revision rather than overwriting the old.
export function normalizeEvent(item: unknown, source: DisasterSourceRecord): DisasterItemInput {
  const event: EonetEvent = eventSchema.parse(item);
  const positions = [...event.geometry].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const first = positions[0];
  const latest = positions[positions.length - 1];
  if (!first || !latest) throw new Error("event has no geometry");

  const closedAt = event.closed ? Date.parse(event.closed) : Number.NaN;
  const lastChange = Math.max(Date.parse(latest.date), Number.isNaN(closedAt) ? 0 : closedAt);
  // Only a point has a single position; areas keep their shape in the payload.
  const point = latest.type === "Point" ? pointOf(latest.coordinates) : null;

  return {
    sourceId: source.id,
    externalId: event.id,
    sourceUpdatedAt: new Date(lastChange),
    occurredAt: new Date(Date.parse(first.date)),
    hazardType: event.categories[0]?.id ?? "unknown",
    title: event.title,
    place: null,
    latitude: point ? point[1] : null,
    longitude: point ? point[0] : null,
    depthKm: null,
    magnitude: latest.magnitudeValue ?? null,
    // For EONET the unit is what names the measure (e.g. "kts", "acres").
    magnitudeType: latest.magnitudeUnit ?? null,
    sourceStatus: event.closed ? "closed" : "open",
    sourceAlertLevel: null,
    tsunamiFlag: null,
    significance: null,
    feltReports: null,
    url: event.link ?? null,
    contentHash: sha256Hex(JSON.stringify(item)),
    rawPayload: item,
  };
}

export function createEonetAdapter(db: Database): SourceAdapter<DisasterSourceRecord, unknown, DisasterItemInput> {
  return {
    async fetch(source) {
      const { status, body } = await fetchWithTimeout(buildEonetUrl(source), {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        timeoutMs: 20_000,
      });
      if (status !== 200) throw new Error(`EONET returned HTTP ${status}`);

      const parsed = JSON.parse(body) as { events?: unknown[] };
      return { httpStatus: status, rawItems: Array.isArray(parsed.events) ? parsed.events : [] };
    },

    validate: isValidEvent,

    normalize: normalizeEvent,

    async persist(_source, normalizedItems) {
      return insertDisasterItems(db, normalizedItems);
    },
  };
}
