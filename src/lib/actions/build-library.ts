"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  canDeleteBuilds,
  canManageBuilds,
  canUpdatePipelineStatus,
  canUploadBuilds,
  getUserRole,
  type BuildPipelineStatus,
  type BuildPlatform,
  type ArtifactType,
} from "@/lib/build-rbac";
import { generateChangelogBetween } from "@/lib/github/changelog";

export type BuildReleaseDTO = {
  id: string;
  projectId: string;
  appName: string;
  platform: string;
  version: string;
  buildNumber: number;
  environment: string;
  pipelineStatus: string;
  branch: string | null;
  commitSha: string | null;
  commitUrl: string | null;
  releaseNotes: string | null;
  testingInstructions: string | null;
  knownIssues: string | null;
  previewUrl: string | null;
  buildDurationMs: number | null;
  artifactSizeBytes: string | null;
  previousSizeBytes: string | null;
  sizeDeltaPercent: number | null;
  testPassRate: number | null;
  testFailedCount: number | null;
  testTotalCount: number | null;
  source: string;
  ciProvider: string | null;
  createdAt: string;
  artifacts: Array<{
    id: string;
    name: string;
    artifactType: string;
    downloadUrl: string;
    sizeBytes: string | null;
  }>;
};

function toDTO(
  b: {
    id: string;
    projectId: string;
    appName: string;
    platform: string;
    version: string;
    buildNumber: number;
    environment: string;
    pipelineStatus: string;
    branch: string | null;
    commitSha: string | null;
    commitUrl: string | null;
    releaseNotes: string | null;
    testingInstructions: string | null;
    knownIssues: string | null;
    previewUrl: string | null;
    buildDurationMs: number | null;
    artifactSizeBytes: bigint | null;
    previousSizeBytes: bigint | null;
    testPassRate: number | null;
    testFailedCount: number | null;
    testTotalCount: number | null;
    source: string;
    ciProvider: string | null;
    createdAt: Date;
    artifacts: Array<{
      id: string;
      name: string;
      artifactType: string;
      downloadUrl: string;
      sizeBytes: bigint | null;
    }>;
  }
): BuildReleaseDTO {
  let sizeDeltaPercent: number | null = null;
  if (
    b.artifactSizeBytes != null &&
    b.previousSizeBytes != null &&
    b.previousSizeBytes > BigInt(0)
  ) {
    const delta =
      Number(b.artifactSizeBytes - b.previousSizeBytes) /
      Number(b.previousSizeBytes);
    sizeDeltaPercent = Math.round(delta * 1000) / 10;
  }

  return {
    id: b.id,
    projectId: b.projectId,
    appName: b.appName,
    platform: b.platform,
    version: b.version,
    buildNumber: b.buildNumber,
    environment: b.environment,
    pipelineStatus: b.pipelineStatus,
    branch: b.branch,
    commitSha: b.commitSha,
    commitUrl: b.commitUrl,
    releaseNotes: b.releaseNotes,
    testingInstructions: b.testingInstructions,
    knownIssues: b.knownIssues,
    previewUrl: b.previewUrl,
    buildDurationMs: b.buildDurationMs,
    artifactSizeBytes: b.artifactSizeBytes?.toString() ?? null,
    previousSizeBytes: b.previousSizeBytes?.toString() ?? null,
    sizeDeltaPercent,
    testPassRate: b.testPassRate,
    testFailedCount: b.testFailedCount,
    testTotalCount: b.testTotalCount,
    source: b.source,
    ciProvider: b.ciProvider,
    createdAt: b.createdAt.toISOString(),
    artifacts: b.artifacts.map((a) => ({
      id: a.id,
      name: a.name,
      artifactType: a.artifactType,
      downloadUrl: a.downloadUrl,
      sizeBytes: a.sizeBytes?.toString() ?? null,
    })),
  };
}

function revalidateBuildPaths() {
  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard/repository");
}

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

async function nextBuildNumber(projectId: string): Promise<number> {
  const latest = await prisma.buildRelease.findFirst({
    where: { projectId },
    orderBy: { buildNumber: "desc" },
    select: { buildNumber: true },
  });
  return (latest?.buildNumber ?? 0) + 1;
}

