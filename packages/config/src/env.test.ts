import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("returns the parsed env when DATABASE_URL is a valid URL", () => {
    const env = loadEnv({ DATABASE_URL: "postgres://user:pass@host/db" } as NodeJS.ProcessEnv);
    expect(env.DATABASE_URL).toBe("postgres://user:pass@host/db");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it("throws when DATABASE_URL is not a valid URL", () => {
    expect(() => loadEnv({ DATABASE_URL: "not-a-url" } as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });
});
