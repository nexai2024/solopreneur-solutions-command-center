import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Bump when schema adds fields/models so stale Next.js singletons are discarded. */
const PRISMA_SCHEMA_EPOCH = 6;

/**
 * PostgreSQL connection pool configuration
 * These settings optimize connection pooling for production workloads
 */
const POOL_CONFIG: pg.PoolConfig = {
  // Maximum number of connections in the pool
  // Default: 10, adjust based on production needs
  max: Number(process.env.PRISMA_POOL_SIZE ?? 10),
  // Connection timeout in milliseconds
  connectionTimeoutMillis: Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? 10000),
  // Idle timeout before releasing a connection
  idleTimeoutMillis: Number(process.env.PRISMA_IDLE_TIMEOUT_MS ?? 30000),
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create a pg Pool with configured settings
  const pool = new pg.Pool({
    connectionString,
    ...POOL_CONFIG,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    // Disable query logging in production (enable in dev for debugging)
    log: process.env.NODE_ENV !== "production"
      ? ["query", "info", "warn", "error"]
      : ["error"],
  });
}

type PrismaDelegates = PrismaClient & {
  buildRelease?: { findMany?: unknown };
  growthWeeklyPlan?: { findMany?: unknown };
  launchPlaybookProgress?: { findMany?: unknown };
  campaignAsset?: { findMany?: unknown };
  projectArtifact?: { findMany?: unknown };
  projectFeature?: { findMany?: unknown };
};

/** Recreate when schema adds models the hot-reloaded singleton doesn't know about. */
function isPrismaClientReady(client: PrismaClient): boolean {
  const c = client as PrismaDelegates;
  return (
    typeof c.buildRelease?.findMany === "function" &&
    typeof c.growthWeeklyPlan?.findMany === "function" &&
    typeof c.launchPlaybookProgress?.findMany === "function" &&
    typeof c.campaignAsset?.findMany === "function" &&
    typeof c.projectArtifact?.findMany === "function" &&
    typeof c.projectFeature?.findMany === "function"
  );
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientReady(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

// Force module re-eval after schema epoch changes (dev hot reload).
void PRISMA_SCHEMA_EPOCH;

function createPrismaProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = getPrismaClient();
      const value = Reflect.get(client, prop, receiver);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

/** Always resolves through readiness check — survives schema pushes without full restart. */
export const prisma = createPrismaProxy();

/**
 * Get current pool statistics (for monitoring/health checks)
 */
export async function getPoolStats(): Promise<{
  connections: number;
  active: number;
  idle: number;
  pending: number;
}> {
  const adapter = prisma as unknown as { $adapter?: { $pool?: { statistics: () => Record<string, number> } } };
  const pool = adapter.$adapter?.$pool;
  if (pool && typeof pool.statistics === "function") {
    const stats = pool.statistics();
    return {
      connections: stats.connections ?? 0,
      active: stats.active ?? 0,
      idle: stats.idle ?? 0,
      pending: stats.pending ?? 0,
    };
  }
  return { connections: 0, active: 0, idle: 0, pending: 0 };
}