export async function getBuildReleasesForProject(
  projectId: string
): Promise<BuildReleaseDTO[]> {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const builds = await prisma.buildRelease.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { artifacts: true },
    take: 100,
  });

  return builds.map(toDTO);
}

export async function getBuildMetrics(projectId: string) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const builds = await prisma.buildRelease.findMany({
    where: { projectId },
    select: {
      pipelineStatus: true,
      buildDurationMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const total = builds.length;
  const passed = builds.filter(
    (b) => b.pipelineStatus === "success" || b.pipelineStatus === "released"
  ).length;
  const failed = builds.filter((b) => b.pipelineStatus === "failed").length;
  const durations = builds
    .map((b) => b.buildDurationMs)
    .filter((d): d is number => d != null);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return {
    totalBuilds: total,
    successRate: total > 0 ? Math.round((passed / total) * 100) : null,
    failedCount: failed,
    avgBuildTimeSec: avgDurationMs ? Math.round(avgDurationMs / 1000) : null,
    recentVelocity: builds.filter((b) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return b.createdAt.getTime() > weekAgo;
    }).length,
  };
}

export async function createBuildRelease(input: {
  projectId: string;
  appName: string;
  platform: BuildPlatform;
  version: string;
  environment: string;
  branch?: string;
  commitSha?: string;
  commitUrl?: string;
  releaseNotes?: string;
  testingInstructions?: string;
  knownIssues?: string;
  previewUrl?: string;
  pipelineStatus?: BuildPipelineStatus;
  testPassRate?: number;
  testFailedCount?: number;
  testTotalCount?: number;
  artifacts?: Array<{
    name: string;
    artifactType: ArtifactType;
    downloadUrl: string;
    sizeBytes?: number;
  }>;
}) {
  const user = await requireAuth();
  const role = getUserRole(user);
  if (!canUploadBuilds(role)) throw new Error("Permission denied: cannot upload builds");

  const project = await assertProjectOwner(input.projectId, user.id);
  const buildNumber = await nextBuildNumber(input.projectId);

  let releaseNotes = input.releaseNotes?.trim() ?? "";
  if (!releaseNotes && input.commitSha) {
    const lastReleased = await prisma.buildRelease.findFirst({
      where: { projectId: input.projectId, pipelineStatus: "released" },
      orderBy: { createdAt: "desc" },
    });
    const auto = await generateChangelogBetween(
      input.projectId,
      lastReleased?.commitSha ?? null,
      input.commitSha
    );
    if (auto) releaseNotes = auto;
  }

  const totalArtifactSize = input.artifacts?.reduce(
    (sum, a) => sum + (a.sizeBytes ?? 0),
    0
  );

  const previous = await prisma.buildRelease.findFirst({
    where: { projectId: input.projectId, platform: input.platform },
    orderBy: { createdAt: "desc" },
    select: { artifactSizeBytes: true },
  });

  const build = await prisma.buildRelease.create({
    data: {
      projectId: input.projectId,
      createdByUserId: user.id,
      appName: input.appName.trim() || project.name,
      platform: input.platform,
      version: input.version.trim(),
      buildNumber,
      environment: input.environment,
      pipelineStatus: input.pipelineStatus ?? "queued",
      branch: input.branch ?? null,
      commitSha: input.commitSha ?? null,
      commitUrl: input.commitUrl ?? null,
      releaseNotes: releaseNotes || null,
      testingInstructions: input.testingInstructions ?? null,
      knownIssues: input.knownIssues ?? null,
      previewUrl: input.previewUrl ?? null,
      testPassRate: input.testPassRate ?? null,
      testFailedCount: input.testFailedCount ?? null,
      testTotalCount: input.testTotalCount ?? null,
      artifactSizeBytes:
        totalArtifactSize && totalArtifactSize > 0
          ? BigInt(totalArtifactSize)
          : null,
      previousSizeBytes: previous?.artifactSizeBytes ?? null,
      source: "manual",
      artifacts: input.artifacts?.length
        ? {
            create: input.artifacts.map((a) => ({
              name: a.name,
              artifactType: a.artifactType,
              downloadUrl: a.downloadUrl,
              sizeBytes: a.sizeBytes ? BigInt(a.sizeBytes) : null,
            })),
          }
        : undefined,
    },
    include: { artifacts: true },
  });

  revalidateBuildPaths();
  return toDTO(build);
}

export async function updateBuildPipelineStatus(
  buildId: string,
  pipelineStatus: BuildPipelineStatus
) {
  const user = await requireAuth();
  const role = getUserRole(user);

  const build = await prisma.buildRelease.findFirst({
    where: { id: buildId, project: { userId: user.id } },
  });
  if (!build) throw new Error("Build not found");
  if (!canUpdatePipelineStatus(role, pipelineStatus)) {
    throw new Error("Permission denied for this status change");
  }

  const updated = await prisma.buildRelease.update({
    where: { id: buildId },
    data: { pipelineStatus },
    include: { artifacts: true },
  });

  await notifyBuildStatusChange(buildId, pipelineStatus);

  revalidateBuildPaths();
  return toDTO(updated);
}

async function notifyBuildStatusChange(buildId: string, newStatus: string) {
  const build = await prisma.buildRelease.findUnique({
    where: { id: buildId },
    include: { project: true },
  });
  if (!build) return;

  if (newStatus === "failed" || newStatus === "in_qa" || newStatus === "released") {
    const { notifyBuildEvent } = await import("@/lib/notifications");
    await notifyBuildEvent({
      projectName: build.project.name,
      version: build.version,
      status: newStatus,
      environment: build.environment,
    });
  }
}

export async function updateBuildRelease(
  buildId: string,
  data: {
    releaseNotes?: string;
    testingInstructions?: string;
    knownIssues?: string;
    previewUrl?: string;
    testPassRate?: number;
    testFailedCount?: number;
    testTotalCount?: number;
  }
) {
  const user = await requireAuth();
  const role = getUserRole(user);
  if (!canUploadBuilds(role) && !canManageBuilds(role)) {
    throw new Error("Permission denied");
  }

  const build = await prisma.buildRelease.findFirst({
    where: { id: buildId, project: { userId: user.id } },
  });
  if (!build) throw new Error("Build not found");

  const updated = await prisma.buildRelease.update({
    where: { id: buildId },
    data,
    include: { artifacts: true },
  });

  revalidateBuildPaths();
  return toDTO(updated);
}

export async function addBuildArtifact(
  buildId: string,
  artifact: {
    name: string;
    artifactType: ArtifactType;
    downloadUrl: string;
    sizeBytes?: number;
  }
) {
  const user = await requireAuth();
  const role = getUserRole(user);
  if (!canUploadBuilds(role)) throw new Error("Permission denied");

  const build = await prisma.buildRelease.findFirst({
    where: { id: buildId, project: { userId: user.id } },
    include: { artifacts: true },
  });
  if (!build) throw new Error("Build not found");

  await prisma.buildArtifact.create({
    data: {
      buildReleaseId: buildId,
      name: artifact.name,
      artifactType: artifact.artifactType,
      downloadUrl: artifact.downloadUrl,
      sizeBytes: artifact.sizeBytes ? BigInt(artifact.sizeBytes) : null,
    },
  });

  const allArtifacts = await prisma.buildArtifact.findMany({
    where: { buildReleaseId: buildId },
  });
  const totalSize = allArtifacts.reduce(
    (sum, a) => sum + Number(a.sizeBytes ?? BigInt(0)),
    0
  );

  const updated = await prisma.buildRelease.update({
    where: { id: buildId },
    data: {
      artifactSizeBytes: totalSize > 0 ? BigInt(totalSize) : build.artifactSizeBytes,
    },
    include: { artifacts: true },
  });

  revalidateBuildPaths();
  return toDTO(updated);
}

export async function deleteBuildRelease(buildId: string) {
  const user = await requireAuth();
  const role = getUserRole(user);
  if (!canDeleteBuilds(role)) throw new Error("Permission denied");

  const build = await prisma.buildRelease.findFirst({
    where: { id: buildId, project: { userId: user.id } },
  });
  if (!build) throw new Error("Build not found");

  await prisma.buildRelease.delete({ where: { id: buildId } });
  revalidateBuildPaths();
  return { deleted: true };
}

export async function updateUserRole(role: "admin" | "dev" | "qa" | "viewer") {
  const user = await requireAuth();
  const currentRole = getUserRole(user);
  if (currentRole !== "admin") throw new Error("Only admins can change roles");

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  return { role };
}
