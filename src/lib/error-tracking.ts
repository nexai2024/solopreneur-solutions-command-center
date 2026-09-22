import { logger } from "./logger";
import { ApiError } from "./api-error";

/**
 * Error tracking configuration
 * In production, integrate with Sentry, Datadog, or similar
 */
export interface ErrorTrackingConfig {
  /** Enable error tracking (disabled in dev by default) */
  enabled: boolean;
  /** Maximum depth for serializing error context */
  maxContextDepth: number;
  /** Fields to always include in error reports */
  requiredContext: string[];
  /** Fields to redact from error reports (PII, secrets, etc.) */
  redactedFields: string[];
}

const DEFAULT_CONFIG: ErrorTrackingConfig = {
  enabled: process.env.NODE_ENV === "production" ||
           process.env.ERROR_TRACKING_ENABLED === "true",
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
};

let config: ErrorTrackingConfig = DEFAULT_CONFIG;

export function configureErrorTracking(customConfig: Partial<ErrorTrackingConfig>): void {
  config = { ...config, ...customConfig  };
}


/**
 * Sanitize context object by removing sensitive fields
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    // Skip redacted fields
    if (config.redactedFields.some((field) =>
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Deep clone with depth limit
    sanitized[key] = cloneWithDepth(value, config.maxContextDepth);
  }

  return sanitized;
}

function cloneWithDepth(value: unknown, depth: number): unknown {
  if (depth <= 0) return "[max depth]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => cloneWithDepth(item, depth - 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = cloneWithDepth(val, depth - 1);
  }
  return result;
}

/**
 * Capture and track an error with full context
 */
export function captureError(
  error: unknown,
  context: Record<string, unknown> = {}
): string {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();

  // Extract error details
  const errorDetails = {
    name: error instanceof Error ? error.name : "UnknownError",
    message: extractErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    isOperational: error instanceof ApiError,
    code: extractErrorCode(error),
  };

  // Build full report
  const report = {
    errorId,
    timestamp,
    ...errorDetails,
    context: sanitizeContext({
      ...context,
      // Always include required context
      timestamp,
    }),
  };

  // Log to console (structured JSON)
  if (errorDetails.isOperational) {
    logger.warn("Operational error captured", {
      route: context.route as string | undefined,
      method: context.method as string | undefined,
      errorCode: errorDetails.code,
    }, error);
  } else {
    logger.error("Unhandled error captured", {
      route: context.route as string | undefined,
      method: context.method as string | undefined,
      errorId,
    }, error);
  }

  // In production, send to external error tracking service
  if (config.enabled) {
    sendToErrorTracker(report);
  }

  return errorId;
}

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    return String(error);
  }
  return "Unknown error";
}

function extractErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: string }).code);
  }
  return undefined;
}

/**
 * Send error report to external tracking service
 * This is a placeholder - integrate with Sentry, Datadog, etc. in production
 */
async function sendToErrorTracker(report: Record<string, unknown>): Promise<void> {
  logger.info("Error tracking report prepared", {
    errorId: report.errorId,
    isOperational: report.isOperational,
  });
}

/**
 * Create an error handler wrapper for async functions
 * Automatically captures and logs errors with context
 */
/**
 * Wrap an async function with automatic error tracking.
 * Errors are captured with full context before being re-thrown.
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureError(error, context);
    throw error;
  }
}

/**
 * Extract useful information from request for error context
 */

export function extractRequestContext(request: Request): Record<string, unknown> {
  return {
    url: request.url,
    method: request.method,
    headers: {
      "content-type": request.headers.get("content-type") ?? undefined,
      "user-agent": request.headers.get("user-agent") ?? undefined,
    },
   };
}

