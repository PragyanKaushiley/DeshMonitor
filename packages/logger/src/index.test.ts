import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, errorFields, type LogEntry } from "./index";

describe("createLogger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("writes structured JSON including level, message, and context", () => {
    const logger = createLogger({ app: "test" });
    logger.info("hello", { extra: 1 });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(entry).toMatchObject({ level: "info", message: "hello", app: "test", extra: 1 });
    expect(typeof entry.timestamp).toBe("string");
  });

  it("merges child context with the parent's", () => {
    const parent = createLogger({ app: "test" });
    const child = parent.child({ requestId: "abc" });
    child.info("child message");

    const entry = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(entry).toMatchObject({ app: "test", requestId: "abc", message: "child message" });
  });

  it("hands every entry to the sinks, including from child loggers", () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({ app: "test" }, [(entry) => entries.push(entry)]);
    logger.warn("careful", { n: 1 });
    logger.child({ job: "news" }).error("broke");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ level: "warn", message: "careful", app: "test", n: 1 });
    expect(entries[1]).toMatchObject({ level: "error", message: "broke", app: "test", job: "news" });
  });

  it("keeps logging when a sink throws", () => {
    const logger = createLogger({}, [
      () => {
        throw new Error("sink down");
      },
    ]);
    expect(() => logger.info("still fine")).not.toThrow();
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("does not let fields overwrite the level or message", () => {
    const entries: LogEntry[] = [];
    createLogger({}, [(entry) => entries.push(entry)]).info("real", { level: "error", message: "fake" });
    expect(entries[0]).toMatchObject({ level: "info", message: "real" });
  });
});

describe("errorFields", () => {
  it("keeps an Error's message, name and stack", () => {
    const fields = errorFields(new TypeError("bad input"));
    expect(fields).toMatchObject({ error: "bad input", errorName: "TypeError" });
    expect(typeof fields.stack).toBe("string");
  });

  it("stringifies anything else", () => {
    expect(errorFields("plain")).toEqual({ error: "plain" });
  });
});
