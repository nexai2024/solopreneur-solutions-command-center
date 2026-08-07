"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseGithubRepoUrl, resolveEnvironment } from "@/lib/github/repo-utils";
import { getGithubTokenForProject } from "@/lib/github/token";
import { syncPullRequestFromGithub } from "@/lib/github/pr-sync";
import { retryWebhookDelivery } from "@/lib/github/webhook-processor";

export type RepoMonitoringSnapshot = {
  branchHealth: {
    branch: string;
    environment: string;
    status: string;
    commitSha: string | null;
    finishedAt: string | null;
    buildBreakerName: string | null;
  } | null;
  recentBuilds: Array<{
    id: string;
    branch: string;
    environment: string;
    status: string;
    commitSha: string;
    shortSha: string;
    changelog: string | null;
    previewUrl: string | null;
    buildBreakerName: string | null;
    startedAt: string;
    htmlUrl: string | null;
  }>;
  releases: Array<{
    id: string;
    tag: string;
    name: string | null;
    sha: string;
    htmlUrl: string;
    changelog: string | null;
    createdAt: string;
  }>;
  pullRequests: Array<{
    id: string;
    number: number;
    title: string;
    state: string;
    authorLogin: string;
    authorAvatar: string | null;
    headBranch: string;
    baseBranch: string;
    htmlUrl: string;
    previewUrl: string | null;
    buildStatus: string | null;
    approvalsCount: number;
    changesRequested: number;
    commentsCount: number;
    reviewCommentsCount: number;
    mergeable: boolean | null;
    mergeReady: boolean;
  }>;
  recentCommits: Array<{
    id: string;
    sha: string;
    shortSha: string;
    message: string;
    authorName: string;
    authorAvatar: string | null;
    branch: string;
    environment: string | null;
    htmlUrl: string;
    committedAt: string;
  }>;
  webhookStats: {
    pending: number;
    failed: number;
    recentFailed: Array<{
      deliveryId: string;
      eventType: string;
      errorMessage: string | null;
      createdAt: string;
    }>;
  };
  webhookUrl: string;
};

export async function getRepoMonitoringSnapshot(
  projectId: string
): Promise<RepoMonitoringSnapshot | null> {
  const user = await requireAuth();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { githubConnection: true },
  });
  if (!project?.githubConnection) return null;

  const connection = project.githubConnection;
  const defaultBranch = connection.defaultBranch || "main";

  const mainBuild = await prisma.repoBuild.findFirst({
    where: { projectId, branch: defaultBranch },
    orderBy: { startedAt: "desc" },
  });

  const [
    recentBuilds,
    releases,
    pullRequests,
    recentCommits,
    pendingCount,
    failedCount,
    recentFailed,
  ] = await Promise.all([
    prisma.repoBuild.findMany({
      where: { projectId },
      orderBy: { startedAt: "desc" },
      take: 15,
      include: { commitRecord: true },
    }),
    prisma.repoRelease.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.repoPullRequest.findMany({
      where: { projectId, state: "open" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.repoCommit.findMany({
      where: { projectId },
      orderBy: { committedAt: "desc" },
      take: 20,
    }),
    prisma.repoWebhookDelivery.count({
      where: { projectId, status: "pending" },
    }),
    prisma.repoWebhookDelivery.count({
      where: { projectId, status: "failed" },
    }),
    prisma.repoWebhookDelivery.findMany({
      where: { projectId, status: "failed" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    branchHealth: mainBuild
      ? {
          branch: mainBuild.branch,
          environment: mainBuild.environment,
          status: mainBuild.status,
          commitSha: mainBuild.commitSha,
          finishedAt: mainBuild.finishedAt?.toISOString() ?? null,
          buildBreakerName: mainBuild.buildBreakerName,
        }
      : null,
    recentBuilds: recentBuilds.map((b) => ({
      id: b.id,
      branch: b.branch,
      environment: b.environment,
      status: b.status,
      commitSha: b.commitSha,
      shortSha: b.commitSha.slice(0, 7),
      changelog: b.changelog,
      previewUrl: b.previewUrl,
      buildBreakerName: b.buildBreakerName,
      startedAt: b.startedAt.toISOString(),
      htmlUrl: b.commitRecord?.htmlUrl ?? null,
    })),
    releases: releases.map((r) => ({
      id: r.id,
      tag: r.tag,
      name: r.name,
      sha: r.sha,
      htmlUrl: r.htmlUrl,
      changelog: r.changelog,
      createdAt: r.createdAt.toISOString(),
    })),
    pullRequests: pullRequests.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      authorLogin: pr.authorLogin,
      authorAvatar: pr.authorAvatar,
      headBranch: pr.headBranch,
      baseBranch: pr.baseBranch,
      htmlUrl: pr.htmlUrl,
      previewUrl: pr.previewUrl,
      buildStatus: pr.buildStatus,
      approvalsCount: pr.approvalsCount,
      changesRequested: pr.changesRequested,
      commentsCount: pr.commentsCount,
      reviewCommentsCount: pr.reviewCommentsCount,
      mergeable: pr.mergeable,
      mergeReady:
        pr.buildStatus === "passed" &&
        pr.approvalsCount >= 1 &&
        pr.changesRequested === 0 &&
        pr.mergeable !== false,
    })),
    recentCommits: recentCommits.map((c) => ({
      id: c.id,
      sha: c.sha,
      shortSha: c.shortSha,
      message: c.message,
      authorName: c.authorName,
      authorAvatar: c.authorAvatar,
      branch: c.branch,
      environment: c.environment,
      htmlUrl: c.htmlUrl,
      committedAt: c.committedAt.toISOString(),
    })),
    webhookStats: {
      pending: pendingCount,
      failed: failedCount,
      recentFailed: recentFailed.map((d) => ({
        deliveryId: d.deliveryId,
        eventType: d.eventType,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt.toISOString(),
      })),
    },
    webhookUrl: `${appUrl}/api/github/webhook`,
  };
}

export async function syncProjectPullRequests(projectId: string) {
  const user = await requireAuth();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { githubConnection: true },
  });
  if (!project?.githubConnection) throw new Error("No repository linked");

  const parsed = parseGithubRepoUrl(project.githubConnection.repoUrl);
  if (!parsed) throw new Error("Invalid GitHub URL");

  const token = await getGithubTokenForProject(projectId);
  if (!token) throw new Error("GitHub token required");

  const res = await fetch(
    `https://api.github.com/repos/${parsed.fullName}/pulls?state=open&per_page=20`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch pull requests");

  const prs = (await res.json()) as Array<{ number: number }>;
  for (const pr of prs) {
    await syncPullRequestFromGithub({
      token,
      owner: parsed.owner,
      repo: parsed.repo,
      projectId,
      prNumber: pr.number,
    });
  }

  revalidatePath("/dashboard/repository");
  return { synced: prs.length };
}

export async function retryFailedWebhookDelivery(
  projectId: string,
  deliveryId: string
) {
  const user = await requireAuth();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Project not found");

  const delivery = await prisma.repoWebhookDelivery.findFirst({
    where: { deliveryId, projectId },
  });
  if (!delivery) throw new Error("Delivery not found");

  await retryWebhookDelivery(deliveryId);
  revalidatePath("/dashboard/repository");
  return { ok: true };
}

export async function getEnvironmentForBranch(branch: string) {
  return resolveEnvironment(branch);
}
