"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import {
  getVercelProject,
  listVercelDeployments,
  listVercelEnvVars,
  listVercelProjects,
  mapDeploymentEnvironment,
  mapDeploymentStatus,
  type VercelProjectSummary,
} from "@/lib/vercel/client";

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

export async function listAvailableVercelProjects(
  accessToken: string,
  teamId?: string
): Promise<Array<{ id: string; name: string; framework: string | null; repo: string | null }>> {
  await requireAuth();
  const token = accessToken.trim();
  if (!token) throw new Error("Vercel access token is required");

  const projects = await listVercelProjects(token, teamId || null);
  return projects.map((p: VercelProjectSummary) => ({
    id: p.id,
    name: p.name,
    framework: p.framework,
    repo: p.link?.repo ?? null,
  }));
}

export async function linkVercelProject(
  projectId: string,
  input: {
    accessToken: string;
    vercelProjectId: string;
    vercelTeamId?: string;
  }
) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const token = input.accessToken.trim();
  if (!token) throw new Error("Vercel access token is required");

  const vercelProject = await getVercelProject(
    token,
    input.vercelProjectId,
    input.vercelTeamId || null
  );

  const productionDomain =
    vercelProject.targets?.production?.alias?.[0] ??
    vercelProject.latestDeployments?.[0]?.url ??
    null;

  const tokenEncrypted = encrypt(token);

  await prisma.vercelConnection.upsert({
    where: { projectId },
    create: {
      userId: user.id,
      projectId,
      vercelTeamId: input.vercelTeamId || null,
      vercelProjectId: vercelProject.id,
      vercelProjectName: vercelProject.name,
      accessTokenEncrypted: tokenEncrypted,
      productionDomain,
      framework: vercelProject.framework,
    },
    update: {
      vercelTeamId: input.vercelTeamId || null,
      vercelProjectId: vercelProject.id,
      vercelProjectName: vercelProject.name,
      accessTokenEncrypted: tokenEncrypted,
      productionDomain,
      framework: vercelProject.framework,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      hostingProvider: "vercel",
      productionUrl: productionDomain ? `https://${productionDomain}` : undefined,
    },
  });

  await syncVercelProjectData(projectId);

  revalidatePath("/dashboard/build-tracker");
  return { success: true };
}

export async function syncVercelProjectData(projectId: string) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  const connection = await prisma.vercelConnection.findUnique({
    where: { projectId },
  });
  if (!connection) throw new Error("Vercel is not linked for this project");

  const token = decrypt(connection.accessTokenEncrypted);
  const teamId = connection.vercelTeamId;

  const [vercelProject, deployments, envVars] = await Promise.all([
    getVercelProject(token, connection.vercelProjectId, teamId),
    listVercelDeployments(token, connection.vercelProjectId, teamId, 25),
    listVercelEnvVars(token, connection.vercelProjectId, teamId),
  ]);

  const productionDomain =
    vercelProject.targets?.production?.alias?.[0] ?? connection.productionDomain;

  await prisma.vercelConnection.update({
    where: { projectId },
    data: {
      vercelProjectName: vercelProject.name,
      productionDomain,
      framework: vercelProject.framework,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      hostingProvider: "vercel",
      ...(productionDomain ? { productionUrl: `https://${productionDomain}` } : {}),
    },
  });

  for (const deployment of deployments) {
    const environment = mapDeploymentEnvironment(deployment.target);
    const status = mapDeploymentStatus(deployment.state, deployment.readyState);
    const commitSha = deployment.meta?.githubCommitSha ?? deployment.gitSource?.sha ?? null;
    const commitMessage =
      deployment.meta?.githubCommitMessage ?? deployment.gitSource?.commitMessage ?? null;
    const branch = deployment.meta?.githubCommitRef ?? deployment.gitSource?.ref ?? null;

    await prisma.projectDeployment.upsert({
      where: { vercelDeploymentId: deployment.uid },
      create: {
        projectId,
        vercelDeploymentId: deployment.uid,
        url: `https://${deployment.url}`,
        environment,
        status,
        commitSha,
        commitMessage,
        branch,
        builder: deployment.creator?.username ?? "vercel",
        deployedAt: new Date(deployment.createdAt),
      },
      update: {
        url: `https://${deployment.url}`,
        environment,
        status,
        commitSha,
        commitMessage,
        branch,
        deployedAt: new Date(deployment.createdAt),
        syncedAt: new Date(),
      },
    });
  }

  for (const env of envVars) {
    for (const target of env.target) {
      const environment =
        target === "production"
          ? "production"
          : target === "development"
            ? "development"
            : "preview";

      const isSecret = env.type === "encrypted" || env.type === "secret";

      await prisma.projectEnvVar.upsert({
        where: {
          projectId_key_environment: {
            projectId,
            key: env.key,
            environment,
          },
        },
        create: {
          projectId,
          key: env.key,
          valueEncrypted: isSecret ? encrypt(env.value) : encrypt(env.value),
          environment,
          isSecret,
          source: "vercel",
          vercelEnvId: env.id,
        },
        update: {
          valueEncrypted: encrypt(env.value),
          isSecret,
          source: "vercel",
          vercelEnvId: env.id,
        },
      });
    }
  }

  revalidatePath("/dashboard/build-tracker");
  return {
    deploymentsSynced: deployments.length,
    envVarsSynced: envVars.length,
  };
}

export async function unlinkVercelProject(projectId: string) {
  const user = await requireAuth();
  await assertProjectOwner(projectId, user.id);

  await prisma.vercelConnection.deleteMany({ where: { projectId } });
  revalidatePath("/dashboard/build-tracker");
}
