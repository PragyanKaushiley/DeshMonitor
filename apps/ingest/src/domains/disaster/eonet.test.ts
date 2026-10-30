import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database, DisasterSourceRecord } from "@desh-monitor/db";
import { buildEonetUrl, createEonetAdapter, isValidEvent, normalizeEvent } from "./eonet";

const source: DisasterSourceRecord = {
  id: "00000000-0000-0000-0000-000000000002",
  slug: "eonet-test",
  name: "EONET test",
  provider: "NASA EONET",
  sourceType: "nasa-eonet-v3",
  url: "https://eonet.gsfc.nasa.gov/api/v3/events",
  queryParams: { minLatitude: 6, maxLatitude: 38, minLongitude: 67, maxLongitude: 98, lookbackDays: 30, limit: 500 },
  license: "test",
  attribution: null,
  termsUrl: null,
  isActive: true,
};

// Shaped like real EONET events.
const cyclone = {
  id: "EONET_25729",
  title: "Tropical Cyclone Arnab",
  description: null,
  link: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_25729",
  closed: null,
  categories: [{ id: "severeStorms", title: "Severe Storms" }],
  sources: [{ id: "JTWC", url: "https://www.metoc.navy.mil/jtwc/products/io0226.tcw" }],
  geometry: [
    { magnitudeValue: 80, magnitudeUnit: "kts", date: "2026-10-26T12:00:00Z", type: "Point", coordinates: [87.2, 15.9] },
    { magnitudeValue: 35, magnitudeUnit: "kts", date: "2026-10-25T18:00:00Z", type: "Point", coordinates: [89.3, 15.6] },
    { magnitudeValue: 65, magnitudeUnit: "kts", date: "2026-10-26T06:00:00Z", type: "Point", coordinates: [88.4, 15.3] },
  ],
};

const flood = {
  id: "EONET_25865",
  title: "Flood in India 1104248",
  description: null,
  link: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_25865",
  closed: "2026-10-29T00:00:00Z",
  categories: [{ id: "floods", title: "Floods" }],
  sources: [{ id: "GDACS", url: "https://www.gdacs.org/report.aspx?eventtype=FL&eventid=1104248" }],
  geometry: [
    {
      magnitudeValue: null,
      magnitudeUnit: null,
      date: "2026-10-19T20:00:00Z",
      type: "Polygon",
      coordinates: [[[81.64, 17.22], [81.65, 17.21], [81.66, 17.19], [81.64, 17.22]]],
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("buildEonetUrl", () => {
  it("asks for all statuses in the look-back window, with EONET's bbox order", () => {
    const url = new URL(buildEonetUrl(source));
    expect(url.origin + url.pathname).toBe(source.url);
    expect(url.searchParams.get("status")).toBe("all");
    expect(url.searchParams.get("days")).toBe("30");
    expect(url.searchParams.get("limit")).toBe("500");
    // min lon, max lat, max lon, min lat
    expect(url.searchParams.get("bbox")).toBe("67,38,98,6");
  });

  it("refuses a malformed query configuration", () => {
    expect(() => buildEonetUrl({ ...source, queryParams: { lookbackDays: 0 } })).toThrow();
  });
});

describe("validation", () => {
  it("accepts real-shaped events", () => {
    expect(isValidEvent(cyclone)).toBe(true);
    expect(isValidEvent(flood)).toBe(true);
  });

  it("rejects events without an id, a category, a geometry, or a usable date", () => {
    expect(isValidEvent({ ...cyclone, id: "" })).toBe(false);
    expect(isValidEvent({ ...cyclone, categories: [] })).toBe(false);
    expect(isValidEvent({ ...cyclone, geometry: [] })).toBe(false);
    expect(isValidEvent({ ...cyclone, geometry: [{ ...cyclone.geometry[0], date: "not a date" }] })).toBe(false);
    expect(isValidEvent(undefined)).toBe(false);
  });
});

describe("normalizeEvent", () => {
  it("takes the track's first time as when it began and its latest position as the current one", () => {
    const item = normalizeEvent(cyclone, source);
    expect(item).toMatchObject({
      externalId: "EONET_25729",
      hazardType: "severeStorms",
      title: "Tropical Cyclone Arnab",
      latitude: 15.9,
      longitude: 87.2,
      magnitude: 80,
      magnitudeType: "kts",
      sourceStatus: "open",
      url: cyclone.link,
    });
    expect(item.occurredAt.toISOString()).toBe("2026-10-25T18:00:00.000Z");
    expect(item.sourceUpdatedAt.toISOString()).toBe("2026-10-26T12:00:00.000Z");
    expect(item.rawPayload).toBe(cyclone);
  });

  it("marks a closed event closed, uses its close date as the latest change, and leaves areas without a point", () => {
    const item = normalizeEvent(flood, source);
    expect(item.sourceStatus).toBe("closed");
    expect(item.sourceUpdatedAt.toISOString()).toBe("2026-10-29T00:00:00.000Z");
    expect(item.occurredAt.toISOString()).toBe("2026-10-19T20:00:00.000Z");
    expect(item.latitude).toBeNull();
    expect(item.longitude).toBeNull();
    expect(item.magnitude).toBeNull();
    expect(item.magnitudeType).toBeNull();
  });

  it("gives an event that gained a position a new revision key", () => {
    const grown = {
      ...cyclone,
      geometry: [...cyclone.geometry, { magnitudeValue: 90, magnitudeUnit: "kts", date: "2026-10-26T18:00:00Z", type: "Point", coordinates: [86.5, 16.4] }],
    };
    const before = normalizeEvent(cyclone, source);
    const after = normalizeEvent(grown, source);
    expect(after.sourceUpdatedAt.getTime()).toBeGreaterThan(before.sourceUpdatedAt.getTime());
    expect(after.contentHash).not.toBe(before.contentHash);
    expect(after.magnitude).toBe(90);
  });
});

describe("adapter.fetch", () => {
  const adapter = createEonetAdapter({} as Database);

  it("returns the events from a 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ events: [cyclone, { bad: 1 }] }), { status: 200 })));
    const result = await adapter.fetch(source);
    expect(result.httpStatus).toBe(200);
    expect(result.rawItems).toHaveLength(2);
    expect(result.rawItems.filter(adapter.validate)).toHaveLength(1);
  });

  it("returns nothing for a response with no events list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    expect((await adapter.fetch(source)).rawItems).toEqual([]);
  });

  it("fails on any other status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    await expect(adapter.fetch(source)).rejects.toThrow("HTTP 429");
  });
});
