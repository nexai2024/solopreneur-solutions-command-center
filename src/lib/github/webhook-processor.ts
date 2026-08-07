import { prisma } from "@/lib/prisma";
import {
  branchFromRef,
  commitUrl,
  isReleaseTag,
  parseGithubRepoUrl,
  prPreviewUrl,
  resolveEnvironment,
  shortSha,
  tagFromRef,
  type BuildStatus,
} from "@/lib/github/repo-utils";
import { generateChangelogBetween, formatReleaseChangelog } from "@/lib/github/changelog";
import { postGithubCommitStatus } from "@/lib/github/status";
import { getGithubTokenForProject } from "@/lib/github/token";
import { syncPullRequestFromGithub, upsertPullRequestFromWebhook } from "@/lib/github/pr-sync";

type PushPayload = {
  ref: string;
  repository: { full_name: string; html_url: string };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: { name: string; email: string; username?: string };
  }>;
  head_commit?: {
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: { name: string; email: string; username?: string };
  } | null;
};

type PullRequestPayload = {
  action: string;
  pull_request: {
    number: number;
    title: string;
    state: string;
    html_url: string;
    mergeable: boolean | null;
    head: { ref: string; sha: string };
    base: { ref: string };
    user: { login: string; avatar_url?: string };
    comments?: number;
    review_comments?: number;
  };
  repository: { full_name: string };
};

type CreatePayload = {
  ref: string;
  ref_type: "tag" | "branch";
  repository: { full_name: string; html_url: string };
  sender?: { avatar_url?: string };
};

type WorkflowRunPayload = {
  action: string;
  workflow_run: {
    head_sha: string;
    head_branch: string;
    html_url: string;
    status: string;
    conclusion: string | null;
  };
  repository: { full_name: string };
};

function simulateBuildPasses(): boolean {
  return process.env.GITHUB_SIMULATE_BUILD_FAILURE !== "true";
}

async function recordCommit(input: {
  projectId: string;
  fullName: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  branch: string;
  committedAt: Date;
}) {
  const environment = resolveEnvironment(input.branch);

  return prisma.repoCommit.upsert({
    where: {
      projectId_sha: { projectId: input.projectId, sha: input.sha },
    },
    create: {
      projectId: input.projectId,
      sha: input.sha,
      shortSha: shortSha(input.sha),
      message: input.message,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      authorAvatar: input.authorAvatar ?? null,
      branch: input.branch,
      environment,
      htmlUrl: commitUrl(input.fullName, input.sha),
      committedAt: input.committedAt,
    },
    update: {
      message: input.message,
      branch: input.branch,
      environment,
    },
  });
}

async function runBuildForCommit(input: {
  projectId: string;
  owner: string;
  repo: string;
  fullName: string;
  sha: string;
  branch: string;
  authorName: string;
  prNumber?: number;
}): Promise<{ status: BuildStatus; buildId: string }> {
  const environment = resolveEnvironment(input.branch);
  const token = await getGithubTokenForProject(input.projectId);

  const lastPassed = await prisma.repoBuild.findFirst({
    where: {
      projectId: input.projectId,
      branch: input.branch,
      status: "passed",
    },
    orderBy: { finishedAt: "desc" },
  });

  const commitRecord = await prisma.repoCommit.findFirst({
    where: { projectId: input.projectId, sha: input.sha },
  });

  if (token) {
    await postGithubCommitStatus({
      token,
      owner: input.owner,
      repo: input.repo,
      sha: input.sha,
      status: "building",
      description: `Building for ${environment}`,
    }).catch(() => undefined);
  }

  const passed = simulateBuildPasses();
  const status: BuildStatus = passed ? "passed" : "failed";

  let buildBreakerSha: string | undefined;
  let buildBreakerName: string | undefined;
  if (!passed && lastPassed) {
    buildBreakerSha = input.sha;
    buildBreakerName = input.authorName;
  }

  const changelog = await generateChangelogBetween(
    input.projectId,
    lastPassed?.commitSha ?? null,
    input.sha
  );

  let buildPreviewUrl: string | null = null;
  if (input.prNumber !== undefined) {
    buildPreviewUrl = prPreviewUrl(input.fullName, input.prNumber, input.branch);
  }

  const build = await prisma.repoBuild.create({
    data: {
      projectId: input.projectId,
      commitSha: input.sha,
      commitRecordId: commitRecord?.id ?? null,
      branch: input.branch,
      environment,
      status,
      changelog: changelog || null,
      previewUrl: buildPreviewUrl,
      prNumber: input.prNumber ?? null,
      buildBreakerSha: buildBreakerSha ?? null,
      buildBreakerName: buildBreakerName ?? null,
      finishedAt: new Date(),
    },
  });

  if (token) {
    await postGithubCommitStatus({
      token,
      owner: input.owner,
      repo: input.repo,
      sha: input.sha,
      status,
      description:
        status === "passed"
          ? `Deployed to ${environment}`
          : `Build failed — broken by ${input.authorName}`,
      targetUrl: build.previewUrl ?? undefined,
    }).catch(() => undefined);
  }

  if (input.prNumber !== undefined) {
    await prisma.repoPullRequest.updateMany({
      where: { projectId: input.projectId, number: input.prNumber },
      data: { buildStatus: status, headSha: input.sha },
    });
  }

  const { syncBuildFromRepoBuild } = await import("@/lib/build/sync-from-repo");
  await syncBuildFromRepoBuild(build.id).catch((err) => {
    console.error("Build library sync failed:", err);
  });

  return { status, buildId: build.id };
}

