"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";
import {
  defaultFormatForKind,
  isArtifactFormat,
  isArtifactKind,
  type ArtifactFormat,
  type ArtifactKind,
} from "@/lib/project-artifacts";

export type ProjectArtifactDTO = {
  id: string;
  project_id: string;
  title: string;
  kind: ArtifactKind;
  format: ArtifactFormat;
  body: string | null;
  url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  file_name: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  sort_order: number;
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

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

function toDTO(row: {
  id: string;
  projectId: string;
  title: string;
  kind: string;
  format: string;
  body: string | null;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  fileName: string | null;
  tags: unknown;
  metadata: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): ProjectArtifactDTO {
  return {
    id: row.id,
    project_id: row.projectId,
    title: row.title,
    kind: (isArtifactKind(row.kind) ? row.kind : "other") as ArtifactKind,
    format: (isArtifactFormat(row.format) ? row.format : "text") as ArtifactFormat,
    body: row.body,
    url: row.url,
    mime_type: row.mimeType,
    size_bytes: row.sizeBytes,
    file_name: row.fileName,
    tags: parseTags(row.tags),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    sort_order: row.sortOrder,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listProjectArtifacts(
  projectId: string
): Promise<ProjectArtifactDTO[]> {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const rows = await prisma.projectArtifact.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(toDTO);
}

export async function createProjectArtifact(input: {
  projectId: string;
  title: string;
  kind: string;
  format?: string;
  body?: string | null;
  url?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileName?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<ProjectArtifactDTO> {
  const user = await requireAuth();
  await assertProjectOwner(input.projectId, user.id);

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const kind: ArtifactKind = isArtifactKind(input.kind) ? input.kind : "other";
  const format: ArtifactFormat = isArtifactFormat(input.format ?? "")
    ? (input.format as ArtifactFormat)
    : defaultFormatForKind(kind);

  const body = input.body?.trim() || null;
  const url = input.url?.trim() || null;
  if (!body && !url) {
    throw new Error("Add text content or a URL / file");
  }

  const row = await prisma.projectArtifact.create({
    data: {
      projectId: input.projectId,
      userId: user.id,
      title: title.slice(0, 200),
      kind,
      format,
      body,
      url,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      fileName: input.fileName ?? null,
      tags: (input.tags ?? []) as Prisma.InputJsonValue,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/build-tracker");
  return toDTO(row);
}

export async function updateProjectArtifact(
  artifactId: string,
  data: {
    title?: string;
    kind?: string;
    format?: string;
    body?: string | null;
    url?: string | null;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<ProjectArtifactDTO> {
  const user = await requireAuth();
  const existing = await prisma.projectArtifact.findFirst({
    where: { id: artifactId, project: { userId: user.id } },
  });
  if (!existing) throw new Error("Artifact not found");

  const kind =
    data.kind !== undefined
      ? isArtifactKind(data.kind)
        ? data.kind
        : existing.kind
      : undefined;
  const format =
    data.format !== undefined
      ? isArtifactFormat(data.format)
        ? data.format
        : existing.format
      : undefined;

  const row = await prisma.projectArtifact.update({
    where: { id: artifactId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim().slice(0, 200) } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(format !== undefined ? { format } : {}),
      ...(data.body !== undefined ? { body: data.body?.trim() || null } : {}),
      ...(data.url !== undefined ? { url: data.url?.trim() || null } : {}),
      ...(data.tags !== undefined
        ? { tags: data.tags as Prisma.InputJsonValue }
        : {}),
      ...(data.metadata !== undefined
        ? { metadata: data.metadata as Prisma.InputJsonValue }
        : {}),
    },
  });

  revalidatePath("/dashboard/build-tracker");
  return toDTO(row);
}

export async function deleteProjectArtifact(artifactId: string): Promise<void> {
  const user = await requireAuth();
  const existing = await prisma.projectArtifact.findFirst({
    where: { id: artifactId, project: { userId: user.id } },
  });
  if (!existing) throw new Error("Artifact not found");

  await prisma.projectArtifact.delete({ where: { id: artifactId } });
  revalidatePath("/dashboard/build-tracker");
}

const AI_MESSAGING_KINDS = [
  "tagline",
  "short_description",
  "value_proposition",
  "feature_list",
  "long_description",
] as const;

type AiMessagingKind = (typeof AI_MESSAGING_KINDS)[number];

/**
 * Generate short desc, value prop, features (+ tagline / long desc) from project
 * context and save them as Project Artifacts in one shot.
 */
export async function generateAndSaveProjectArtifacts(projectId: string): Promise<{
  artifacts: ProjectArtifactDTO[];
  createdCount: number;
  updatedCount: number;
}> {
  const user = await requireAuth();
  const { assertAiRateLimit } = await import("@/lib/rate-limit");
  assertAiRateLimit(user.id);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      ideas: {
        where: { status: { not: "archived" } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          title: true,
          description: true,
          aiScore: true,
        },
      },
      artifacts: {
        where: { kind: { in: [...AI_MESSAGING_KINDS] } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!project) throw new Error("Project not found");

  const {
    generateMessagingArtifactPack,
    extractFeatureHints,
  } = await import("@/lib/ai/product/artifact-pack");

  const ideaBlurb = project.ideas
    .map((idea) => {
      const score =
        idea.aiScore != null ? ` (score ${Math.round(idea.aiScore)})` : "";
      return `• ${idea.title}${score}\n${idea.description}`;
    })
    .join("\n\n");

  const combinedDescription = [project.description, ideaBlurb]
    .filter(Boolean)
    .join("\n\n");

  const featureHints = [
    ...extractFeatureHints(project.description),
    ...project.ideas.flatMap((idea) => extractFeatureHints(idea.description)),
  ];

  // Prefer existing feature_list artifact bullets if present
  const existingFeatureArtifact = project.artifacts.find(
    (a) => a.kind === "feature_list" && a.body
  );
  if (existingFeatureArtifact?.body) {
    featureHints.push(...extractFeatureHints(existingFeatureArtifact.body));
  }

  const pack = await generateMessagingArtifactPack({
    projectTitle: project.name,
    projectDescription: combinedDescription || project.name,
    features: [...new Set(featureHints)].slice(0, 12),
  });

  const payloads: Array<{
    kind: AiMessagingKind;
    title: string;
    format: ArtifactFormat;
    body: string;
  }> = [
    {
      kind: "tagline",
      title: "Tagline",
      format: "text",
      body: pack.tagline,
    },
    {
      kind: "short_description",
      title: "Short description",
      format: "text",
      body: pack.shortDescription,
    },
    {
      kind: "value_proposition",
      title: "Value proposition",
      format: "text",
      body: pack.valueProposition,
    },
    {
      kind: "feature_list",
      title: "Feature list",
      format: "markdown",
      body: pack.featureList,
    },
    {
      kind: "long_description",
      title: "Long description",
      format: "markdown",
      body: pack.longDescription,
    },
  ];

  const saved: ProjectArtifactDTO[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of payloads) {
    const existing = project.artifacts.find((a) => {
      if (a.kind !== item.kind) return false;
      const meta =
        a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
          ? (a.metadata as Record<string, unknown>)
          : {};
      return meta.source === "ai_generate";
    });

    if (existing) {
      const row = await prisma.projectArtifact.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          format: item.format,
          body: item.body,
          metadata: {
            source: "ai_generate",
            generated_at: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      saved.push(toDTO(row));
      updatedCount += 1;
    } else {
      const row = await prisma.projectArtifact.create({
        data: {
          projectId,
          userId: user.id,
          title: item.title,
          kind: item.kind,
          format: item.format,
          body: item.body,
          tags: ["ai"],
          metadata: {
            source: "ai_generate",
            generated_at: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      saved.push(toDTO(row));
      createdCount += 1;
    }
  }

  revalidatePath("/dashboard/build-tracker");
  return { artifacts: saved, createdCount, updatedCount };
}
