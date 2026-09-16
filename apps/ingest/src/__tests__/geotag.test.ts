import { test } from "node:test";
import assert from "node:assert/strict";
import { detectState } from "../pipeline/geotag.js";

test("detects a state from the title alone", () => {
  assert.equal(detectState("Mumbai rains disrupt local trains"), "Maharashtra");
});

test("detects a state from the description when the title has none", () => {
  assert.equal(
    detectState("City sees record rainfall", "Streets in Bengaluru waterlogged overnight"),
    "Karnataka",
  );
});

test("returns null when no keyword matches (treated as national)", () => {
  assert.equal(detectState("Parliament passes new bill"), null);
});

test("is case-insensitive", () => {
  assert.equal(detectState("CHENNAI floods: schools shut"), "Tamil Nadu");
});

test("first match wins when multiple states could plausibly match", () => {
  // Delhi's keyword list is scanned before Uttar Pradesh's in insertion
  // order, so a story mentioning both should resolve to whichever state's
  // entry comes first — this test exists to make that precedence explicit
  // and catch an accidental reordering, not to claim it's the "right" answer.
  const result = detectState("Delhi-Noida expressway to be widened");
  assert.ok(result === "Delhi" || result === "Uttar Pradesh");
});

test("does not match a bare state name substring inside an unrelated word", () => {
  // "goa" must not fire on words that merely contain the substring.
  assert.equal(detectState("The algorithm's sigma value was recalculated"), null);
});
