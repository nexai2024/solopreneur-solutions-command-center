"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { brainstormNodeAI } from "@/lib/ai/brainstorm-ai";
import { promoteToProjectBundle } from "@/lib/actions/promote";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";

export type BrainstormSessionDTO = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type BrainstormNodeDTO = {
  id: string;
  session_id: string;
  parent_id: string | null;
  content: string;
  title: string | null;
  type: "user_input" | "ai_generated";
  node_type: string;
  status: string;
  metadata: Record<string, unknown>;
  position_x: number;
  position_y: number;
  core_problem: string | null;
  proposed_solution: string | null;
  target_user_persona: string | null;
  viability_score: number | null;
  created_at: string;
};

function toSessionDTO(s: {
  id: string;
  userId: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): BrainstormSessionDTO {
  return {
    id: s.id,
    user_id: s.userId,
    title: s.title,
    status: s.status,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

function toNodeDTO(n: {
  id: string;
  sessionId: string;
  parentId: string | null;
  label: string;
  content: string | null;
  type: string;
  nodeType: string;
  status: string;
  metadata: unknown;
  positionX: number;
  positionY: number;
  coreProblem: string | null;
  proposedSolution: string | null;
  targetUserPersona: string | null;
  viabilityScore: number | null;
  createdAt: Date;
}): BrainstormNodeDTO {
  return {
    id: n.id,
    session_id: n.sessionId,
    parent_id: n.parentId,
    content: n.content ?? n.label,
    title: n.label,
    type: n.type as "user_input" | "ai_generated",
    node_type: n.nodeType,
    status: n.status,
    metadata: (n.metadata as Record<string, unknown>) ?? {},
    position_x: n.positionX,
    position_y: n.positionY,
    core_problem: n.coreProblem,
    proposed_solution: n.proposedSolution,
    target_user_persona: n.targetUserPersona,
    viability_score: n.viabilityScore,
    created_at: n.createdAt.toISOString(),
  };
}

export async function getBrainstormSessions() {
  const user = await requireAuth();
  const sessions = await prisma.brainstormSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return sessions.map(toSessionDTO);
}

export async function createBrainstormSession(title: string) {
  const user = await requireAuth();
  const session = await prisma.brainstormSession.create({
    data: { userId: user.id, title: title.trim() || "Untitled Session" },
  });
  revalidatePath("/dashboard/brainstorm");
  return toSessionDTO(session);
}

export async function deleteBrainstormSession(sessionId: string) {
  const user = await requireAuth();
  await prisma.brainstormSession.deleteMany({
    where: { id: sessionId, userId: user.id },
  });
  revalidatePath("/dashboard/brainstorm");
}

export async function getBrainstormNodes(sessionId: string) {
  const user = await requireAuth();
  const session = await prisma.brainstormSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });
  if (!session) throw new Error("Session not found");

  const nodes = await prisma.brainstormNode.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return nodes.map(toNodeDTO);
}

export async function addBrainstormNode(input: {
  sessionId: string;
  content: string;
  parentId?: string | null;
  nodeType?: string;
  posX?: number;
  posY?: number;
}) {
  const user = await requireAuth();
  const session = await prisma.brainstormSession.findFirst({
    where: { id: input.sessionId, userId: user.id },
  });
  if (!session) throw new Error("Session not found");

  const node = await prisma.brainstormNode.create({
    data: {
      sessionId: input.sessionId,
      parentId: input.parentId ?? null,
      label: input.content.slice(0, 100),
      content: input.content,
      nodeType: input.parentId ? input.nodeType ?? "Feature" : "Idea",
      positionX: input.posX ?? 0,
      positionY: input.posY ?? 0,
    },
  });

  await prisma.brainstormSession.update({
    where: { id: input.sessionId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/dashboard/brainstorm");
  return toNodeDTO(node);
}

export async function deleteBrainstormNode(nodeId: string) {
  const user = await requireAuth();
  const node = await prisma.brainstormNode.findFirst({
    where: { id: nodeId, session: { userId: user.id } },
  });
  if (!node) throw new Error("Node not found");
  await prisma.brainstormNode.delete({ where: { id: nodeId } });
  revalidatePath("/dashboard/brainstorm");
}

export async function updateBrainstormNode(
  nodeId: string,
  data: Partial<{
    content: string;
    metadata: Record<string, unknown>;
    coreProblem: string;
    proposedSolution: string;
    targetUserPersona: string;
    viabilityScore: number;
    status: string;
  }>
) {
  const user = await requireAuth();
  const node = await prisma.brainstormNode.findFirst({
    where: { id: nodeId, session: { userId: user.id } },
  });
  if (!node) throw new Error("Node not found");

  const updated = await prisma.brainstormNode.update({
    where: { id: nodeId },
    data: {
      ...(data.content !== undefined
        ? { content: data.content, label: data.content.slice(0, 100) }
        : {}),
      ...(data.metadata !== undefined
        ? { metadata: data.metadata as Prisma.InputJsonValue }
        : {}),
      ...(data.coreProblem !== undefined ? { coreProblem: data.coreProblem } : {}),
      ...(data.proposedSolution !== undefined
        ? { proposedSolution: data.proposedSolution }
        : {}),
      ...(data.targetUserPersona !== undefined
        ? { targetUserPersona: data.targetUserPersona }
        : {}),
      ...(data.viabilityScore !== undefined
        ? { viabilityScore: data.viabilityScore }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
  revalidatePath("/dashboard/brainstorm");
  return toNodeDTO(updated);
}

import { assertAiRateLimit } from "@/lib/rate-limit";

export async function runBrainstormAI(
  action: "explode" | "validate" | "enhance" | "analyze" | "develop",
  nodeContent: string,
  sessionContext?: string
) {
  const user = await requireAuth();
  assertAiRateLimit(user.id);
  try {
    return await brainstormNodeAI(action, nodeContent, sessionContext);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "AI request failed"
    );
  }
}

export async function generateIdeasForSession(
  sessionId: string,
  prompt: string,
  count = 4
) {
  const user = await requireAuth();
  const session = await prisma.brainstormSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });
  if (!session) throw new Error("Session not found");

  const { generateSessionIdeas } = await import("@/lib/ai/brainstorm-ai");
  const ideas = await generateSessionIdeas(session.title, prompt, count);

  const created = [];
  for (const idea of ideas) {
    const node = await prisma.brainstormNode.create({
      data: {
        sessionId,
        label: idea.content.slice(0, 100),
        content: idea.content,
        nodeType: idea.nodeType === "Idea" ? "Idea" : idea.nodeType,
        type: "ai_generated",
      },
    });
    created.push(toNodeDTO(node));
  }

  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/dashboard/brainstorm");
  return created;
}

export async function autoFillNodeVetting(nodeId: string) {
  const user = await requireAuth();
  const node = await prisma.brainstormNode.findFirst({
    where: { id: nodeId, session: { userId: user.id } },
    include: { session: { include: { nodes: { take: 10, select: { content: true } } } } },
  });
  if (!node) throw new Error("Node not found");

  const { autoFillVettingFields } = await import("@/lib/ai/brainstorm-ai");
  const { calculateViabilityScore } = await import("@/lib/brainstorm");
  const sessionContext = node.session.nodes.map((n) => n.content).filter(Boolean).join("; ");
  const vetting = await autoFillVettingFields(node.content ?? node.label, sessionContext);

  const viabilityScore = calculateViabilityScore(
    vetting.estimated_complexity,
    vetting.market_need_intensity,
    vetting.tech_stack_familiarity
  );

  const updated = await prisma.brainstormNode.update({
    where: { id: nodeId },
    data: {
      coreProblem: vetting.core_problem,
      proposedSolution: vetting.proposed_solution,
      targetUserPersona: vetting.target_user_persona,
      viabilityScore,
      metadata: {
        ...((node.metadata as Record<string, unknown>) ?? {}),
        estimated_complexity: vetting.estimated_complexity,
        market_need_intensity: vetting.market_need_intensity,
        tech_stack_familiarity: vetting.tech_stack_familiarity,
        monetization_potential: vetting.monetization_potential,
        time_to_mvp_days: vetting.time_to_mvp_days,
        target_technology: vetting.target_technology,
        dependency_risk: vetting.dependency_risk,
        idea_status: "Vetting",
        ai_summary: vetting.summary,
        viability_score: viabilityScore,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/brainstorm");
  return toNodeDTO(updated);
}

export async function enhanceBrainstormNode(nodeId: string) {
  const user = await requireAuth();
  const node = await prisma.brainstormNode.findFirst({
    where: { id: nodeId, session: { userId: user.id } },
    include: { session: true },
  });
  if (!node) throw new Error("Node not found");

  const result = await brainstormNodeAI(
    "enhance",
    node.content ?? node.label,
    node.session.title
  );

  const enhanced =
    (result.content as string | undefined) ??
    (result.title as string | undefined) ??
    node.content;

  const updated = await prisma.brainstormNode.update({
    where: { id: nodeId },
    data: {
      content: enhanced,
      label: enhanced.slice(0, 100),
      type: "ai_generated",
    },
  });

  revalidatePath("/dashboard/brainstorm");
  return toNodeDTO(updated);
}

export type BrainstormCopilotMessageDTO = {
  id: string;
  role: "user" | "assistant";
  content: string;
  focus_node: string | null;
  created_at: string;
};

function toCopilotMessageDTO(m: {
  id: string;
  role: string;
  content: string;
  focusNode: string | null;
  createdAt: Date;
}): BrainstormCopilotMessageDTO {
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    focus_node: m.focusNode,
    created_at: m.createdAt.toISOString(),
  };
}

async function assertSessionAccess(sessionId: string, userId: string) {
  const session = await prisma.brainstormSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");
  return session;
}

export async function getBrainstormCopilotMessages(sessionId: string) {
  const user = await requireAuth();
  await assertSessionAccess(sessionId, user.id);

  const messages = await prisma.brainstormCopilotMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return messages.map(toCopilotMessageDTO);
}

export async function clearBrainstormCopilotHistory(sessionId: string) {
  const user = await requireAuth();
  await assertSessionAccess(sessionId, user.id);

  await prisma.brainstormCopilotMessage.deleteMany({
    where: { sessionId },
  });

  revalidatePath("/dashboard/brainstorm");
  return { cleared: true };
}

export async function askBrainstormCopilot(
  sessionId: string,
  message: string,
  activeNodeContent?: string
) {
  const user = await requireAuth();
  const session = await prisma.brainstormSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      nodes: { select: { content: true, label: true }, take: 15 },
      copilotMessages: {
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { role: true, content: true },
      },
    },
  });
  if (!session) throw new Error("Session not found");

  const { brainstormCopilotReply } = await import("@/lib/ai/brainstorm-ai");
  const history = session.copilotMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const reply = await brainstormCopilotReply(
    message,
    {
      sessionTitle: session.title,
      nodes: session.nodes.map((n) => n.content ?? n.label),
      activeIdea: activeNodeContent,
    },
    history
  );

  await prisma.brainstormCopilotMessage.createMany({
    data: [
      {
        sessionId,
        role: "user",
        content: message.trim(),
        focusNode: activeNodeContent?.slice(0, 500) ?? null,
      },
      {
        sessionId,
        role: "assistant",
        content: reply,
        focusNode: activeNodeContent?.slice(0, 500) ?? null,
      },
    ],
  });

  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/dashboard/brainstorm");
  return { reply };
}

export async function promoteBrainstormNodeToProject(nodeId: string) {
  const result = await promoteToProjectBundle({ type: "brainstorm_node", nodeId });
  return result.project;
}

/**
 * Merge 2+ brainstorm nodes (any type) into one synthesized root Idea.
 * Optionally promote the merge straight into a Build Tracker project.
 */
export async function mergeBrainstormNodes(
  nodeIds: string[],
  opts?: { promote?: boolean; archiveSources?: boolean }
): Promise<{
  node: BrainstormNodeDTO;
  project: { id: string; name: string; description: string | null; status: string } | null;
}> {
  const user = await requireAuth();
  assertAiRateLimit(user.id);

  const uniqueIds = [...new Set(nodeIds)].filter(Boolean);
  if (uniqueIds.length < 2) {
    throw new Error("Select at least two nodes to merge");
  }

  const nodes = await prisma.brainstormNode.findMany({
    where: {
      id: { in: uniqueIds },
      session: { userId: user.id },
      status: { not: "archived" },
    },
  });

  if (nodes.length < 2) {
    throw new Error("Could not find enough nodes to merge (check ownership / archived)");
  }

  const sessionId = nodes[0]!.sessionId;
  if (nodes.some((n) => n.sessionId !== sessionId)) {
    throw new Error("All nodes must be in the same brainstorm session");
  }

  const childFeatures = await prisma.brainstormNode.findMany({
    where: {
      parentId: { in: nodes.map((n) => n.id) },
      status: { not: "archived" },
      nodeType: { in: ["Feature", "User Story"] },
    },
    select: { parentId: true, label: true, content: true },
  });

  const featuresByParent = new Map<string, string[]>();
  for (const child of childFeatures) {
    if (!child.parentId) continue;
    const list = featuresByParent.get(child.parentId) ?? [];
    list.push(child.label || child.content || "");
    featuresByParent.set(child.parentId, list.filter(Boolean));
  }

  const { synthesizeMergedIdea } = await import("@/lib/ai/brainstorm-ai");

  const synthesis = await synthesizeMergedIdea(
    nodes.map((n) => ({
      id: n.id,
      title: n.label || n.content?.slice(0, 80) || "Untitled",
      content: n.content || n.label,
      nodeType: n.nodeType,
      coreProblem: n.coreProblem,
      proposedSolution: n.proposedSolution,
      targetUserPersona: n.targetUserPersona,
      features: featuresByParent.get(n.id) ?? [],
    }))
  );

  const featureLines =
    synthesis.combinedFeatures.length > 0
      ? `\n\nCombined features:\n${synthesis.combinedFeatures.map((f) => `• ${f}`).join("\n")}`
      : "";

  const content = `${synthesis.content}${featureLines}\n\nMerge rationale: ${synthesis.rationale}`;

  const merged = await prisma.brainstormNode.create({
    data: {
      sessionId,
      parentId: null,
      label: synthesis.title.slice(0, 100),
      content,
      type: "ai_generated",
      nodeType: "Idea",
      coreProblem: synthesis.coreProblem || null,
      proposedSolution: synthesis.proposedSolution || null,
      targetUserPersona: synthesis.targetUserPersona || null,
      metadata: {
        idea_status: "Ready for Project Creation",
        merged_from_ids: nodes.map((n) => n.id),
        merged_from_titles: nodes.map((n) => n.label),
        merged_from_types: nodes.map((n) => n.nodeType),
        merge_strategy: synthesis.strategy,
        combined_features: synthesis.combinedFeatures,
        merge_rationale: synthesis.rationale,
        ai_summary: synthesis.rationale,
      } as Prisma.InputJsonValue,
    },
  });

  // Attach must-have features as child Feature nodes
  for (const [index, feature] of synthesis.combinedFeatures.slice(0, 8).entries()) {
    await prisma.brainstormNode.create({
      data: {
        sessionId,
        parentId: merged.id,
        label: feature.slice(0, 100),
        content: feature,
        type: "ai_generated",
        nodeType: "Feature",
        positionY: index,
      },
    });
  }

  const archiveSources = opts?.archiveSources !== false;
  if (archiveSources) {
    for (const source of nodes) {
      const meta = (source.metadata as Record<string, unknown>) ?? {};
      await prisma.brainstormNode.update({
        where: { id: source.id },
        data: {
          status: "archived",
          metadata: {
            ...meta,
            merged_into_id: merged.id,
            merged_into_title: synthesis.title,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  // Auto-vetting/score so the merged concept is project-ready without a second click.
  // Soft-fail: merge still succeeds if scoring fails.
  let scoredNode = merged;
  try {
    const { autoFillVettingFields } = await import("@/lib/ai/brainstorm-ai");
    const { calculateViabilityScore } = await import("@/lib/brainstorm");

    const contextNodes = await prisma.brainstormNode.findMany({
      where: { sessionId, status: { not: "archived" } },
      take: 12,
      select: { content: true, label: true },
      orderBy: { createdAt: "desc" },
    });
    const sessionContext = contextNodes
      .map((n) => n.content ?? n.label)
      .filter(Boolean)
      .join("; ");

    const vetting = await autoFillVettingFields(
      content,
      sessionContext || undefined
    );
    const viabilityScore = calculateViabilityScore(
      vetting.estimated_complexity,
      vetting.market_need_intensity,
      vetting.tech_stack_familiarity
    );
    const existingMeta = (merged.metadata as Record<string, unknown>) ?? {};

    scoredNode = await prisma.brainstormNode.update({
      where: { id: merged.id },
      data: {
        // Keep merge synthesis for problem/solution/persona when present
        coreProblem: merged.coreProblem || vetting.core_problem || null,
        proposedSolution: merged.proposedSolution || vetting.proposed_solution || null,
        targetUserPersona:
          merged.targetUserPersona || vetting.target_user_persona || null,
        viabilityScore,
        metadata: {
          ...existingMeta,
          estimated_complexity: vetting.estimated_complexity,
          market_need_intensity: vetting.market_need_intensity,
          tech_stack_familiarity: vetting.tech_stack_familiarity,
          monetization_potential: vetting.monetization_potential,
          time_to_mvp_days: vetting.time_to_mvp_days,
          target_technology: vetting.target_technology,
          dependency_risk: vetting.dependency_risk,
          idea_status: "Ready for Project Creation",
          viability_score: viabilityScore,
          ai_summary: vetting.summary || existingMeta.ai_summary || synthesis.rationale,
          auto_vetted_after_merge: true,
        } as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Scoring is best-effort — merged node remains usable
  }

  let project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  } | null = null;

  if (opts?.promote) {
    const result = await promoteToProjectBundle({
      type: "brainstorm_node",
      nodeId: scoredNode.id,
    });
    project = result.project;
  }

  revalidatePath("/dashboard/brainstorm");
  if (project) {
    revalidatePath("/dashboard/build-tracker");
    revalidatePath("/dashboard");
  }

  // Reload merged node with fresh metadata (promote stamps ids)
  const fresh = await prisma.brainstormNode.findUniqueOrThrow({
    where: { id: scoredNode.id },
  });

  return { node: toNodeDTO(fresh), project };
}
