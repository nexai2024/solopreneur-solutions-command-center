import { prisma } from "@/lib/prisma";

export type HealthCheckStatus = "ok" | "error" | "skipped" | "warning";

export type HealthCheckResult = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, HealthCheckStatus>;
  // Database pool statistics (if available)
  databasePool: {
    total: number;
    active: number;
    idle: number;
  } | null;
};

function envPresent(name: string): HealthCheckStatus {
  return process.env[name]?.trim() ? "ok" : "skipped";
}

export async function runHealthChecks(): Promise<HealthCheckResult> {
  const checks: Record<string, HealthCheckStatus> = {
    database: "skipped",
    clerk: envPresent("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    clerkWebhook: envPresent("CLERK_WEBHOOK_SECRET"),
    stripe: envPresent("STRIPE_SECRET_KEY"),
    stripeWebhook: envPresent("STRIPE_WEBHOOK_SECRET"),
    encryption: envPresent("ENCRYPTION_KEY"),
    openai: envPresent("OPENAI_API_KEY"),
    githubWebhook: envPresent("GITHUB_WEBHOOK_SECRET"),
  };

  let databasePool: { total: number; active: number; idle: number } | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";

    // Get pool statistics for monitoring
    try {
      const adapter = prisma as unknown as {
        $adapter?: {
          $pool?: {
            totalCount?: () => number;
            idleCount?: () => number;
            waitingCount?: () => number;
          };
        };
      };
      const pool = adapter.$adapter?.$pool;
      if (pool) {
        databasePool = {
          total: typeof pool.totalCount === "function" ? pool.totalCount() : 0,
          active: typeof pool.totalCount === "function" ? pool.totalCount() - (typeof pool.idleCount === "function" ? pool.idleCount() : 0) : 0,
          idle: typeof pool.idleCount === "function" ? pool.idleCount() : 0,
        };
      }
    } catch {
      // Pool stats not available, continue without them
    }
  } catch {
    checks.database = "error";
  }

  if (checks.encryption === "skipped") {
    checks.encryption = "warning" as HealthCheckStatus;
  }

  const criticalOk = checks.database === "ok";
  const hasWarnings = Object.values(checks).some((s) => s === "warning");

  return {
    status: !criticalOk ? "unhealthy" : hasWarnings ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    checks,
    databasePool,
  };
}

export async function getLatestMigration(): Promise<{
  name: string | null;
  appliedAt: string | null;
}> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ migration_name: string; finished_at: Date | null }>
    >`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { name: null, appliedAt: null };
    return {
      name: row.migration_name,
      appliedAt: row.finished_at?.toISOString() ?? null,
    };
  } catch {
    return { name: null, appliedAt: null };
  }
}
