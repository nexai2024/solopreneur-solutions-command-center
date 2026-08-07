"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";

export async function exportUserData() {
  const authUser = await requireAuth();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });

  const [
    projects,
    ideas,
    leads,
    brainstormSessions,
    transactions,
    subscriptions,
    campaigns,
  ] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id } }),
    prisma.idea.findMany({ where: { userId: user.id } }),
    prisma.lead.findMany({ where: { userId: user.id } }),
    prisma.brainstormSession.findMany({
      where: { userId: user.id },
      include: { nodes: true, copilotMessages: true },
    }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.revenueSubscription.findMany({ where: { userId: user.id } }),
    prisma.marketingCampaign.findMany({ where: { userId: user.id } }),
  ]);

  logger.info("GDPR data export", { userId: user.id });

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
    },
    projects,
    ideas,
    leads,
    brainstormSessions,
    transactions,
    subscriptions,
    campaigns,
  };
}

export async function deleteUserAccount() {
  const user = await requireAuth();
  const { userId: clerkId } = await auth();

  await prisma.user.delete({ where: { id: user.id } });

  logger.info("GDPR account deletion", { userId: user.id, clerkId });

  return { deleted: true, clerkId };
}