export async function processGithubWebhookEvent(
  eventType: string,
  payload: unknown,
  projectId: string
): Promise<void> {
  const connection = await prisma.githubConnection.findUnique({
    where: { projectId },
  });
  if (!connection?.repoFullName) return;

  const parsed = parseGithubRepoUrl(connection.repoUrl);
  if (!parsed) return;

  const { owner, repo, fullName } = parsed;

  switch (eventType) {
    case "push":
      await handlePush(payload as PushPayload, projectId, owner, repo, fullName);
      break;
    case "pull_request":
      await handlePullRequest(payload as PullRequestPayload, projectId, owner, repo, fullName);
      break;
    case "create":
      await handleCreate(payload as CreatePayload, projectId, fullName);
      break;
    case "workflow_run":
      await handleWorkflowRun(payload as WorkflowRunPayload, projectId, owner, repo);
      break;
    default:
      break;
  }
}

async function handlePush(
  payload: PushPayload,
  projectId: string,
  owner: string,
  repo: string,
  fullName: string
) {
  if (isReleaseTag(payload.ref)) return;

  const branch = branchFromRef(payload.ref);
  const commits = payload.commits?.length
    ? payload.commits
    : payload.head_commit
      ? [payload.head_commit]
      : [];

  for (const commit of commits) {
    await recordCommit({
      projectId,
      fullName,
      sha: commit.id,
      message: commit.message,
      authorName: commit.author.name,
      authorEmail: commit.author.email,
      branch,
      committedAt: new Date(commit.timestamp),
    });
  }

  const head = payload.head_commit ?? commits[commits.length - 1];
  if (!head) return;

  const openPr = await prisma.repoPullRequest.findFirst({
    where: {
      projectId,
      headBranch: branch,
      state: "open",
    },
  });

  await runBuildForCommit({
    projectId,
    owner,
    repo,
    fullName,
    sha: head.id,
    branch,
    authorName: head.author.name,
    prNumber: openPr?.number,
  });
}

async function handlePullRequest(
  payload: PullRequestPayload,
  projectId: string,
  owner: string,
  repo: string,
  fullName: string
) {
  const { pull_request: pr, action } = payload;

  if (["opened", "synchronize", "reopened", "edited"].includes(action)) {
    await upsertPullRequestFromWebhook(projectId, fullName, pr, "building");

    const token = await getGithubTokenForProject(projectId);
    if (token) {
      await syncPullRequestFromGithub({
        token,
        owner,
        repo,
        projectId,
        prNumber: pr.number,
        buildStatus: "building",
      });
    }

    if (action === "synchronize" || action === "opened") {
      await recordCommit({
        projectId,
        fullName,
        sha: pr.head.sha,
        message: `PR #${pr.number}: ${pr.title}`,
        authorName: pr.user.login,
        authorEmail: `${pr.user.login}@users.noreply.github.com`,
        authorAvatar: pr.user.avatar_url,
        branch: pr.head.ref,
        committedAt: new Date(),
      });

      await runBuildForCommit({
        projectId,
        owner,
        repo,
        fullName,
        sha: pr.head.sha,
        branch: pr.head.ref,
        authorName: pr.user.login,
        prNumber: pr.number,
      });
    }
  }

  if (action === "closed") {
    await upsertPullRequestFromWebhook(
      projectId,
      fullName,
      { ...pr, state: pr.state },
      pr.state === "closed" ? "passed" : undefined
    );
  }
}

