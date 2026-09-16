import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, computeContentHash } from "../pipeline/dedupe.js";

test("strips common tracking parameters", () => {
  const withTracking = "https://example.com/article/1?utm_source=twitter&utm_medium=social&id=1";
  const without = "https://example.com/article/1?id=1";
  assert.equal(normalizeUrl(withTracking), normalizeUrl(without));
});

test("is case-insensitive on the hostname but not the path", () => {
  assert.equal(
    normalizeUrl("https://Example.COM/Article/1"),
    normalizeUrl("https://example.com/Article/1"),
  );
});

test("treats a trailing slash as equivalent to none", () => {
  assert.equal(
    normalizeUrl("https://example.com/article/1/"),
    normalizeUrl("https://example.com/article/1"),
  );
});

test("query parameter order does not affect normalization", () => {
  assert.equal(
    normalizeUrl("https://example.com/a?b=2&a=1"),
    normalizeUrl("https://example.com/a?a=1&b=2"),
  );
});

test("content hash is deterministic for the same normalized URL", () => {
  const a = computeContentHash("https://example.com/story?utm_source=x");
  const b = computeContentHash("https://example.com/story");
  assert.equal(a, b);
});

test("content hash differs for genuinely different paths", () => {
  const a = computeContentHash("https://example.com/story-one");
  const b = computeContentHash("https://example.com/story-two");
  assert.notEqual(a, b);
});

test("an unparseable URL still produces a stable, non-throwing hash", () => {
  assert.doesNotThrow(() => computeContentHash("not a url"));
  assert.equal(computeContentHash("not a url"), computeContentHash("not a url"));
});
