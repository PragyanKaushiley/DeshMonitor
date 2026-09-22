import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./index";

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
});
