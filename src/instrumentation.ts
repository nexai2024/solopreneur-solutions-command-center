import { validateEnv } from "@/lib/env-validate";
import * as Sentry from '@sentry/nextjs';



/**
 * Next.js instrumentation hook — runs once per server process at boot.
 * Keep this Edge-safe: no Prisma / Node-only imports in the static graph.
 * Fails fast in production when critical env vars are missing.
 */
export async function register() {
  // Skip Edge runtime — Prisma and Node APIs are not available there.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import('../sentry.edge.config');
  }

  const result = validateEnv();

  for (const warning of result.warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (!result.ok) {
    const missingList = result.missing
      .map((m) => `${m.name} (${m.purpose})`)
      .join(", ");

    if (process.env.NODE_ENV === "production") {
      console.error(`[env] FATAL: Missing critical environment variables: ${missingList}`);
      throw new Error(`Missing critical environment variables: ${missingList}`);
    }

    console.warn(`[env] Development env check — missing variables: ${missingList}`);
    return;
  }

  console.info("[env] Environment validation passed");
}
export const onRequestError = Sentry.captureRequestError;