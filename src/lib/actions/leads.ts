"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { findLeadsForNiche } from "@/lib/ai/lead-finder";
import { draftHelpfulReply } from "@/lib/ai/lead-reply";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";
import { promoteToProjectBundle } from "./promote";
import { assertOptionalProjectOwner } from "@/lib/security/ownership";
import { assertAiRateLimit } from "@/lib/rate-limit";
import { assertWithinPlanLimits } from "@/lib/plan-limits";

export type LeadStatus = "new" | "qualified" | "contacted" | "rejected" | "lost";

const DEFAULT_PAGE_SIZE = 25;
const MAX_AI_LEADS = 20;

export type LeadDTO = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source: string | null;
  url: string | null;
  project_id: string | null;
  status: LeadStatus;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PaginatedLeads = {
  items: LeadDTO[];
  nextCursor: string | null;
  hasMore: boolean;
};

function toLeadDTO(lead: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  source: string | null;
  url: string | null;
  projectId: string | null;
  status: string;
  metadata: unknown;
  createdAt: Date;
}): LeadDTO {
  return {
    id: lead.id,
    user_id: lead.userId,
    title: lead.title,
    description: lead.description,
    source: lead.source,
    url: lead.url,
    project_id: lead.projectId,
    status: lead.status as LeadStatus,
    metadata: (lead.metadata as Record<string, unknown>) ?? {},
    created_at: lead.createdAt.toISOString(),
  };
}

export async function getLeads(projectId?: string | null) {
  const result = await getLeadsPaginated({ projectId, limit: 100 });
  return result.items;
}

export async function getLeadsPaginated(input?: {
  projectId?: string | null;
  cursor?: string;
  limit?: number;
}): Promise<PaginatedLeads> {
  const user = await requireAuth();
  const limit = Math.min(input?.limit ?? DEFAULT_PAGE_SIZE, 100);

  const leads = await prisma.lead.findMany({
    where: {
      userId: user.id,
      ...(input?.projectId !== undefined
        ? input.projectId
          ? { projectId: input.projectId }
          : { projectId: null }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input?.cursor
      ? {
          cursor: { id: input.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = leads.length > limit;
  const page = hasMore ? leads.slice(0, limit) : leads;

  return {
    items: page.map(toLeadDTO),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    hasMore,
  };
}

export async function saveLead(input: {
  title: string;
  description?: string;
  source?: string;
  url?: string;
  projectId?: string;
  status?: LeadStatus;
  metadata?: Record<string, unknown>;
}) {
  const user = await requireAuth();
  await assertOptionalProjectOwner(input.projectId, user.id);
  await assertWithinPlanLimits(user.id, "leads");

  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      title: input.title,
      description: input.description ?? null,
      source: input.source ?? null,
      url: input.url ?? null,
      projectId: input.projectId ?? null,
      status: input.status ?? "new",
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/dashboard/lead-finder");
  revalidatePath("/dashboard");
  return toLeadDTO(lead);
}

export async function searchLeadsWithAI(niche: string) {
  const user = await requireAuth();
  assertAiRateLimit(user.id);
  await assertWithinPlanLimits(user.id, "leads");

  const results = await findLeadsForNiche(niche);
  const capped = results.slice(0, MAX_AI_LEADS);
  const saved: LeadDTO[] = [];

  for (const result of capped) {
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        title: result.title,
        description: result.description,
        contactName: result.author || null,
        source: result.source,
        url: result.url || null,
        status: "new",
        metadata: {
          relevance_score: result.relevance_score,
          lead_type: result.lead_type,
          author: result.author,
          author_profile_url: result.author_profile_url,
          post_body: result.post_body,
          community: result.community,
          platform: result.platform,
          score: result.score,
          comment_count: result.comment_count,
          posted_at: result.posted_at,
          intent: result.intent,
          approach_angle: result.approach_angle,
          niche,
        } as Prisma.InputJsonValue,
      },
    });
    saved.push(toLeadDTO(lead));
  }

  revalidatePath("/dashboard/lead-finder");
  revalidatePath("/dashboard");
  return saved;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const user = await requireAuth();
  await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: { status },
  });
  revalidatePath("/dashboard/lead-finder");
  revalidatePath("/dashboard");
}

/** Mark lead contacted after copying a draft reply; logs outreach timestamps. */
export async function markLeadContactedFromCopy(id: string): Promise<LeadDTO> {
  const user = await requireAuth();
  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
  });
  if (!lead) throw new Error("Lead not found");

  const meta = (lead.metadata as Record<string, unknown>) ?? {};
  const now = new Date().toISOString();
  const updated = await prisma.lead.update({
    where: { id },
    data: {
      status: "contacted",
      metadata: {
        ...meta,
        contacted_at:
          typeof meta.contacted_at === "string" ? meta.contacted_at : now,
        outreach_copied_at: now,
        outreach_copy_count:
          (typeof meta.outreach_copy_count === "number"
            ? meta.outreach_copy_count
            : 0) + 1,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/lead-finder");
  revalidatePath("/dashboard");
  return toLeadDTO(updated);
}

export async function deleteLead(id: string) {
  const user = await requireAuth();
  await prisma.lead.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/lead-finder");
  revalidatePath("/dashboard");
}

export async function promoteLeadToProject(leadId: string) {
  const result = await promoteToProjectBundle({ type: "lead", leadId });
  return result.project;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Draft a helpful first comment for a lead's thread, using project brand voice when available.
 */
export async function draftLeadReply(
  leadId: string,
  opts?: { projectId?: string | null }
): Promise<{ reply: string; lead: LeadDTO }> {
  const user = await requireAuth();
  assertAiRateLimit(user.id);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
  });
  if (!lead) throw new Error("Lead not found");

  const meta = (lead.metadata as Record<string, unknown>) ?? {};
  const projectId = opts?.projectId || lead.projectId;

  let project: {
    name: string;
    description: string | null;
    brandVoiceTone: unknown;
    brandVoiceAvoid: unknown;
    brandAudience: string | null;
  } | null = null;

  if (projectId) {
    await assertOptionalProjectOwner(projectId, user.id);
    project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: {
        name: true,
        description: true,
        brandVoiceTone: true,
        brandVoiceAvoid: true,
        brandAudience: true,
      },
    });
  }

  if (!project) {
    project = await prisma.project.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        name: true,
        description: true,
        brandVoiceTone: true,
        brandVoiceAvoid: true,
        brandAudience: true,
      },
    });
  }

  const postBody =
    typeof meta.post_body === "string" && meta.post_body.trim()
      ? meta.post_body
      : lead.description ?? "";

  const reply = await draftHelpfulReply({
    niche: typeof meta.niche === "string" ? meta.niche : null,
    postTitle: lead.title,
    postBody,
    community:
      typeof meta.community === "string"
        ? meta.community
        : lead.source ?? "community",
    platform: typeof meta.platform === "string" ? meta.platform : "forum",
    author:
      typeof meta.author === "string"
        ? meta.author
        : lead.contactName ?? "",
    intent: typeof meta.intent === "string" ? meta.intent : null,
    approachAngle:
      typeof meta.approach_angle === "string" ? meta.approach_angle : null,
    productName: project?.name ?? null,
    productDescription: project?.description ?? null,
    toneKeywords: parseStringArray(project?.brandVoiceTone),
    avoidKeywords: parseStringArray(project?.brandVoiceAvoid),
    audience: project?.brandAudience ?? null,
  });

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...meta,
        draft_reply: reply,
        draft_reply_at: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/lead-finder");
  return { reply, lead: toLeadDTO(updated) };
}
