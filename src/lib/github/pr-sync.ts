import { prisma } from "@/lib/prisma";
import { prPreviewUrl } from "@/lib/github/repo-utils";

type GitHubReview = {
  state: string;
  user?: { login?: string };
};

type GitHubPR = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  mergeable: boolean | null;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatar_url?: string };
  comments: number;
  review_comments: number;
};

export async function syncPullRequestFromGithub(input: {
  token: string;
  owner: string;
  repo: string;
  projectId: string;
  prNumber: number;
  buildStatus?: string;
}): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/pulls/${input.prNumber}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${input.token}`,
      },
    }
  );
  if (!res.ok) return;

  const pr = (await res.json()) as GitHubPR;

  const reviewsRes = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/pulls/${input.prNumber}/reviews`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${input.token}`,
      },
    }
  );

  let approvalsCount = 0;
  let changesRequested = 0;
  if (reviewsRes.ok) {
    const reviews = (await reviewsRes.json()) as GitHubReview[];
    const latestByUser = new Map<string, string>();
    for (const review of reviews) {
      const login = review.user?.login;
      if (login) latestByUser.set(login, review.state);
    }
    for (const state of latestByUser.values()) {
      if (state === "APPROVED") approvalsCount += 1;
      if (state === "CHANGES_REQUESTED") changesRequested += 1;
    }
  }

  const fullName = `${input.owner}/${input.repo}`;
  const previewUrl = prPreviewUrl(fullName, pr.number, pr.head.ref);

  await prisma.repoPullRequest.upsert({
    where: {
      projectId_number: { projectId: input.projectId, number: pr.number },
    },
    create: {
      projectId: input.projectId,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      authorLogin: pr.user.login,
      authorAvatar: pr.user.avatar_url ?? null,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      htmlUrl: pr.html_url,
      previewUrl,
      buildStatus: input.buildStatus ?? null,
      headSha: pr.head.sha,
      approvalsCount,
      changesRequested,
      commentsCount: pr.comments,
      reviewCommentsCount: pr.review_comments,
      mergeable: pr.mergeable,
    },
    update: {
      title: pr.title,
      state: pr.state,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      htmlUrl: pr.html_url,
      previewUrl,
      headSha: pr.head.sha,
      approvalsCount,
      changesRequested,
      commentsCount: pr.comments,
      reviewCommentsCount: pr.review_comments,
      mergeable: pr.mergeable,
      ...(input.buildStatus !== undefined ? { buildStatus: input.buildStatus } : {}),
    },
  });
}

export async function upsertPullRequestFromWebhook(
  projectId: string,
  fullName: string,
  pr: {
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
  },
  buildStatus?: string
): Promise<void> {
  const previewUrl = prPreviewUrl(fullName, pr.number, pr.head.ref);

  await prisma.repoPullRequest.upsert({
    where: {
      projectId_number: { projectId, number: pr.number },
    },
    create: {
      projectId,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      authorLogin: pr.user.login,
      authorAvatar: pr.user.avatar_url ?? null,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      htmlUrl: pr.html_url,
      previewUrl,
      buildStatus: buildStatus ?? "pending",
      headSha: pr.head.sha,
      commentsCount: pr.comments ?? 0,
      reviewCommentsCount: pr.review_comments ?? 0,
      mergeable: pr.mergeable,
    },
    update: {
      title: pr.title,
      state: pr.state,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      htmlUrl: pr.html_url,
      previewUrl,
      headSha: pr.head.sha,
      commentsCount: pr.comments ?? 0,
      reviewCommentsCount: pr.review_comments ?? 0,
      mergeable: pr.mergeable,
      ...(buildStatus !== undefined ? { buildStatus } : {}),
    },
  });
}
