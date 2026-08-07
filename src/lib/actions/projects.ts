"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { promoteToProjectBundle } from "./promote";
import { parseGithubRepoUrl } from "@/lib/github/repo-utils";

export async function getProjectsForRepository() {
  const user = await requireAuth();
  return prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      githubConnection: true,
      _count: { select: { tasks: true, milestones: true } },
    },
  });
}

export async function linkProjectRepository(
  projectId: string,
  repoUrl: string,
  accessToken?: string
) {
  const user = await requireAuth();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Project not found");

  const normalizedUrl = repoUrl.trim().replace(/\/$/, "");
  if (!normalizedUrl.includes("github.com") && !normalizedUrl.includes("gitlab.com")) {
    throw new Error("Only GitHub and GitLab URLs are supported");
  }

  const provider = normalizedUrl.includes("gitlab.com") ? "gitlab" : "github";
  const tokenEncrypted = accessToken ? encrypt(accessToken) : null;
  const parsed = provider === "github" ? parseGithubRepoUrl(normalizedUrl) : null;

  await prisma.project.update({
    where: { id: projectId },
    data: { repoUrl: normalizedUrl },
  });

  await prisma.githubConnection.upsert({
    where: { projectId },
    create: {
      userId: user.id,
      projectId,
      repoUrl: normalizedUrl,
      provider,
      repoOwner: parsed?.owner ?? null,
      repoName: parsed?.repo ?? null,
      repoFullName: parsed?.fullName ?? null,
      accessTokenEncrypted: tokenEncrypted,
    },
    update: {
      repoUrl: normalizedUrl,
      provider,
      repoOwner: parsed?.owner ?? null,
      repoName: parsed?.repo ?? null,
      repoFullName: parsed?.fullName ?? null,
      ...(tokenEncrypted ? { accessTokenEncrypted: tokenEncrypted } : {}),
    },
  });

  revalidatePath("/dashboard/repository");
  return { success: true };
}

export async function fetchRepoStats(repoUrl: string) {
  await requireAuth();
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!match) return null;

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${match[1]}`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      full_name: data.full_name as string,
      description: data.description as string | null,
      html_url: data.html_url as string,
      stargazers_count: data.stargazers_count as number,
      forks_count: data.forks_count as number,
      open_issues_count: data.open_issues_count as number,
      language: data.language as string | null,
      updated_at: data.updated_at as string,
    };
  } catch {
    return null;
  }
}

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string; status?: string }
) {
  const user = await requireAuth();
  await prisma.project.updateMany({
    where: { id: projectId, userId: user.id },
    data,
  });
  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard/repository");
}

export async function createProject(input: {
  name: string;
  description?: string;
  withStarterPack?: boolean;
}) {
  const result = await promoteToProjectBundle({
    type: "manual",
    name: input.name,
    description: input.description,
    withStarterPack: input.withStarterPack ?? false,
  });
  return result.project;
}

export async function deleteProject(projectId: string) {
  const user = await requireAuth();
  await prisma.project.deleteMany({
    where: { id: projectId, userId: user.id },
  });
  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard/repository");
  revalidatePath("/dashboard");
}
