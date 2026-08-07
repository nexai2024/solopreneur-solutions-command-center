import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Bump when schema adds fields/models so stale Next.js singletons are discarded. */
const PRISMA_SCHEMA_EPOCH = 2;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

type PrismaDelegates = PrismaClient & {
  buildRelease?: { findMany?: unknown };
  growthWeeklyPlan?: { findMany?: unknown };
  launchPlaybookProgress?: { findMany?: unknown };
};

/** Recreate when schema adds models the hot-reloaded singleton doesn't know about. */
function isPrismaClientReady(client: PrismaClient): boolean {
  const c = client as PrismaDelegates;
  return (
    typeof c.buildRelease?.findMany === "function" &&
    typeof c.growthWeeklyPlan?.findMany === "function" &&
    typeof c.launchPlaybookProgress?.findMany === "function"
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
