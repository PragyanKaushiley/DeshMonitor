import { describe, expect, it } from "vitest";
import { isValidRssItem } from "./validate";

describe("isValidRssItem", () => {
  it("accepts an item with a title and link", () => {
    expect(isValidRssItem({ title: "Headline", link: "https://example.com/a" })).toBe(true);
  });

  it("rejects an item missing a title", () => {
    expect(isValidRssItem({ link: "https://example.com/a" })).toBe(false);
  });

  it("rejects an item with a blank title", () => {
    expect(isValidRssItem({ title: "   ", link: "https://example.com/a" })).toBe(false);
  });

  it("rejects an item missing a link", () => {
    expect(isValidRssItem({ title: "Headline" })).toBe(false);
  });
});
