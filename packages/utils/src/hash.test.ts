import { describe, expect, it } from "vitest";
import { sha256Hex } from "./hash";

describe("sha256Hex", () => {
  it("produces a stable 64-char hex digest", () => {
    const digest = sha256Hex("hello");
    expect(digest).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("produces different digests for different input", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});
