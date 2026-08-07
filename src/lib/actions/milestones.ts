"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  generateProjectStarterMilestones,
  milestoneTargetDate,
} from "@/lib/ai/project/starter-milestones";
import { revalidatePath } from "next/cache";

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

async function assertMilestoneAccess(milestoneId: string, userId: string) {
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, project: { userId } },
  });
  if (!milestone) throw new Error("Milestone not found");
  return milestone;
}

export async function createStarterMilestonesForProject(
  projectId: string,
  projectTitle: string,
  projectDescription: string,
  aiScore?: number | null
) {
  await assertProjectAccess(projectId, (await requireAuth()).id);

  const existing = await prisma.milestone.count({ where: { projectId } });
  if (existing > 0) return { created: 0 };

  const generated = await generateProjectStarterMilestones({
    projectTitle,
    projectDescription,
    aiScore,
  });

  const start = new Date();

  await prisma.milestone.createMany({
    data: generated.map((milestone) => ({
      projectId,
      title: milestone.title,
      targetDate: milestoneTargetDate(milestone.daysFromNow, start),
      isCompleted: false,
    })),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/build-tracker");
  return { created: generated.length };
}

export async function toggleMilestoneComplete(
  milestoneId: string,
  isCompleted: boolean
) {
  const user = await requireAuth();
  await assertMilestoneAccess(milestoneId, user.id);

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { isCompleted },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/build-tracker");
}

export async function deleteMilestone(milestoneId: string) {
  const user = await requireAuth();
  await assertMilestoneAccess(milestoneId, user.id);
  await prisma.milestone.delete({ where: { id: milestoneId } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/build-tracker");
}
