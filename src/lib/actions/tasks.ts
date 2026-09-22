"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateProjectStarterTasks } from "@/lib/ai/project/starter-tasks";
import { appendAiNote } from "@/lib/actions/project-profile";
import {
  backfillTaskMilestoneLinks,
  syncMilestoneCompletion,
} from "@/lib/actions/milestones";
import { revalidatePath } from "next/cache";
import { broadcastEvent } from "@/lib/realtime";
import type { Prisma } from "../../../generated/prisma/client";
import {
  type BoardTask,
  type ChecklistItem,
  type TaskPriority,
  type TaskStatus,
  TASK_PRIORITIES,
  TASK_STATUSES,
  parseAiPriority,
  toBoardTask,
} from "@/lib/task-types";

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId } },
    include: { project: true },
  });
  if (!task) throw new Error("Task not found");
  return task;
}


export async function getProjectsWithTasks() {
  const user = await requireAuth();

  const load = () =>
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: { orderBy: [{ status: "asc" }, { order: "asc" }] },
        milestones: { orderBy: { targetDate: "asc" } },
        ideas: { select: { id: true, title: true, aiScore: true, status: true } },
        leads: { select: { id: true, title: true, status: true }, take: 3 },
        githubConnection: true,
        _count: {
          select: { tasks: true, milestones: true, ideas: true, leads: true },
        },
      },
    });

  let projects = await load();

  let didBackfill = false;
  for (const project of projects) {
    const hasUnlinked =
      project.milestones.length > 0 &&
      project.tasks.some((t) => !t.milestoneId);
    if (hasUnlinked) {
      await backfillTaskMilestoneLinks(project.id, { revalidate: false });
      didBackfill = true;
    }
  }

  if (didBackfill) {
    projects = await load();
  }

  return projects.map((project) => ({
    ...project,
    tasks: project.tasks.map(toBoardTask),
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      targetDate: m.targetDate.toISOString(),
      isCompleted: m.isCompleted,
    })),
  }));
}

export async function getTaskById(taskId: string): Promise<BoardTask | null> {
  const user = await requireAuth();
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId: user.id } },
  });
  return task ? toBoardTask(task) : null;
}

export async function createStarterTasksForProject(
  projectId: string,
  projectTitle: string,
  projectDescription: string,
  ideaId?: string
) {
  // Prefer linked pack (milestones + tasks). No-op if pack already exists.
  const { createStarterPackForProject } = await import(
    "@/lib/actions/milestones"
  );
  const pack = await createStarterPackForProject(
    projectId,
    projectTitle,
    projectDescription,
    { ideaId }
  );
  return { created: pack.tasksCreated };
}

export async function generateTasksForProject(projectId: string) {
  const user = await requireAuth();
  const project = await assertProjectAccess(projectId, user.id);

  const generated = await generateProjectStarterTasks({
    projectTitle: project.name,
    projectDescription: project.description ?? "",
  });

  const maxOrder = await prisma.task.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  const startOrder = (maxOrder._max.order ?? -1) + 1;

  await prisma.task.createMany({
    data: generated.map((task, index) => ({
      projectId,
      title: task.title,
      description: task.description,
      status: "todo",
      priority: parseAiPriority(task.priority),
      estimatedHours: task.estimatedHours,
      order: startOrder + index,
    })),
  });

  const taskTitles = generated.map((t) => t.title).join(", ");
  await appendAiNote(
    projectId,
    `Generated ${generated.length} starter tasks: ${taskTitles}`
  );

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
  return { created: generated.length };
}

