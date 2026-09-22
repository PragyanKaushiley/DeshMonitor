import { describe, expect, it } from "vitest";
import type { SourceRecord } from "@desh-monitor/db";
import { normalizeRssItem } from "./normalize";

const source: SourceRecord = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Test Source",
  publisher: "Test Publisher",
  sourceType: "rss",
  url: "https://example.com/feed",
  category: "national",
  isActive: true,
};

describe("normalizeRssItem", () => {
  it("uses guid as the external id when present", () => {
    const record = normalizeRssItem(
      { title: "Headline", link: "https://example.com/a?utm_source=x", guid: "guid-123" },
      source,
    );

    expect(record.externalId).toBe("guid-123");
    expect(record.url).toBe("https://example.com/a");
    expect(record.sourceId).toBe(source.id);
  });

  it("falls back to the normalized url as external id when guid is missing", () => {
    const record = normalizeRssItem({ title: "Headline", link: "https://example.com/a/" }, source);
    expect(record.externalId).toBe("https://example.com/a");
  });

  it("produces the same content hash for the same title and url", () => {
    const a = normalizeRssItem({ title: "Headline", link: "https://example.com/a" }, source);
    const b = normalizeRssItem({ title: "Headline", link: "https://example.com/a" }, source);
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("returns null publishedAt when no date fields are present", () => {
    const record = normalizeRssItem({ title: "Headline", link: "https://example.com/a" }, source);
    expect(record.publishedAt).toBeNull();
  });

  it("parses isoDate when present", () => {
    const record = normalizeRssItem(
      { title: "Headline", link: "https://example.com/a", isoDate: "2026-01-01T00:00:00.000Z" },
      source,
    );
    expect(record.publishedAt?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("keeps the raw parsed item as rawPayload", () => {
    const item = { title: "Headline", link: "https://example.com/a", categories: ["Politics"] };
    const record = normalizeRssItem(item, source);
    expect(record.rawPayload).toEqual(item);
    expect(record.sourceCategories).toEqual(["Politics"]);
  });
});
