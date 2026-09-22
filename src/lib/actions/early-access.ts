"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/project-features";
import { assertAiRateLimit } from "@/lib/rate-limit";
import { aiComplete } from "@/lib/ai-config";

export type EarlyAccessSettingsDTO = {
  project_id: string;
  enabled: boolean;
  slug: string | null;
  headline: string | null;
  body: string | null;
  public_url: string | null;
};

function origin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export async function getEarlyAccessSettings(
  projectId: string
): Promise<EarlyAccessSettingsDTO> {
  const user = await requireAuth();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Project not found");

  return {
    project_id: project.id,
    enabled: project.earlyAccessEnabled,
    slug: project.earlyAccessSlug,
    headline: project.earlyAccessHeadline,
    body: project.earlyAccessBody,
    public_url: project.earlyAccessSlug
      ? `${origin()}/early/${project.earlyAccessSlug}`
      : null,
  };
}

export async function updateEarlyAccessSettings(
  projectId: string,
  input: {
    enabled?: boolean;
    slug?: string;
    headline?: string | null;
    body?: string | null;
  }
): Promise<EarlyAccessSettingsDTO> {
  const user = await requireAuth();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Project not found");

  let slug = input.slug?.trim().toLowerCase();
  if (slug !== undefined) {
    slug = slugify(slug || project.name);
    if (!slug) throw new Error("Slug is required");
    const taken = await prisma.project.findFirst({
      where: { earlyAccessSlug: slug, NOT: { id: projectId } },
    });
    if (taken) throw new Error("That early-access slug is already taken");
  } else if (input.enabled && !project.earlyAccessSlug) {
    slug = slugify(project.name);
    const taken = await prisma.project.findFirst({
      where: { earlyAccessSlug: slug, NOT: { id: projectId } },
    });
    if (taken) slug = `${slug}-${Date.now().toString(36)}`;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.enabled !== undefined
        ? { earlyAccessEnabled: input.enabled }
        : {}),
      ...(slug !== undefined ? { earlyAccessSlug: slug } : {}),
      ...(input.headline !== undefined
        ? { earlyAccessHeadline: input.headline?.trim() || null }
        : {}),
      ...(input.body !== undefined
        ? { earlyAccessBody: input.body?.trim() || null }
        : {}),
    },
  });

  revalidatePath("/dashboard/build-tracker");
  if (slug || project.earlyAccessSlug) {
    revalidatePath(`/early/${slug || project.earlyAccessSlug}`);
  }
  return getEarlyAccessSettings(projectId);
}

export async function generateEarlyAccessCopy(
  projectId: string
): Promise<EarlyAccessSettingsDTO> {
  const user = await requireAuth();
  assertAiRateLimit(user.id);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      artifacts: {
        where: {
          kind: {
            in: ["tagline", "short_description", "value_proposition", "hero_text"],
          },
        },
        take: 6,
      },
      features: {
        where: { category: "MVP", status: { not: "cut" } },
        take: 6,
      },
    },
  });
  if (!project) throw new Error("Project not found");

  const context = [
    project.description,
    ...project.artifacts.map((a) => a.body).filter(Boolean),
    ...project.features.map((f) => f.title),
  ]
    .filter(Boolean)
    .join("\n");

  let headline = `${project.name} — early access`;
  let body =
    "Be first to try it. Leave your email and we’ll invite you as we open seats.";

  try {
    const response = await aiComplete({
      jsonMode: true,
      systemPrompt:
        "Write crisp early-access landing copy for a solopreneur SaaS. Return JSON only.",
      prompt: `Product: ${project.name}
Context:
${context || "n/a"}

Return JSON: { "headline": "hero line under 12 words", "body": "2 short sentences for the waitlist page" }`,
    });
    const parsed = JSON.parse(response) as {
      headline?: string;
      body?: string;
    };
    if (parsed.headline) headline = parsed.headline.trim();
    if (parsed.body) body = parsed.body.trim();
  } catch {
    // keep fallbacks
  }

  const slug = project.earlyAccessSlug || slugify(project.name);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      earlyAccessEnabled: true,
      earlyAccessSlug: slug,
      earlyAccessHeadline: headline,
      earlyAccessBody: body,
    },
  });

  revalidatePath("/dashboard/build-tracker");
  revalidatePath(`/early/${slug}`);
  return getEarlyAccessSettings(projectId);
}

/** Public read for early-access landing (no auth). */
export async function getPublicEarlyAccess(slug: string) {
  return prisma.project.findFirst({
    where: { earlyAccessSlug: slug, earlyAccessEnabled: true },
    select: {
      id: true,
      name: true,
      earlyAccessHeadline: true,
      earlyAccessBody: true,
      earlyAccessSlug: true,
      userId: true,
      artifacts: {
        where: { kind: { in: ["logo", "tagline", "value_proposition"] } },
        take: 4,
        select: { kind: true, body: true, url: true, title: true },
      },
      features: {
        where: { category: "MVP", status: { not: "cut" } },
        take: 5,
        orderBy: { sortOrder: "asc" },
        select: { title: true },
      },
    },
  });
}
