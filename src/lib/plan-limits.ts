import { prisma } from "@/lib/prisma";

export type PlanTier = "free" | "pro" | "enterprise";

export const PLAN_LIMITS: Record<
  PlanTier,
  { aiCallsPerHour: number; maxLeads: number; maxProjects: number }
> = {
  free: { aiCallsPerHour: 15, maxLeads: 100, maxProjects: 3 },
  pro: { aiCallsPerHour: 60, maxLeads: 1000, maxProjects: 20 },
  enterprise: { aiCallsPerHour: 200, maxLeads: 10000, maxProjects: 100 },
};

export function resolvePlanTier(subscriptionStatus: string | null | undefined): PlanTier {
  if (subscriptionStatus === "pro" || subscriptionStatus === "active") return "pro";
  if (subscriptionStatus === "enterprise") return "enterprise";
  return "free";
}

export async function assertWithinPlanLimits(
  userId: string,
  check: "leads" | "projects"
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const tier = resolvePlanTier(user.subscriptionStatus);
  const limits = PLAN_LIMITS[tier];

  if (check === "leads") {
    const count = await prisma.lead.count({ where: { userId } });
    if (count >= limits.maxLeads) {
      throw new Error(
        `Lead limit reached (${limits.maxLeads} on ${tier} plan). Upgrade to add more.`
      );
    }
  }

  if (check === "projects") {
    const count = await prisma.project.count({ where: { userId } });
    if (count >= limits.maxProjects) {
      throw new Error(
        `Project limit reached (${limits.maxProjects} on ${tier} plan). Upgrade to add more.`
      );
    }
  }
}

export function aiRateLimitForUser(subscriptionStatus: string | null | undefined): number {
  return PLAN_LIMITS[resolvePlanTier(subscriptionStatus)].aiCallsPerHour;
}
