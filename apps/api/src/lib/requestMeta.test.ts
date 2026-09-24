import { describe, expect, it } from "vitest";
import { buildRequestContext, sha256Hex } from "./requestMeta";

describe("buildRequestContext", () => {
  it("maps Cloudflare's request.cf fields and headers to the stored columns", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "user-agent": "Mozilla/5.0 test",
      "accept-language": "en-IN,en;q=0.9",
    });
    const cf = {
      country: "IN",
      region: "Maharashtra",
      regionCode: "MH",
      city: "Mumbai",
      postalCode: "400001",
      latitude: "19.07600",
      longitude: "72.87770",
      timezone: "Asia/Kolkata",
      continent: "AS",
      asn: 55836,
      asOrganization: "Reliance Jio",
      colo: "BOM",
    };

    const context = buildRequestContext(headers, cf);

    expect(context).toMatchObject({
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0 test",
      acceptLanguage: "en-IN,en;q=0.9",
      country: "IN",
      region: "Maharashtra",
      regionCode: "MH",
      city: "Mumbai",
      postalCode: "400001",
      latitude: 19.076,
      longitude: 72.8777,
      timezone: "Asia/Kolkata",
      continent: "AS",
      asn: 55836,
      asOrganization: "Reliance Jio",
      colo: "BOM",
    });
    // The full object is preserved alongside the broken-out columns.
    expect(context.cf).toEqual(cf);
  });

  it("returns nulls when there is no cf object or headers (e.g. outside Workers)", () => {
    const context = buildRequestContext(new Headers(), undefined);
    expect(context.ip).toBeNull();
    expect(context.country).toBeNull();
    expect(context.latitude).toBeNull();
    expect(context.asn).toBeNull();
    expect(context.cf).toBeNull();
  });

  it("ignores malformed coordinates and truncates over-long values", () => {
    const context = buildRequestContext(new Headers({ "user-agent": "x".repeat(2000) }), {
      latitude: "not-a-number",
      city: "",
    });
    expect(context.latitude).toBeNull();
    expect(context.city).toBeNull();
    expect(context.userAgent).toHaveLength(512);
  });
});

describe("sha256Hex", () => {
  it("produces the standard SHA-256 hex digest", async () => {
    await expect(sha256Hex("abc")).resolves.toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
