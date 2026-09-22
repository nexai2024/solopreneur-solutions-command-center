/**
 * Centralized environment variable validation.
 * Call `validateEnv()` once at startup (instrumentation.ts) so missing
 * variables fail fast instead of producing runtime errors deep in handlers.
 */

export type EnvRequirement = {
  name: string;
  /** Required for the app to boot at all */
  critical: boolean;
  /** Required only in production */
  productionOnly?: boolean;
  /** Human-readable description of what breaks without it */
  purpose: string;
};

const REQUIREMENTS: EnvRequirement[] = [
  { name: "DATABASE_URL", critical: true, purpose: "PostgreSQL connection" },
  { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", critical: true, purpose: "Authentication" },
  { name: "CLERK_SECRET_KEY", critical: true, productionOnly: true, purpose: "Authentication (server)" },
  { name: "ENCRYPTION_KEY", critical: true, productionOnly: true, purpose: "Token encryption at rest" },
  { name: "CLERK_WEBHOOK_SECRET", critical: false, purpose: "User sync from Clerk" },
  { name: "STRIPE_SECRET_KEY", critical: false, purpose: "Revenue tracking" },
  { name: "STRIPE_WEBHOOK_SECRET", critical: false, purpose: "Stripe event ingestion" },
  { name: "GITHUB_WEBHOOK_SECRET", critical: false, purpose: "Repo event ingestion" },
  { name: "CI_WEBHOOK_SECRET", critical: false, purpose: "CI build ingestion" },
  { name: "OPENAI_API_KEY", critical: false, purpose: "AI features" },
];

export type EnvValidationResult = {
  ok: boolean;
  missing: Array<{ name: string; purpose: string; critical: boolean }>;
  warnings: string[];
};

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvValidationResult {
  const isProd = process.env.NODE_ENV === "production";
  const missing: EnvValidationResult["missing"] = [];
  const warnings: string[] = [];

  for (const req of REQUIREMENTS) {
    const value = env[req.name];
    if (value?.trim()) continue;

    if (req.critical && (isProd || !req.productionOnly)) {
      missing.push({ name: req.name, purpose: req.purpose, critical: true });
    } else if (req.productionOnly && isProd) {
      missing.push({ name: req.name, purpose: req.purpose, critical: true });
    } else {
      warnings.push(`${req.name} not set — ${req.purpose} will be unavailable`);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}
