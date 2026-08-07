"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createStarterMilestonesForProject } from "@/lib/actions/milestones";
import { createStarterTasksForProject } from "@/lib/actions/tasks";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";

export type PromoteSource =
  | { type: "idea"; ideaId: string }
  | { type: "brainstorm_node"; nodeId: string }
  | { type: "lead"; leadId: string }
  | {
      type: "manual";
      name: string;
      description?: string;
      aiScore?: number | null;
      withStarterPack?: boolean;
    };

export type PromoteResult = {
  project: { id: string; name: string; description: string | null; status: string };
  ideaId: string | null;
  tasksCreated: number;
  milestonesCreated: number;
};

function revalidatePromotePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/brainstorm");
  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard/growth-engine");
  revalidatePath("/dashboard/lead-finder");
  revalidatePath("/dashboard/repository");
}

export async function promoteToProjectBundle(
  source: PromoteSource
): Promise<PromoteResult> {
  const user = await requireAuth();

  let name: string;
  let description: string;
  let aiScore: number | null = null;
  let ideaId: string | null = null;
  let leadId: string | null = null;
  let brainstormNodeId: string | null = null;
  let withStarterPack = true;

  if (source.type === "idea") {
    const idea = await prisma.idea.findFirst({
      where: { id: source.ideaId, userId: user.id },
    });
    if (!idea) throw new Error("Idea not found");
    if (idea.status === "promoted" && idea.projectId) {
      const existing = await prisma.project.findUnique({
        where: { id: idea.projectId },
      });
      if (existing) {
        return {
          project: existing,
          ideaId: idea.id,
          tasksCreated: 0,
          milestonesCreated: 0,
        };
      }
    }
    name = idea.title;
    description = idea.description;
    aiScore = idea.aiScore;
    ideaId = idea.id;
  } else if (source.type === "brainstorm_node") {
    const node = await prisma.brainstormNode.findFirst({
      where: { id: source.nodeId, session: { userId: user.id } },
      include: { session: true },
    });
    if (!node) throw new Error("Node not found");

    const existingProjectId = (node.metadata as Record<string, unknown> | null)
      ?.promoted_to_project_id as string | undefined;
    if (existingProjectId) {
      const existing = await prisma.project.findFirst({
        where: { id: existingProjectId, userId: user.id },
      });
      if (existing) {
        return {
          project: existing,
          ideaId: null,
          tasksCreated: 0,
          milestonesCreated: 0,
        };
      }
    }

    const copilotMessages = await prisma.brainstormCopilotMessage.findMany({
      where: { sessionId: node.sessionId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const { formatCopilotHistoryForProject } = await import(
      "@/lib/ai/brainstorm-ai"
    );
    const copilotNotes = formatCopilotHistoryForProject(copilotMessages);

    name = node.label.slice(0, 80);
    description = [
      node.coreProblem ? `PROBLEM:\n${node.coreProblem}` : "",
      node.proposedSolution ? `SOLUTION:\n${node.proposedSolution}` : "",
      node.content,
      copilotNotes,
    ]
      .filter(Boolean)
      .join("\n\n");
    aiScore = node.viabilityScore;
    brainstormNodeId = node.id;
  } else if (source.type === "lead") {
    const lead = await prisma.lead.findFirst({
      where: { id: source.leadId, userId: user.id },
    });
    if (!lead) throw new Error("Lead not found");
    if (lead.projectId) {
      const existing = await prisma.project.findFirst({
        where: { id: lead.projectId, userId: user.id },
      });
      if (existing) {
        return {
          project: existing,
          ideaId: null,
          tasksCreated: 0,
          milestonesCreated: 0,
        };
      }
    }
    name = lead.title.slice(0, 80);
    description = [lead.description, lead.source ? `Source: ${lead.source}` : ""]
      .filter(Boolean)
      .join("\n\n");
    leadId = lead.id;
  } else {
    name = source.name.trim();
    if (!name) throw new Error("Project name is required");
    description = source.description?.trim() ?? "";
    aiScore = source.aiScore ?? null;
    withStarterPack = source.withStarterPack ?? false;
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name,
      description: description || null,
      status: "planning",
    },
  });

  if (source.type === "idea" && ideaId) {
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "promoted", projectId: project.id },
    });
  }

  if (source.type === "brainstorm_node" && brainstormNodeId) {
    const node = await prisma.brainstormNode.findUnique({
      where: { id: brainstormNodeId },
    });
    if (node) {
      const idea = await prisma.idea.create({
        data: {
          userId: user.id,
          projectId: project.id,
          title: name,
          description: description || name,
          status: "promoted",
          aiScore: node.viabilityScore,
        },
      });
      ideaId = idea.id;

      await prisma.brainstormNode.update({
        where: { id: brainstormNodeId },
        data: {
          metadata: {
            ...((node.metadata as Record<string, unknown>) ?? {}),
            promoted_to_project_id: project.id,
            promoted_idea_id: idea.id,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  if (source.type === "lead" && leadId) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { projectId: project.id, status: "qualified" },
    });
  }

  let tasksCreated = 0;
  let milestonesCreated = 0;

  if (withStarterPack) {
    const taskResult = await createStarterTasksForProject(
      project.id,
      project.name,
      project.description ?? description,
      ideaId ?? undefined
    );
    tasksCreated = taskResult.created;

    const milestoneResult = await createStarterMilestonesForProject(
      project.id,
      project.name,
      project.description ?? description,
      aiScore
    );
    milestonesCreated = milestoneResult.created;
  }

  revalidatePromotePaths();

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
    },
    ideaId,
    tasksCreated,
    milestonesCreated,
  };
}
