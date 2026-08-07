"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { runHealthChecks, getLatestMigration } from "@/lib/health";
import { getRateLimitUsage } from "@/lib/rate-limit";
import {
  PLAN_LIMITS,
  aiRateLimitForUser,
  resolvePlanTier,
  type PlanTier,
} from "@/lib/plan-limits";

export type ProductionReadinessDTO = {
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<string, "ok" | "error" | "skipped" | "warning">;
    timestamp: string;
  };
  migration: {
    name: string | null;
    appliedAt: string | null;
  };
  webhooks: {
    stripe: { eventType: string; receivedAt: string } | null;
    github: { eventType: string; receivedAt: string; status: string } | null;
  };
  plan: {
    tier: PlanTier;
    ai: { used: number; remaining: number; limit: number; resetsAt: string | null };
    leads: { used: number; limit: number };
    projects: { used: number; limit: number };
  };
};

export async function getProductionReadiness(): Promise<ProductionReadinessDTO> {
  const user = await requireAuth();
  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const tier = resolvePlanTier(fullUser.subscriptionStatus);
  const limits = PLAN_LIMITS[tier];
  const aiLimit = aiRateLimitForUser(fullUser.subscriptionStatus);
  const aiWindowMs = 60 * 60 * 1000;

  const [
    health,
    migration,
    latestStripe,
    latestGithub,
    leadCount,
    projectCount,
  ] = await Promise.all([
    runHealthChecks(),
    getLatestMigration(),
    prisma.stripeWebhookEvent.findFirst({
      orderBy: { processedAt: "desc" },
      select: { eventType: true, processedAt: true },
    }),
    (async () => {
      const projectIds = (
        await prisma.project.findMany({
          where: { userId: user.id },
          select: { id: true },
        })
      ).map((p) => p.id);
      if (projectIds.length === 0) return null;
      return prisma.repoWebhookDelivery.findFirst({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: "desc" },
        select: { eventType: true, createdAt: true, status: true },
      });
    })(),
    prisma.lead.count({ where: { userId: user.id } }),
    prisma.project.count({ where: { userId: user.id } }),
  ]);

  const aiUsage = getRateLimitUsage(`ai:${user.id}`, {
    limit: aiLimit,
    windowMs: aiWindowMs,
  });

  return {
    health: {
      status: health.status,
      checks: health.checks,
      timestamp: health.timestamp,
    },
    migration,
    webhooks: {
      stripe: latestStripe
        ? {
            eventType: latestStripe.eventType,
            receivedAt: latestStripe.processedAt.toISOString(),
          }
        : null,
      github: latestGithub
        ? {
            eventType: latestGithub.eventType,
            receivedAt: latestGithub.createdAt.toISOString(),
            status: latestGithub.status,
          }
        : null,
    },
    plan: {
      tier,
      ai: {
        used: aiUsage.used,
        remaining: aiUsage.remaining,
        limit: aiUsage.limit,
        resetsAt: aiUsage.resetAt,
      },
      leads: { used: leadCount, limit: limits.maxLeads },
      projects: { used: projectCount, limit: limits.maxProjects },
    },
  };
}
