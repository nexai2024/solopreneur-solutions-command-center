"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";
import {
  isFeatureCategory,
  isFeatureStatus,
  priorityForFeatureCategory,
  type FeatureCategory,
  type FeatureStatus,
} from "@/lib/project-features";
import { broadcastEvent } from "@/lib/realtime";

export type ProjectFeatureDTO = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: FeatureCategory;
  status: FeatureStatus;
  sort_order: number;
  task_count: number;
  created_at: string;
  updated_at: string;
};

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

function toDTO(row: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tasks: number };
}): ProjectFeatureDTO {
  return {
    id: row.id,
    project_id: row.projectId,
    title: row.title,
    description: row.description,
    category: (isFeatureCategory(row.category) ? row.category : "MVP") as FeatureCategory,
    status: (isFeatureStatus(row.status) ? row.status : "todo") as FeatureStatus,
    sort_order: row.sortOrder,
    task_count: row._count?.tasks ?? 0,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listProjectFeatures(
  projectId: string
): Promise<ProjectFeatureDTO[]> {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const rows = await prisma.projectFeature.findMany({
    where: { projectId },
    include: { _count: { select: { tasks: true } } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toDTO);
}

export async function createProjectFeature(input: {
  projectId: string;
  title: string;
  description?: string;
  category?: string;
  createTask?: boolean;
}): Promise<{ feature: ProjectFeatureDTO; taskId: string | null }> {
  const user = await requireAuth();
  await assertProjectOwner(input.projectId, user.id);

  const title = input.title.trim();
  if (!title) throw new Error("Feature title is required");

  const category: FeatureCategory = isFeatureCategory(input.category ?? "")
    ? (input.category as FeatureCategory)
    : "MVP";

  const maxOrder = await prisma.projectFeature.aggregate({
    where: { projectId: input.projectId, category },
    _max: { sortOrder: true },
  });

  const createTask = input.createTask !== false;

  const result = await prisma.$transaction(async (tx) => {
    const feature = await tx.projectFeature.create({
      data: {
        projectId: input.projectId,
        title: title.slice(0, 200),
        description: input.description?.trim() || null,
        category,
        status: "todo",
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    let taskId: string | null = null;
    if (createTask) {
      const maxTaskOrder = await tx.task.aggregate({
        where: { projectId: input.projectId, status: "todo" },
        _max: { order: true },
      });
      const task = await tx.task.create({
        data: {
          projectId: input.projectId,
          featureId: feature.id,
          title: `Feature: ${feature.title}`.slice(0, 200),
          description:
            feature.description ||
            `Implement “${feature.title}” (${category}).`,
          status: "todo",
          priority: priorityForFeatureCategory(category),
          labels: ["feature", category] as Prisma.InputJsonValue,
          order: (maxTaskOrder._max.order ?? -1) + 1,
        },
      });
      taskId = task.id;
    }

    return { feature, taskId };
  });

  broadcastEvent(
    "task.created",
    {
      projectId: input.projectId,
      featureId: result.feature.id,
      taskId: result.taskId,
    },
    user.id
  );

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");

  const withCount = await prisma.projectFeature.findUniqueOrThrow({
    where: { id: result.feature.id },
    include: { _count: { select: { tasks: true } } },
  });

  return { feature: toDTO(withCount), taskId: result.taskId };
}

export async function updateProjectFeature(
  featureId: string,
  input: {
    title?: string;
    description?: string | null;
    category?: string;
    status?: string;
  }
): Promise<ProjectFeatureDTO> {
  const user = await requireAuth();
  const existing = await prisma.projectFeature.findFirst({
    where: { id: featureId, project: { userId: user.id } },
  });
  if (!existing) throw new Error("Feature not found");

  const updated = await prisma.projectFeature.update({
    where: { id: featureId },
    data: {
      ...(input.title !== undefined
        ? { title: input.title.trim().slice(0, 200) }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.category !== undefined && isFeatureCategory(input.category)
        ? { category: input.category }
        : {}),
      ...(input.status !== undefined && isFeatureStatus(input.status)
        ? { status: input.status }
        : {}),
    },
    include: { _count: { select: { tasks: true } } },
  });

  revalidatePath("/dashboard/build-tracker");
  return toDTO(updated);
}

export async function deleteProjectFeature(featureId: string): Promise<void> {
  const user = await requireAuth();
  const existing = await prisma.projectFeature.findFirst({
    where: { id: featureId, project: { userId: user.id } },
  });
  if (!existing) throw new Error("Feature not found");

  await prisma.projectFeature.delete({ where: { id: featureId } });
  revalidatePath("/dashboard/build-tracker");
}