export async function createTask(
  projectId: string,
  input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    estimatedHours?: number;
    labels?: string[];
    milestoneId?: string | null;
  }
) {
  const user = await requireAuth();
  await assertProjectAccess(projectId, user.id);

  if (!input.title.trim()) throw new Error("Title is required");
  if (input.priority && !TASK_PRIORITIES.includes(input.priority)) {
    throw new Error("Invalid priority");
  }

  if (input.milestoneId) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: input.milestoneId, projectId },
    });
    if (!milestone) throw new Error("Milestone not found");
  }

  const maxOrder = await prisma.task.aggregate({
    where: { projectId, status: "todo" },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      projectId,
      milestoneId: input.milestoneId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: "todo",
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      estimatedHours: input.estimatedHours ?? null,
      labels: input.labels?.length ? input.labels : undefined,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  if (task.milestoneId) {
    await syncMilestoneCompletion(task.milestoneId);
  }

  // Broadcast real-time event
  broadcastEvent(
    "task.created",
    {
      taskId: task.id,
      projectId,
      title: task.title,
      status: task.status,
    },
    user.id
  );

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
  return toBoardTask(task);
}

export async function updateTask(
  taskId: string,
  input: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    estimatedHours?: number | null;
    labels?: string[];
    checklist?: ChecklistItem[];
    milestoneId?: string | null;
  }
) {
  const user = await requireAuth();
  const existing = await assertTaskAccess(taskId, user.id);

  if (input.status && !TASK_STATUSES.includes(input.status)) {
    throw new Error("Invalid status");
  }
  if (input.priority && !TASK_PRIORITIES.includes(input.priority)) {
    throw new Error("Invalid priority");
  }

  if (input.milestoneId) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: input.milestoneId, projectId: existing.projectId },
    });
    if (!milestone) throw new Error("Milestone not found");
  }

  const nextStatus = input.status ?? normalizeStatus(existing.status);
  const completedAt =
    nextStatus === "done" && existing.status !== "done"
      ? new Date()
      : nextStatus !== "done"
        ? null
        : existing.completedAt;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && {
        description: input.description.trim() || null,
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.estimatedHours !== undefined && {
        estimatedHours: input.estimatedHours,
      }),
      ...(input.labels !== undefined && { labels: input.labels }),
      ...(input.checklist !== undefined && {
        checklist: input.checklist as unknown as Prisma.InputJsonValue,
      }),
      ...(input.milestoneId !== undefined && {
        milestoneId: input.milestoneId,
      }),
      completedAt,
    },
  });

  const milestoneIds = new Set<string>();
  if (existing.milestoneId) milestoneIds.add(existing.milestoneId);
  if (task.milestoneId) milestoneIds.add(task.milestoneId);
  for (const id of milestoneIds) {
    await syncMilestoneCompletion(id);
  }

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
  return toBoardTask(task);
}

function normalizeStatus(value: string): TaskStatus {
  if (value === "in-progress" || value === "done") return value;
  return "todo";
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  return updateTask(taskId, { status });
}

export async function reorderTasks(
  projectId: string,
  updates: Array<{ id: string; status: TaskStatus; order: number }>
) {
  const user = await requireAuth();
  await assertProjectAccess(projectId, user.id);

  const affected = await prisma.task.findMany({
    where: { id: { in: updates.map((u) => u.id) }, projectId },
    select: { id: true, status: true, milestoneId: true, completedAt: true },
  });
  const byId = new Map(affected.map((t) => [t.id, t]));

  await prisma.$transaction(
    updates.map((item) => {
      const prev = byId.get(item.id);
      const completedAt =
        item.status === "done" && prev?.status !== "done"
          ? new Date()
          : item.status !== "done"
            ? null
            : prev?.completedAt ?? null;
      return prisma.task.update({
        where: { id: item.id },
        data: { status: item.status, order: item.order, completedAt },
      });
    })
  );

  const milestoneIds = new Set(
    affected.map((t) => t.milestoneId).filter((id): id is string => Boolean(id))
  );
  for (const id of milestoneIds) {
    await syncMilestoneCompletion(id);
  }

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const user = await requireAuth();
  const task = await assertTaskAccess(taskId, user.id);
  const milestoneId = task.milestoneId;
  await prisma.task.delete({ where: { id: taskId } });
  if (milestoneId) {
    await syncMilestoneCompletion(milestoneId);
  }
  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
}

export async function duplicateTask(taskId: string): Promise<BoardTask> {
  const user = await requireAuth();
  const source = await assertTaskAccess(taskId, user.id);

  const maxOrder = await prisma.task.aggregate({
    where: { projectId: source.projectId, status: "todo" },
    _max: { order: true },
  });

  const copy = await prisma.task.create({
    data: {
      projectId: source.projectId,
      milestoneId: source.milestoneId,
      ideaId: source.ideaId,
      title: `${source.title} (copy)`,
      description: source.description,
      status: "todo",
      priority: source.priority,
      dueDate: source.dueDate,
      estimatedHours: source.estimatedHours,
      labels: source.labels ?? undefined,
      checklist: source.checklist ?? undefined,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  if (copy.milestoneId) {
    await syncMilestoneCompletion(copy.milestoneId);
  }

  revalidatePath("/dashboard/build-tracker");
  return toBoardTask(copy);
}
