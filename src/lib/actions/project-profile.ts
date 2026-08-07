"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export type ProjectProfileDTO = {
  currentVersion: string | null;
  productionUrl: string | null;
  hostingProvider: string | null;
  techStack: string[];
  toolsUsed: string[];
  devNotes: string | null;
  aiNotes: string | null;
  vercelConnection: {
    vercelProjectId: string;
    vercelProjectName: string | null;
    vercelTeamId: string | null;
    productionDomain: string | null;
    framework: string | null;
    nodeVersion: string | null;
    lastSyncedAt: string | null;
  } | null;
  envVars: Array<{
    id: string;
    key: string;
    environment: string;
    isSecret: boolean;
    source: string;
    hasValue: boolean;
    displayValue: string | null;
  }>;
  deployments: Array<{
    id: string;
    url: string;
    environment: string;
    status: string;
    version: string | null;
    commitSha: string | null;
    commitMessage: string | null;
    branch: string | null;
    deployedAt: string | null;
    vercelDeploymentId: string | null;
  }>;
};

export async function getProjectProfile(projectId: string): Promise<ProjectProfileDTO> {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      vercelConnection: true,
      envVars: { orderBy: [{ environment: "asc" }, { key: "asc" }] },
      deployments: { orderBy: { deployedAt: "desc" }, take: 30 },
    },
  });

  return {
    currentVersion: project.currentVersion,
    productionUrl: project.productionUrl,
    hostingProvider: project.hostingProvider,
    techStack: parseStringArray(project.techStack),
    toolsUsed: parseStringArray(project.toolsUsed),
    devNotes: project.devNotes,
    aiNotes: project.aiNotes,
    vercelConnection: project.vercelConnection
      ? {
          vercelProjectId: project.vercelConnection.vercelProjectId,
          vercelProjectName: project.vercelConnection.vercelProjectName,
          vercelTeamId: project.vercelConnection.vercelTeamId,
          productionDomain: project.vercelConnection.productionDomain,
          framework: project.vercelConnection.framework,
          nodeVersion: project.vercelConnection.nodeVersion,
          lastSyncedAt: project.vercelConnection.lastSyncedAt?.toISOString() ?? null,
        }
      : null,
    envVars: project.envVars.map((env) => ({
      id: env.id,
      key: env.key,
      environment: env.environment,
      isSecret: env.isSecret,
      source: env.source,
      hasValue: !!env.valueEncrypted,
      displayValue:
        env.isSecret || !env.valueEncrypted
          ? null
          : decrypt(env.valueEncrypted),
    })),
    deployments: project.deployments.map((d) => ({
      id: d.id,
      url: d.url,
      environment: d.environment,
      status: d.status,
      version: d.version,
      commitSha: d.commitSha,
      commitMessage: d.commitMessage,
      branch: d.branch,
      deployedAt: d.deployedAt?.toISOString() ?? null,
      vercelDeploymentId: d.vercelDeploymentId,
    })),
  };
}

export async function updateProjectProfile(
  projectId: string,
  data: {
    currentVersion?: string;
    productionUrl?: string;
    hostingProvider?: string;
    techStack?: string[];
    toolsUsed?: string[];
    devNotes?: string;
    aiNotes?: string;
  }
) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.currentVersion !== undefined && { currentVersion: data.currentVersion || null }),
      ...(data.productionUrl !== undefined && { productionUrl: data.productionUrl || null }),
      ...(data.hostingProvider !== undefined && { hostingProvider: data.hostingProvider || null }),
      ...(data.techStack !== undefined && { techStack: data.techStack }),
      ...(data.toolsUsed !== undefined && { toolsUsed: data.toolsUsed }),
      ...(data.devNotes !== undefined && { devNotes: data.devNotes || null }),
      ...(data.aiNotes !== undefined && { aiNotes: data.aiNotes || null }),
    },
  });

  revalidatePath("/dashboard/build-tracker");
}

export async function upsertProjectEnvVar(
  projectId: string,
  input: {
    id?: string;
    key: string;
    value?: string;
    environment: string;
    isSecret?: boolean;
  }
) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const key = input.key.trim();
  if (!key) throw new Error("Key is required");

  const valueEncrypted =
    input.value !== undefined && input.value !== ""
      ? encrypt(input.value)
      : undefined;

  if (input.id) {
    await prisma.projectEnvVar.updateMany({
      where: { id: input.id, projectId },
      data: {
        key,
        environment: input.environment,
        isSecret: input.isSecret ?? true,
        ...(valueEncrypted !== undefined ? { valueEncrypted } : {}),
      },
    });
  } else {
    await prisma.projectEnvVar.create({
      data: {
        projectId,
        key,
        environment: input.environment,
        isSecret: input.isSecret ?? true,
        source: "manual",
        valueEncrypted: valueEncrypted ?? null,
      },
    });
  }

  revalidatePath("/dashboard/build-tracker");
}

export async function deleteProjectEnvVar(projectId: string, envVarId: string) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  await prisma.projectEnvVar.deleteMany({
    where: { id: envVarId, projectId },
  });

  revalidatePath("/dashboard/build-tracker");
}

export async function appendAiNote(projectId: string, note: string) {
  const user = await requireAuth();
  const project = await assertProjectOwner(projectId, user.id);

  const trimmed = note.trim();
  if (!trimmed) return;

  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const entry = `[${timestamp}] ${trimmed}`;
  const next = project.aiNotes ? `${project.aiNotes}\n\n${entry}` : entry;

  await prisma.project.update({
    where: { id: projectId },
    data: { aiNotes: next },
  });

  revalidatePath("/dashboard/build-tracker");
}
