export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(context: LogFields): Logger;
}

function write(level: LogLevel, context: LogFields, message: string, fields?: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...fields,
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(context: LogFields = {}): Logger {
  return {
    debug: (message, fields) => write("debug", context, message, fields),
    info: (message, fields) => write("info", context, message, fields),
    warn: (message, fields) => write("warn", context, message, fields),
    error: (message, fields) => write("error", context, message, fields),
    child: (childContext) => createLogger({ ...context, ...childContext }),
  };
}
