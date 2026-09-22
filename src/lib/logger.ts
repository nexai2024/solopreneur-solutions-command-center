type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  route?: string;
  userId?: string;
  method?: string;
  requestId?: string;
  [key: string]: unknown;
}

// Structured log entry format
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  // Additional context
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  };

  // Don't log full error object to avoid PII leakage
  if (error && error instanceof Error) {
    entry.errorMessage = error.message;
    entry.errorName = error.name;
    if (process.env.NODE_ENV !== "production") {
      entry.errorStack = error.stack;
    }
  } else if (error) {
    entry.errorMessage = String(error);
  }

  // Convert to JSON string for structured logging
  const jsonEntry = JSON.stringify(entry);

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(jsonEntry);
      }
      break;
    case "info":
      console.info(jsonEntry);
      break;
    case "warn":
      console.warn(jsonEntry);
      break;
    case "error":
      console.error(jsonEntry);
      break;
  }

  // Lazy-load error tracking so Edge / instrumentation never pull Prisma via static imports
  if (level === "error" && process.env.NODE_ENV === "production") {
    void import("./error-tracking")
      .then(({ captureError }) => {
        captureError(error, {
          route: context?.route,
          method: context?.method,
          userId: context?.userId,
        });
      })
      .catch(() => undefined);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext, error?: unknown) =>
    log("warn", message, context, error),
  error: (message: string, context?: LogContext, error?: unknown) =>
    log("error", message, context, error),
};

// Configure error tracking based on environment (Node only; skip Edge)
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_RUNTIME !== "edge"
) {
  void import("./error-tracking").then(({ configureErrorTracking }) => {
    configureErrorTracking({
      enabled: true,
      maxContextDepth: 3,
      requiredContext: ["route", "method", "userId", "timestamp"],
      redactedFields: [
        "password",
        "token",
        "secret",
        "apiKey",
        "authorization",
        "cookie",
        "creditCard",
        "ssn",
        "email",
      ],
    });
  });
}
