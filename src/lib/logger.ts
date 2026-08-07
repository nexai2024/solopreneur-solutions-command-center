type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  route?: string;
  userId?: string;
  method?: string;
  [key: string]: unknown;
}

function formatError(error: unknown): { message: string; stack?: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack, name: error.name };
  }
  return { message: String(error) };
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...(error ? { error: formatError(error) } : {}),
  };

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV === "development") console.debug(JSON.stringify(entry));
      break;
    case "info":
      console.info(JSON.stringify(entry));
      break;
    case "warn":
      console.warn(JSON.stringify(entry));
      break;
    case "error":
      console.error(JSON.stringify(entry));
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext, error?: unknown) => log("warn", message, context, error),
  error: (message: string, context?: LogContext, error?: unknown) => log("error", message, context, error),
};
