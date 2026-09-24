import { describe, expect, it, vi } from "vitest";
import { dispatchIngest, jobsDue, runScheduled } from "./scheduled";
import type { Bindings } from "./types";

const at = (iso: string) => new Date(iso);

describe("jobsDue", () => {
  it("runs news every hour", () => {
    expect(jobsDue(at("2026-09-24T05:05:00Z"))).toEqual(["news"]);
  });

  it("adds forecast and air quality every third hour", () => {
    expect(jobsDue(at("2026-09-24T06:05:00Z"))).toEqual(["news", "weather-forecast", "weather-air-quality"]);
  });

  it("adds marine and flood once a day", () => {
    expect(jobsDue(at("2026-09-24T01:05:00Z"))).toEqual(["news", "weather-marine", "weather-flood"]);
  });

  it("adds seasonal on Mondays and climate on the 1st", () => {
    expect(jobsDue(at("2026-09-28T02:05:00Z"))).toContain("weather-seasonal"); // a Monday
    expect(jobsDue(at("2026-09-24T02:05:00Z"))).not.toContain("weather-seasonal");
    expect(jobsDue(at("2026-10-01T03:05:00Z"))).toContain("weather-climate");
    expect(jobsDue(at("2026-10-02T03:05:00Z"))).not.toContain("weather-climate");
  });
});

describe("dispatchIngest", () => {
  it("dispatches the ingest workflow on main with the job as input", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await dispatchIngest({ GITHUB_TOKEN: "t0ken", GITHUB_REPO: "owner/repo" }, "news", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/owner/repo/actions/workflows/ingest.yml/dispatches");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t0ken");
    expect(JSON.parse(init.body as string)).toEqual({ ref: "main", inputs: { job: "news" } });
  });

  it("throws with GitHub's response when the dispatch is rejected", async () => {
    const fetchImpl = vi.fn(async () => new Response("Bad credentials", { status: 401 }));
    await expect(dispatchIngest({ GITHUB_TOKEN: "x", GITHUB_REPO: "o/r" }, "news", fetchImpl)).rejects.toThrow(
      /HTTP 401 Bad credentials/,
    );
  });
});

describe("runScheduled", () => {
  const env = { GITHUB_TOKEN: "t", GITHUB_REPO: "o/r" } as Bindings;

  it("dispatches every due job, and fails the run if any dispatch fails", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const { inputs } = JSON.parse(init?.body as string) as { inputs: { job: string } };
      return new Response(null, { status: inputs.job === "weather-forecast" ? 500 : 204 });
    });
    await expect(runScheduled(Date.parse("2026-09-24T06:05:00Z"), env, fetchImpl as typeof fetch)).rejects.toThrow(
      /weather-forecast/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does nothing without a token", async () => {
    const fetchImpl = vi.fn();
    await runScheduled(Date.now(), { GITHUB_REPO: "o/r" } as Bindings, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
