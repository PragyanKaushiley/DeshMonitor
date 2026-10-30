import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database, DisasterSourceRecord } from "@desh-monitor/db";
import { buildQueryUrl, createUsgsAdapter, isValidFeature, normalizeFeature } from "./usgs";

const source: DisasterSourceRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "usgs-test",
  name: "USGS test",
  provider: "USGS",
  sourceType: "usgs-fdsn-geojson",
  url: "https://earthquake.usgs.gov/fdsnws/event/1/query",
  queryParams: {
    minLatitude: 6,
    maxLatitude: 38,
    minLongitude: 67,
    maxLongitude: 98,
    lookbackHours: 24,
    limit: 2000,
  },
  license: "Public domain",
  attribution: null,
  termsUrl: null,
  isActive: true,
};

// Shaped like a real response from the service.
const feature = {
  type: "Feature",
  properties: {
    mag: 5.1,
    place: "218 km NNW of Bamboo Flat, India",
    time: 1793263782448,
    updated: 1793321469188,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000tty7",
    felt: 1,
    alert: null,
    status: "reviewed",
    tsunami: 0,
    sig: 400,
    magType: "mb",
    type: "earthquake",
    title: "M 5.1 - 218 km NNW of Bamboo Flat, India",
  },
  geometry: { type: "Point", coordinates: [91.6593, 13.3785, 10] },
  id: "us7000tty7",
};

afterEach(() => vi.unstubAllGlobals());

describe("buildQueryUrl", () => {
  it("asks for GeoJSON inside the rectangle, for events revised in the look-back window", () => {
    const url = new URL(buildQueryUrl(source, new Date("2026-10-31T12:00:00Z")));
    expect(url.origin + url.pathname).toBe(source.url);
    expect(url.searchParams.get("format")).toBe("geojson");
    expect(url.searchParams.get("updatedafter")).toBe("2026-10-30T12:00:00");
    expect(url.searchParams.get("minlatitude")).toBe("6");
    expect(url.searchParams.get("maxlongitude")).toBe("98");
    expect(url.searchParams.get("limit")).toBe("2000");
    expect(url.searchParams.has("minmagnitude")).toBe(false);
  });

  it("adds a minimum magnitude only when one is configured", () => {
    const url = new URL(buildQueryUrl({ ...source, queryParams: { ...(source.queryParams as object), minMagnitude: 3 } }, new Date()));
    expect(url.searchParams.get("minmagnitude")).toBe("3");
  });

  it("refuses a malformed query configuration", () => {
    expect(() => buildQueryUrl({ ...source, queryParams: { minLatitude: "six" } }, new Date())).toThrow();
  });
});

describe("validation", () => {
  it("accepts a real-shaped feature", () => {
    expect(isValidFeature(feature)).toBe(true);
  });

  it("rejects features missing an id, a time, or coordinates", () => {
    expect(isValidFeature({ ...feature, id: "" })).toBe(false);
    expect(isValidFeature({ ...feature, properties: { ...feature.properties, time: undefined } })).toBe(false);
    expect(isValidFeature({ ...feature, geometry: { type: "Point", coordinates: [91.6] } })).toBe(false);
    expect(isValidFeature(null)).toBe(false);
  });
});

describe("normalizeFeature", () => {
  it("maps the provider's fields and keeps the original payload", () => {
    const item = normalizeFeature(feature, source);
    expect(item).toMatchObject({
      sourceId: source.id,
      externalId: "us7000tty7",
      hazardType: "earthquake",
      title: "M 5.1 - 218 km NNW of Bamboo Flat, India",
      place: "218 km NNW of Bamboo Flat, India",
      magnitude: 5.1,
      magnitudeType: "mb",
      depthKm: 10,
      latitude: 13.3785,
      longitude: 91.6593,
      sourceStatus: "reviewed",
      sourceAlertLevel: null,
      tsunamiFlag: false,
      significance: 400,
      feltReports: 1,
    });
    expect(item.occurredAt.toISOString()).toBe(new Date(1793263782448).toISOString());
    expect(item.sourceUpdatedAt.toISOString()).toBe(new Date(1793321469188).toISOString());
    expect(item.rawPayload).toBe(feature);
  });

  it("does not invent values the provider left out", () => {
    const sparse = {
      id: "x1",
      properties: { time: 1, updated: 2, type: "earthquake", mag: null },
      geometry: { coordinates: [70, 20] },
    };
    const item = normalizeFeature(sparse, source);
    expect(item.magnitude).toBeNull();
    expect(item.depthKm).toBeNull();
    expect(item.place).toBeNull();
    expect(item.tsunamiFlag).toBeNull();
    expect(item.title).toBe("x1");
  });

  it("gives a revised event a different content hash", () => {
    const revised = { ...feature, properties: { ...feature.properties, mag: 5.3, updated: feature.properties.updated + 1000 } };
    expect(normalizeFeature(revised, source).contentHash).not.toBe(normalizeFeature(feature, source).contentHash);
  });
});

describe("adapter.fetch", () => {
  const adapter = createUsgsAdapter({} as Database, () => new Date("2026-10-31T12:00:00Z"));

  it("returns the features from a 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ features: [feature, { bad: true }] }), { status: 200 })));
    const result = await adapter.fetch(source);
    expect(result.httpStatus).toBe(200);
    expect(result.rawItems).toHaveLength(2);
    expect(result.rawItems.filter(adapter.validate)).toHaveLength(1);
  });

  it("treats 204 as a healthy, empty result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    expect(await adapter.fetch(source)).toEqual({ httpStatus: 204, rawItems: [] });
  });

  it("fails on any other status so the source is recorded as failed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad request", { status: 400 })));
    await expect(adapter.fetch(source)).rejects.toThrow("HTTP 400");
  });
});
