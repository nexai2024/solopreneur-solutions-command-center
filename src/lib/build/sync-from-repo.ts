import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { BuildPipelineStatus } from "@/lib/build-rbac";

async function nextBuildNumber(projectId: string): Promise<number> {
  const latest = await prisma.buildRelease.findFirst({
    where: { projectId },
    orderBy: { buildNumber: "desc" },
    select: { buildNumber: true },
  });
  return (latest?.buildNumber ?? 0) + 1;
}

const STATUS_MAP: Record<string, BuildPipelineStatus> = {
  pending: "queued",
  building: "building",
  passed: "success",
  failed: "failed",
};

/** Internal webhook helper — not a public server action. */
export async function syncBuildFromRepoBuild(repoBuildId: string): Promise<void> {
  const repoBuild = await prisma.repoBuild.findUnique({
    where: { id: repoBuildId },
    include: { project: true, commitRecord: true },
  });
  if (!repoBuild) return;

  const pipelineStatus = STATUS_MAP[repoBuild.status] ?? "queued";

  const existing = await prisma.buildRelease.findFirst({
    where: { projectId: repoBuild.projectId, repoBuildId: repoBuild.id },
  });

  if (existing) {
    await prisma.buildRelease.update({
      where: { id: existing.id },
      data: {
        pipelineStatus,
        releaseNotes: repoBuild.changelog ?? existing.releaseNotes,
        previewUrl: repoBuild.previewUrl ?? existing.previewUrl,
        buildDurationMs: repoBuild.finishedAt
          ? repoBuild.finishedAt.getTime() - repoBuild.startedAt.getTime()
          : null,
      },
    });
    revalidatePath("/dashboard/build-tracker");
    return;
  }

  const buildNumber = await nextBuildNumber(repoBuild.projectId);

  await prisma.buildRelease.create({
    data: {
      projectId: repoBuild.projectId,
      createdByUserId: repoBuild.project.userId,
      appName: repoBuild.project.name,
      platform: "web",
      version: `0.0.${buildNumber}`,
      buildNumber,
      environment: repoBuild.environment,
      pipelineStatus,
      branch: repoBuild.branch,
      commitSha: repoBuild.commitSha,
      commitUrl: repoBuild.commitRecord?.htmlUrl ?? null,
      releaseNotes: repoBuild.changelog,
      previewUrl: repoBuild.previewUrl,
      repoBuildId: repoBuild.id,
      source: "webhook",
      ciProvider: "github",
      buildDurationMs: repoBuild.finishedAt
        ? repoBuild.finishedAt.getTime() - repoBuild.startedAt.getTime()
        : null,
      artifacts: repoBuild.previewUrl
        ? {
            create: [
              {
                name: "Preview deployment",
                artifactType: "url",
                downloadUrl: repoBuild.previewUrl,
              },
            ],
          }
        : undefined,
    },
  });

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard/repository");
}
