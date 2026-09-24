export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

// One structured log line: fixed keys plus the logger's context and the
// call's fields.
export interface LogEntry extends LogFields {
  timestamp: string;
  level: LogLevel;
  message: string;
}

// Somewhere entries go besides the console — e.g. a buffer that is later
// written to the database. Runtime-agnostic: this package never does I/O
// itself beyond console output, so it works in Node, Workers and browsers.
export type LogSink = (entry: LogEntry) => void;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(context: LogFields): Logger;
}

function write(sinks: readonly LogSink[], level: LogLevel, context: LogFields, message: string, fields?: LogFields): void {
  const entry: LogEntry = {
    ...context,
    ...fields,
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  for (const sink of sinks) {
    try {
      sink(entry);
    } catch {
      // A failing sink must never break the code that is logging.
    }
  }
}

export function createLogger(context: LogFields = {}, sinks: readonly LogSink[] = []): Logger {
  return {
    debug: (message, fields) => write(sinks, "debug", context, message, fields),
    info: (message, fields) => write(sinks, "info", context, message, fields),
    warn: (message, fields) => write(sinks, "warn", context, message, fields),
    error: (message, fields) => write(sinks, "error", context, message, fields),
    child: (childContext) => createLogger({ ...context, ...childContext }, sinks),
  };
}

// Error objects serialize to "{}" in JSON; this keeps what's useful.
export function errorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    return { error: error.message, errorName: error.name, stack: error.stack };
  }
  return { error: String(error) };
}
