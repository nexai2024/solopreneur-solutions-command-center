"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  generateProjectStarterPlan,
} from "@/lib/ai/project/starter-plan";
import { milestoneTargetDate } from "@/lib/ai/project/starter-milestones";
import { parseAiPriority } from "@/lib/task-types";
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

function revalidateMilestonePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/build-tracker");
}

/**
 * Mark a milestone complete iff every linked task is done.
 * Milestones with zero linked tasks are left unchanged (manual only).
 */
export async function syncMilestoneCompletion(
  milestoneId: string
): Promise<{ isCompleted: boolean; linkedTasks: number; doneTasks: number }> {
  const tasks = await prisma.task.findMany({
    where: { milestoneId },
    select: { status: true },
  });

  if (tasks.length === 0) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { isCompleted: true },
    });
    return {
      isCompleted: milestone?.isCompleted ?? false,
      linkedTasks: 0,
      doneTasks: 0,
    };
  }

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const isCompleted = doneTasks === tasks.length;

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { isCompleted },
  });

  return { isCompleted, linkedTasks: tasks.length, doneTasks };
}

export async function syncMilestonesForProject(projectId: string) {
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    select: { id: true },
  });
  for (const m of milestones) {
    await syncMilestoneCompletion(m.id);
  }
}

/**
 * Create linked milestones + tasks. Completing all tasks under a milestone
 * marks that milestone complete.
 */
export async function createStarterPackForProject(
  projectId: string,
  projectTitle: string,
  projectDescription: string,
  opts?: { ideaId?: string; aiScore?: number | null }
) {
  await assertProjectAccess(projectId, (await requireAuth()).id);

  const [existingTasks, existingMilestones] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.milestone.count({ where: { projectId } }),
  ]);

  if (existingTasks > 0 || existingMilestones > 0) {
    // Backfill links for projects created before milestone↔task wiring
    if (existingTasks > 0 && existingMilestones > 0) {
      const linked = await backfillTaskMilestoneLinks(projectId);
      return {
        created: 0,
        milestonesCreated: 0,
        tasksCreated: 0,
        linked,
      };
    }
    return { created: 0, milestonesCreated: 0, tasksCreated: 0, linked: 0 };
  }

  const plan = await generateProjectStarterPlan({
    projectTitle,
    projectDescription,
    aiScore: opts?.aiScore,
  });

  const start = new Date();
  let tasksCreated = 0;
  let order = 0;

  for (const item of plan) {
    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: item.title,
        targetDate: milestoneTargetDate(item.daysFromNow, start),
        isCompleted: false,
      },
    });

    for (const task of item.tasks) {
      await prisma.task.create({
        data: {
          projectId,
          milestoneId: milestone.id,
          ideaId: opts?.ideaId ?? null,
          title: task.title,
          description: task.description,
          status: "todo",
          priority: parseAiPriority(task.priority),
          estimatedHours: task.estimatedHours,
          order: order++,
        },
      });
      tasksCreated += 1;
    }
  }

  revalidateMilestonePaths();
  return {
    created: plan.length,
    milestonesCreated: plan.length,
    tasksCreated,
    linked: tasksCreated,
  };
}

/**
 * Evenly assign unlinked tasks to milestones (by target date order).
 * Used for projects created before the link existed.
 */
export async function backfillTaskMilestoneLinks(
  projectId: string,
  opts?: { revalidate?: boolean }
): Promise<number> {
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { targetDate: "asc" },
    select: { id: true },
  });
  if (milestones.length === 0) return 0;

  const unlinked = await prisma.task.findMany({
    where: { projectId, milestoneId: null },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (unlinked.length === 0) {
    await syncMilestonesForProject(projectId);
    return 0;
  }

  let linked = 0;
  for (let i = 0; i < unlinked.length; i++) {
    const milestone = milestones[i % milestones.length]!;
    await prisma.task.update({
      where: { id: unlinked[i]!.id },
      data: { milestoneId: milestone.id },
    });
    linked += 1;
  }

  await syncMilestonesForProject(projectId);
  if (opts?.revalidate !== false) {
    revalidateMilestonePaths();
  }
  return linked;
}

/** @deprecated Prefer createStarterPackForProject — kept for callers that only want milestones. */
export async function createStarterMilestonesForProject(
  projectId: string,
  projectTitle: string,
  projectDescription: string,
  aiScore?: number | null
) {
  const result = await createStarterPackForProject(
    projectId,
    projectTitle,
    projectDescription,
    { aiScore }
  );
  return { created: result.milestonesCreated };
}

export async function toggleMilestoneComplete(
  milestoneId: string,
  isCompleted: boolean
) {
  const user = await requireAuth();
  const milestone = await assertMilestoneAccess(milestoneId, user.id);

  const linkedCount = await prisma.task.count({
    where: { milestoneId },
  });

  // If tasks are linked, completion is driven by tasks — still allow manual
  // override, and when marking complete also mark remaining tasks done.
  if (linkedCount > 0 && isCompleted) {
    await prisma.task.updateMany({
      where: { milestoneId, status: { not: "done" } },
      data: { status: "done", completedAt: new Date() },
    });
  }

  if (linkedCount > 0 && !isCompleted) {
    // Reopening a milestone reopens incomplete work: leave done tasks alone,
    // but clear auto-complete so progress reflects remaining tasks.
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { isCompleted: false },
    });
    revalidateMilestonePaths();
    return { isCompleted: false };
  }

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { isCompleted },
  });

  revalidateMilestonePaths();
  return { isCompleted };
}

export async function deleteMilestone(milestoneId: string) {
  const user = await requireAuth();
  await assertMilestoneAccess(milestoneId, user.id);
  await prisma.milestone.delete({ where: { id: milestoneId } });
  revalidateMilestonePaths();
}
