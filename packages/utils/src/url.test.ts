import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("strips tracking params", () => {
    expect(normalizeUrl("https://example.com/article?utm_source=x&id=1")).toBe(
      "https://example.com/article?id=1",
    );
  });

  it("removes the fragment", () => {
    expect(normalizeUrl("https://example.com/article#section")).toBe("https://example.com/article");
  });

  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://Example.COM/article")).toBe("https://example.com/article");
  });

  it("strips a trailing slash on non-root paths", () => {
    expect(normalizeUrl("https://example.com/article/")).toBe("https://example.com/article");
  });

  it("keeps the root path slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });
});
