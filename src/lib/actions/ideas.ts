"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scoreIdea, type IdeaScoreResult } from "@/lib/idea-scorer";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";
import { promoteToProjectBundle } from "./promote";
import { assertAiRateLimit } from "@/lib/rate-limit";

export async function getIdeasForUser() {
  const user = await requireAuth();
  return prisma.idea.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
}

export async function getIdeaById(id: string) {
  const user = await requireAuth();
  return prisma.idea.findFirst({
    where: { id, userId: user.id },
    include: { project: { select: { id: true, name: true } } },
  });
}

export async function createIdea(input: { title: string; description: string }) {
  const user = await requireAuth();

  if (!input.title.trim()) {
    throw new Error("Title is required");
  }

  const idea = await prisma.idea.create({
    data: {
      userId: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      status: "draft",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/brainstorm");
  return idea;
}

export async function scoreIdeaById(id: string) {
  const user = await requireAuth();
  assertAiRateLimit(user.id);
  const idea = await prisma.idea.findFirst({
    where: { id, userId: user.id },
  });
  if (!idea) throw new Error("Idea not found");

  const scores = await scoreIdea(idea.title, idea.description);

  const updated = await prisma.idea.update({
    where: { id },
    data: mapScoresToDb(scores),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/brainstorm");
  return updated;
}

export async function promoteIdeaToProject(id: string) {
  const result = await promoteToProjectBundle({ type: "idea", ideaId: id });
  return result.project;
}

export async function archiveIdea(id: string) {
  const user = await requireAuth();
  await prisma.idea.updateMany({
    where: { id, userId: user.id },
    data: { status: "archived" },
  });
  revalidatePath("/dashboard/brainstorm");
}

export async function deleteIdea(id: string) {
  const user = await requireAuth();
  await prisma.idea.deleteMany({
    where: { id, userId: user.id },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/brainstorm");
}

export async function generateIdeaSuggestions(niche: string, count = 5) {
  const user = await requireAuth();
  assertAiRateLimit(user.id);
  if (!niche.trim()) throw new Error("Enter a niche or topic");
  const { generateIdeaSuggestions: generate } = await import("@/lib/ai/brainstorm-ai");
  return generate(niche.trim(), count);
}

export async function enhanceIdeaDraft(title: string, description: string) {
  const user = await requireAuth();
  assertAiRateLimit(user.id);
  const { enhanceIdeaText } = await import("@/lib/ai/brainstorm-ai");
  return enhanceIdeaText(title, description);
}

export async function createIdeasFromSuggestions(
  suggestions: Array<{ title: string; description: string }>
) {
  const user = await requireAuth();
  const created = [];

  for (const s of suggestions) {
    if (!s.title.trim()) continue;
    const idea = await prisma.idea.create({
      data: {
        userId: user.id,
        title: s.title.trim(),
        description: s.description.trim(),
        status: "draft",
      },
    });
    created.push(idea);
  }

  revalidatePath("/dashboard/brainstorm");
  return created;
}

function mapScoresToDb(scores: IdeaScoreResult) {
  return {
    aiScore: scores.aiScore,
    overallScore: scores.aiScore,
    feasibility: scores.executionFeasibilityScore,
    impact: scores.problemSeverityScore,
    speed: scores.timingScore,
    cost: Math.round((100 - scores.monetizationScore) / 20),
    scoringData: scores as unknown as Prisma.InputJsonValue,
    status: "scored",
  };
}