async function handleCreate(
  payload: CreatePayload,
  projectId: string,
  fullName: string
) {
  if (payload.ref_type !== "tag" || !isReleaseTag(payload.ref)) return;

  const tag = tagFromRef(payload.ref);
  const parsed = parseGithubRepoUrl(`https://github.com/${fullName}`);
  if (!parsed) return;

  const token = await getGithubTokenForProject(projectId);
  let sha = "";

  if (token) {
    const tagRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/ref/tags/${encodeURIComponent(tag)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (tagRes.ok) {
      const tagData = (await tagRes.json()) as {
        object?: { sha?: string; type?: string; url?: string };
      };
      sha = tagData.object?.sha ?? "";
      if (tagData.object?.type === "tag" && tagData.object.url) {
        const objRes = await fetch(tagData.object.url, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (objRes.ok) {
          const obj = (await objRes.json()) as { object?: { sha?: string } };
          sha = obj.object?.sha ?? sha;
        }
      }
    }
  }

  const commits = await prisma.repoCommit.findMany({
    where: { projectId },
    orderBy: { committedAt: "desc" },
    take: 20,
  });

  const changelog = formatReleaseChangelog(
    tag,
    commits.map((c) => ({
      message: c.message,
      authorName: c.authorName,
      shortSha: c.shortSha,
    }))
  );

  await prisma.repoRelease.upsert({
    where: { projectId_tag: { projectId, tag } },
    create: {
      projectId,
      tag,
      name: `Release ${tag}`,
      sha: sha || commits[0]?.sha || "unknown",
      htmlUrl: `${payload.repository.html_url}/releases/tag/${tag}`,
      changelog,
    },
    update: {
      sha: sha || undefined,
      changelog,
    },
  });
}

async function handleWorkflowRun(
  payload: WorkflowRunPayload,
  projectId: string,
  owner: string,
  repo: string
) {
  if (!["completed", "in_progress"].includes(payload.action)) return;

  const run = payload.workflow_run;
  const status: BuildStatus =
    run.status === "completed"
      ? run.conclusion === "success"
        ? "passed"
        : "failed"
      : "building";

  const existing = await prisma.repoBuild.findFirst({
    where: { projectId, commitSha: run.head_sha },
    orderBy: { startedAt: "desc" },
  });

  let repoBuildId: string;

  if (existing) {
    await prisma.repoBuild.update({
      where: { id: existing.id },
      data: {
        status,
        finishedAt: status !== "building" ? new Date() : null,
      },
    });
    repoBuildId = existing.id;
  } else {
    const created = await prisma.repoBuild.create({
      data: {
        projectId,
        commitSha: run.head_sha,
        branch: run.head_branch,
        environment: resolveEnvironment(run.head_branch),
        status,
        finishedAt: status !== "building" ? new Date() : null,
      },
    });
    repoBuildId = created.id;
  }

  const { syncBuildFromRepoBuild } = await import("@/lib/build/sync-from-repo");
  await syncBuildFromRepoBuild(repoBuildId).catch(console.error);

  const token = await getGithubTokenForProject(projectId);
  if (token) {
    await postGithubCommitStatus({
      token,
      owner,
      repo,
      sha: run.head_sha,
      status,
      description: `Workflow ${run.conclusion ?? run.status}`,
      targetUrl: run.html_url,
    }).catch(() => undefined);
  }

  await prisma.repoPullRequest.updateMany({
    where: { projectId, headSha: run.head_sha, state: "open" },
    data: { buildStatus: status },
  });
}

export async function retryWebhookDelivery(deliveryId: string): Promise<void> {
  const delivery = await prisma.repoWebhookDelivery.findUnique({
    where: { deliveryId },
  });
  if (!delivery || !delivery.projectId) {
    throw new Error("Delivery not found");
  }

  await prisma.repoWebhookDelivery.update({
    where: { deliveryId },
    data: { attempts: { increment: 1 }, status: "pending" },
  });

  try {
    await processGithubWebhookEvent(
      delivery.eventType,
      delivery.payload,
      delivery.projectId
    );
    await prisma.repoWebhookDelivery.update({
      where: { deliveryId },
      data: { status: "processed", processedAt: new Date(), errorMessage: null },
    });
  } catch (error) {
    await prisma.repoWebhookDelivery.update({
      where: { deliveryId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}
