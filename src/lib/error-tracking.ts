import { logger } from "@/lib/logger";

/** Capture server errors. Wire to Sentry when @sentry/nextjs supports your Next.js version. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  logger.error("Captured exception", context, error);
}
