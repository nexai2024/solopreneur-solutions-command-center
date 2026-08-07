"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateProjectStarterTasks } from "@/lib/ai/project/starter-tasks";
import { appendAiNote } from "@/lib/actions/project-profile";
import { revalidatePath } from "next/cache";
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
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      tasks: { orderBy: [{ status: "asc" }, { order: "asc" }] },
      milestones: { orderBy: { targetDate: "asc" } },
      ideas: { select: { id: true, title: true, aiScore: true, status: true } },
      leads: { select: { id: true, title: true, status: true }, take: 3 },
      githubConnection: true,
      _count: { select: { tasks: true, milestones: true, ideas: true, leads: true } },
    },
  });

  return projects.map((project) => ({
    ...project,
    tasks: project.tasks.map(toBoardTask),
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
  await assertProjectAccess(projectId, (await requireAuth()).id);

  const existing = await prisma.task.count({ where: { projectId } });
  if (existing > 0) return { created: 0 };

  const generated = await generateProjectStarterTasks({
    projectTitle,
    projectDescription,
  });

  await prisma.task.createMany({
    data: generated.map((task, index) => ({
      projectId,
      ideaId: ideaId ?? null,
      title: task.title,
      description: task.description,
      status: "todo",
      priority: parseAiPriority(task.priority),
      estimatedHours: task.estimatedHours,
      order: index,
    })),
  });

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
  return { created: generated.length };
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
  }
) {
  const user = await requireAuth();
  await assertProjectAccess(projectId, user.id);

  if (!input.title.trim()) throw new Error("Title is required");
  if (input.priority && !TASK_PRIORITIES.includes(input.priority)) {
    throw new Error("Invalid priority");
  }

  const maxOrder = await prisma.task.aggregate({
    where: { projectId, status: "todo" },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      projectId,
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
      completedAt,
    },
  });

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

  await prisma.$transaction(
    updates.map((item) =>
      prisma.task.update({
        where: { id: item.id },
        data: { status: item.status, order: item.order },
      })
    )
  );

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const user = await requireAuth();
  await assertTaskAccess(taskId, user.id);
  await prisma.task.delete({ where: { id: taskId } });
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

  revalidatePath("/dashboard/build-tracker");
  return toBoardTask(copy);
}
