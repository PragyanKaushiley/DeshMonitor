import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("produces a different salt (and hash) on each call for the same password", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
  });

  it("embeds the algorithm and iteration count in the stored hash", async () => {
    const hash = await hashPassword("test");
    expect(hash).toMatch(/^pbkdf2-sha256\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  });

  it("rejects a tampered hash", async () => {
    const hash = await hashPassword("test password");
    const tampered = hash.slice(0, -4) + "AAAA";
    await expect(verifyPassword("test password", tampered)).resolves.toBe(false);
  });

  it("rejects a malformed stored hash rather than throwing", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
  });
});
