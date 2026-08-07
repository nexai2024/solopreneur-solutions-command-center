"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { suggestKeywords, generateContentIdeas } from "@/lib/ai/growth-ai";
import {
  generateWeeklyGrowthPlan,
  generateContentFanOut,
  generateLaunchCopyPacks,
  getWeekStart,
  type GrowthCoachAction,
} from "@/lib/ai/growth-coach";
import { applyBrandVoice } from "@/lib/ai/marketing/brand-voice";
import { generateABVariants } from "@/lib/ai/marketing/ab-variant";
import { suggestHashtags } from "@/lib/ai/marketing/hashtag-suggester";
import { generateCalendarPlan } from "@/lib/ai/marketing/calendar-planner";
import {
  LAUNCH_PLAYBOOKS,
  emptyChecklist,
  getPlaybook,
} from "@/lib/growth/playbooks";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";

async function assertProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseActions(value: unknown): GrowthCoachAction[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is GrowthCoachAction =>
      typeof a === "object" &&
      a !== null &&
      typeof (a as GrowthCoachAction).id === "string" &&
      typeof (a as GrowthCoachAction).title === "string"
  );
}

export type SeoKeywordDTO = {
  id: string;
  project_id: string;
  keyword: string;
  target_url: string | null;
  difficulty: number;
  search_volume: number;
  rank: number | null;
  created_at: string;
};

export type ContentItemDTO = {
  id: string;
  project_id: string;
  title: string;
  type: string;
  channel: string | null;
  status: "draft" | "scheduled" | "published";
  scheduled_at: string | null;
  content_body: string | null;
  hashtags: string[];
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GrowthPlanDTO = {
  id: string;
  project_id: string;
  week_start: string;
  summary: string;
  actions: GrowthCoachAction[];
};

export type BrandVoiceDTO = {
  tone: string[];
  avoid: string[];
  audience: string | null;
};

export type LaunchPlaybookDTO = {
  id: string;
  playbook_id: string;
  name: string;
  description: string;
  url: string;
  status: string;
  launch_date: string | null;
  build_release_id: string | null;
  checklist: Record<string, boolean>;
  copy_packs: Record<string, string>;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    dayOffset: number;
    copyKey?: string;
    done: boolean;
  }>;
};

export type GrowthCampaignDTO = {
  id: string;
  project_id: string | null;
  title: string;
  channel: string;
  content: string | null;
  status: string;
  budget: number;
  scheduled_at: string | null;
  created_at: string;
};

function toContentDTO(r: {
  id: string;
  projectId: string;
  title: string;
  type: string;
  channel: string | null;
  status: string;
  scheduledAt: Date | null;
  contentBody: string | null;
  hashtags: unknown;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ContentItemDTO {
  return {
    id: r.id,
    project_id: r.projectId,
    title: r.title,
    type: r.type,
    channel: r.channel,
    status: r.status as ContentItemDTO["status"],
    scheduled_at: r.scheduledAt?.toISOString() ?? null,
    content_body: r.contentBody,
    hashtags: parseStringArray(r.hashtags),
    parent_id: r.parentId,
    created_at: r.createdAt.toISOString(),
    updated_at: (r.updatedAt ?? r.createdAt).toISOString(),
  };
}

export async function getProjectsForGrowth() {
  const user = await requireAuth();
  return prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      productionUrl: true,
      brandVoiceTone: true,
      brandVoiceAvoid: true,
      brandAudience: true,
    },
  });
}

export async function getBrandVoice(projectId: string): Promise<BrandVoiceDTO> {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);
  return {
    tone: parseStringArray(project.brandVoiceTone),
    avoid: parseStringArray(project.brandVoiceAvoid),
    audience: project.brandAudience,
  };
}

export async function updateBrandVoice(
  projectId: string,
  input: { tone?: string[]; avoid?: string[]; audience?: string | null }
) {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.tone !== undefined && {
        brandVoiceTone: input.tone as Prisma.InputJsonValue,
      }),
      ...(input.avoid !== undefined && {
        brandVoiceAvoid: input.avoid as Prisma.InputJsonValue,
      }),
      ...(input.audience !== undefined && { brandAudience: input.audience }),
    },
  });
  revalidatePath("/dashboard/growth-engine");
}

export async function getKeywords(projectId: string): Promise<SeoKeywordDTO[]> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const rows = await prisma.seoKeyword.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    project_id: r.projectId,
    keyword: r.keyword,
    target_url: r.targetUrl,
    difficulty: r.difficulty,
    search_volume: r.searchVolume,
    rank: r.rank,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function addKeyword(projectId: string, keyword: string) {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const row = await prisma.seoKeyword.create({
    data: { projectId, keyword: keyword.trim(), difficulty: 0, searchVolume: 0 },
  });
  revalidatePath("/dashboard/growth-engine");
  return row;
}

export async function deleteKeyword(id: string) {
  const user = await requireAuth();
  const kw = await prisma.seoKeyword.findFirst({
    where: { id, project: { userId: user.id } },
  });
  if (!kw) throw new Error("Keyword not found");
  await prisma.seoKeyword.delete({ where: { id } });
  revalidatePath("/dashboard/growth-engine");
}

export async function suggestKeywordsForProject(projectId: string) {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);
  const suggested = await suggestKeywords(project.name, project.description ?? "");
  for (const item of suggested) {
    await prisma.seoKeyword.create({
      data: {
        projectId,
        keyword: item.keyword,
        difficulty: item.difficulty,
        searchVolume: item.search_volume,
      },
    });
  }
  revalidatePath("/dashboard/growth-engine");
  return suggested.length;
}

export async function getContentItems(projectId: string): Promise<ContentItemDTO[]> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const rows = await prisma.contentItem.findMany({
    where: { projectId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toContentDTO);
}

export async function getContentItem(id: string): Promise<ContentItemDTO | null> {
  const user = await requireAuth();
  const row = await prisma.contentItem.findFirst({
    where: { id, project: { userId: user.id } },
  });
  return row ? toContentDTO(row) : null;
}

export async function addContentItem(
  projectId: string,
  data: {
    title: string;
    type: string;
    channel?: string;
    content_body?: string;
    status?: string;
    scheduled_at?: string | null;
  }
) {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const row = await prisma.contentItem.create({
    data: {
      projectId,
      title: data.title,
      type: data.type,
      channel: data.channel ?? data.type,
      contentBody: data.content_body ?? null,
      status: data.status ?? "draft",
      scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
    },
  });
  revalidatePath("/dashboard/growth-engine");
  return toContentDTO(row);
}

export async function updateContentItem(
  id: string,
  data: {
    title?: string;
    type?: string;
    channel?: string | null;
    status?: string;
    scheduledAt?: string | null;
    contentBody?: string;
    hashtags?: string[];
  }
): Promise<ContentItemDTO> {
  const user = await requireAuth();
  const item = await prisma.contentItem.findFirst({
    where: { id, project: { userId: user.id } },
  });
  if (!item) throw new Error("Content item not found");

  const row = await prisma.contentItem.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.channel !== undefined && { channel: data.channel }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.contentBody !== undefined && { contentBody: data.contentBody }),
      ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
      ...(data.scheduledAt !== undefined && {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      }),
    },
  });
  revalidatePath("/dashboard/growth-engine");
  return toContentDTO(row);
}

export async function deleteContentItem(id: string) {
  const user = await requireAuth();
  const item = await prisma.contentItem.findFirst({
    where: { id, project: { userId: user.id } },
  });
  if (!item) throw new Error("Not found");
  await prisma.contentItem.delete({ where: { id } });
  revalidatePath("/dashboard/growth-engine");
}

export async function generateContentForProject(projectId: string) {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);
  const ideas = await generateContentIdeas(project.name, project.description ?? "");
  for (const idea of ideas) {
    await prisma.contentItem.create({
      data: {
        projectId,
        title: idea.title,
        type: idea.type,
        channel: idea.type,
        contentBody: idea.description,
        status: "draft",
      },
    });
  }
  revalidatePath("/dashboard/growth-engine");
  return ideas.length;
}

export async function planCalendarForProject(
  projectId: string,
  weeks = 2
): Promise<number> {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);
  const plan = await generateCalendarPlan({
    productName: project.name,
    goals: ["acquire early users", "build in public", "grow owned audience"],
    weeks,
    channels: ["blog", "linkedin", "twitter", "newsletter"],
  });

  let created = 0;
  for (const entry of plan.entries) {
    const type = entry.type.toLowerCase().includes("blog")
      ? "blog"
      : entry.type.toLowerCase().includes("news")
        ? "newsletter"
        : "social";
    await prisma.contentItem.create({
      data: {
        projectId,
        title: entry.title,
        type,
        channel: type === "social" ? "linkedin" : type,
        contentBody: entry.description,
        status: "scheduled",
        scheduledAt: new Date(`${entry.date}T12:00:00.000Z`),
      },
    });
    created += 1;
  }
  revalidatePath("/dashboard/growth-engine");
  return created;
}

export async function fanOutContent(contentId: string): Promise<ContentItemDTO[]> {
  const user = await requireAuth();
  const source = await prisma.contentItem.findFirst({
    where: { id: contentId, project: { userId: user.id } },
    include: { project: true },
  });
  if (!source) throw new Error("Content not found");

  const variants = await generateContentFanOut({
    projectName: source.project.name,
    sourceTitle: source.title,
    sourceBody: source.contentBody ?? source.title,
    brandAudience: source.project.brandAudience,
    toneKeywords: parseStringArray(source.project.brandVoiceTone),
  });

  const created: ContentItemDTO[] = [];
  for (const variant of variants) {
    if (variant.channel === source.channel || variant.channel === source.type) {
      continue;
    }
    const row = await prisma.contentItem.create({
      data: {
        projectId: source.projectId,
        parentId: source.id,
        title: variant.title,
        type: variant.channel,
        channel: variant.channel,
        contentBody: variant.body,
        hashtags: variant.hashtags,
        status: "draft",
        scheduledAt: source.scheduledAt,
      },
    });
    created.push(toContentDTO(row));
  }

  revalidatePath("/dashboard/growth-engine");
  return created;
}

export async function rewriteContentWithBrandVoice(contentId: string) {
  const user = await requireAuth();
  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, project: { userId: user.id } },
    include: { project: true },
  });
  if (!item) throw new Error("Content not found");
  if (!item.contentBody?.trim()) throw new Error("Add content body first");

  const tone = parseStringArray(item.project.brandVoiceTone);
  const avoid = parseStringArray(item.project.brandVoiceAvoid);
  const result = await applyBrandVoice({
    content: item.contentBody,
    toneKeywords: tone.length ? tone : ["clear", "confident", "practical"],
    avoidKeywords: avoid,
    targetAudience: item.project.brandAudience || "solopreneurs and indie founders",
  });

  const updated = await prisma.contentItem.update({
    where: { id: contentId },
    data: { contentBody: result.rewritten },
  });
  revalidatePath("/dashboard/growth-engine");
  return toContentDTO(updated);
}

export async function suggestContentHashtags(contentId: string) {
  const user = await requireAuth();
  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, project: { userId: user.id } },
  });
  if (!item) throw new Error("Content not found");

  const platform =
    item.channel === "linkedin"
      ? "LINKEDIN"
      : item.channel === "twitter"
        ? "TWITTER"
        : "OTHER";

  const result = await suggestHashtags({
    content: `${item.title}\n${item.contentBody ?? ""}`,
    platform,
    count: platform === "TWITTER" ? 3 : 6,
  });

  const updated = await prisma.contentItem.update({
    where: { id: contentId },
    data: { hashtags: result.hashtags },
  });
  revalidatePath("/dashboard/growth-engine");
  return toContentDTO(updated);
}

export async function generateContentAbVariants(contentId: string) {
  const user = await requireAuth();
  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, project: { userId: user.id } },
  });
  if (!item) throw new Error("Content not found");

  const result = await generateABVariants({
    original: item.title,
    type: "headline",
    count: 3,
  });
  return result.variants;
}

export async function getWeeklyGrowthPlan(projectId: string): Promise<GrowthPlanDTO | null> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const weekStart = getWeekStart();
  const plan = await prisma.growthWeeklyPlan.findFirst({
    where: { projectId, weekStart },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return null;
  return {
    id: plan.id,
    project_id: plan.projectId,
    week_start: plan.weekStart.toISOString(),
    summary: plan.summary,
    actions: parseActions(plan.actions),
  };
}

export async function generateOrRefreshWeeklyPlan(
  projectId: string,
  opts?: { launchMode?: boolean; releaseVersion?: string | null }
): Promise<GrowthPlanDTO> {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);
  const recent = await prisma.contentItem.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { title: true },
  });

  const generated = await generateWeeklyGrowthPlan({
    projectName: project.name,
    projectDescription: project.description ?? "",
    projectStatus: project.status,
    brandAudience: project.brandAudience,
    recentContentTitles: recent.map((r) => r.title),
    launchMode: opts?.launchMode,
    releaseVersion: opts?.releaseVersion,
  });

  const weekStart = getWeekStart();
  const existing = await prisma.growthWeeklyPlan.findFirst({
    where: { projectId, weekStart },
  });

  const row = existing
    ? await prisma.growthWeeklyPlan.update({
        where: { id: existing.id },
        data: {
          summary: generated.summary,
          actions: generated.actions as unknown as Prisma.InputJsonValue,
        },
      })
    : await prisma.growthWeeklyPlan.create({
        data: {
          projectId,
          weekStart,
          summary: generated.summary,
          actions: generated.actions as unknown as Prisma.InputJsonValue,
        },
      });

  revalidatePath("/dashboard/growth-engine");
  return {
    id: row.id,
    project_id: row.projectId,
    week_start: row.weekStart.toISOString(),
    summary: row.summary,
    actions: parseActions(row.actions),
  };
}

export async function toggleGrowthAction(
  planId: string,
  actionId: string,
  done: boolean
): Promise<GrowthPlanDTO> {
  const user = await requireAuth();
  const plan = await prisma.growthWeeklyPlan.findFirst({
    where: { id: planId, project: { userId: user.id } },
  });
  if (!plan) throw new Error("Plan not found");

  const actions = parseActions(plan.actions).map((a) =>
    a.id === actionId ? { ...a, done } : a
  );

  const updated = await prisma.growthWeeklyPlan.update({
    where: { id: planId },
    data: { actions: actions as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/dashboard/growth-engine");
  return {
    id: updated.id,
    project_id: updated.projectId,
    week_start: updated.weekStart.toISOString(),
    summary: updated.summary,
    actions,
  };
}

export async function getLaunchPlaybooks(projectId: string): Promise<LaunchPlaybookDTO[]> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const rows = await prisma.launchPlaybookProgress.findMany({
    where: { projectId },
  });
  const byId = new Map(rows.map((r) => [r.playbookId, r]));

  return LAUNCH_PLAYBOOKS.map((def) => {
    const row = byId.get(def.id);
    const checklist = (row?.checklist as Record<string, boolean> | null) ?? {};
    const copyPacks = (row?.copyPacks as Record<string, string> | null) ?? {};
    return {
      id: row?.id ?? def.id,
      playbook_id: def.id,
      name: def.name,
      description: def.description,
      url: def.url,
      status: row?.status ?? "idle",
      launch_date: row?.launchDate?.toISOString() ?? null,
      build_release_id: row?.buildReleaseId ?? null,
      checklist,
      copy_packs: copyPacks,
      steps: def.steps.map((s) => ({
        ...s,
        done: Boolean(checklist[s.id]),
      })),
    };
  });
}

export async function activateLaunchPlaybook(
  projectId: string,
  playbookId: string,
  opts?: {
    launchDate?: string | null;
    buildReleaseId?: string | null;
    generateCopy?: boolean;
  }
): Promise<LaunchPlaybookDTO> {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);
  const def = getPlaybook(playbookId);
  if (!def) throw new Error("Unknown playbook");

  let copyPacks: Record<string, string> = {};
  if (opts?.generateCopy !== false) {
    copyPacks = await generateLaunchCopyPacks({
      projectName: project.name,
      projectDescription: project.description ?? "",
      productionUrl: project.productionUrl,
    });
  }

  const checklist = emptyChecklist(playbookId);
  const row = await prisma.launchPlaybookProgress.upsert({
    where: {
      projectId_playbookId: { projectId, playbookId },
    },
    create: {
      projectId,
      playbookId,
      checklist,
      copyPacks,
      status: "active",
      launchDate: opts?.launchDate ? new Date(opts.launchDate) : new Date(),
      buildReleaseId: opts?.buildReleaseId ?? null,
    },
    update: {
      status: "active",
      checklist,
      copyPacks: Object.keys(copyPacks).length ? copyPacks : undefined,
      launchDate: opts?.launchDate ? new Date(opts.launchDate) : undefined,
      buildReleaseId: opts?.buildReleaseId ?? undefined,
    },
  });

  revalidatePath("/dashboard/growth-engine");
  const packs = (row.copyPacks as Record<string, string> | null) ?? copyPacks;
  const cl = (row.checklist as Record<string, boolean>) ?? checklist;
  return {
    id: row.id,
    playbook_id: def.id,
    name: def.name,
    description: def.description,
    url: def.url,
    status: row.status,
    launch_date: row.launchDate?.toISOString() ?? null,
    build_release_id: row.buildReleaseId,
    checklist: cl,
    copy_packs: packs,
    steps: def.steps.map((s) => ({ ...s, done: Boolean(cl[s.id]) })),
  };
}

export async function togglePlaybookStep(
  projectId: string,
  playbookId: string,
  stepId: string,
  done: boolean
) {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const row = await prisma.launchPlaybookProgress.findUnique({
    where: { projectId_playbookId: { projectId, playbookId } },
  });
  if (!row) throw new Error("Activate the playbook first");

  const checklist = {
    ...((row.checklist as Record<string, boolean>) ?? {}),
    [stepId]: done,
  };
  await prisma.launchPlaybookProgress.update({
    where: { id: row.id },
    data: { checklist },
  });
  revalidatePath("/dashboard/growth-engine");
}

/** Launch Mode: activate all core playbooks + refresh coach plan */
export async function startLaunchMode(
  projectId: string,
  opts?: { buildReleaseId?: string | null; version?: string | null }
) {
  const user = await requireAuth();
  const project = await assertProject(projectId, user.id);

  const launchDate = new Date().toISOString();
  const coreIds = ["product-hunt", "indie-hackers", "reddit", "linkedin-x", "directories"];

  const packs = await generateLaunchCopyPacks({
    projectName: project.name,
    projectDescription: project.description ?? "",
    version: opts?.version,
    productionUrl: project.productionUrl,
  });

  for (const playbookId of coreIds) {
    await prisma.launchPlaybookProgress.upsert({
      where: { projectId_playbookId: { projectId, playbookId } },
      create: {
        projectId,
        playbookId,
        checklist: emptyChecklist(playbookId),
        copyPacks: packs,
        status: "active",
        launchDate: new Date(launchDate),
        buildReleaseId: opts?.buildReleaseId ?? null,
      },
      update: {
        status: "active",
        copyPacks: packs,
        launchDate: new Date(launchDate),
        buildReleaseId: opts?.buildReleaseId ?? undefined,
      },
    });
  }

  const plan = await generateOrRefreshWeeklyPlan(projectId, {
    launchMode: true,
    releaseVersion: opts?.version,
  });

  revalidatePath("/dashboard/growth-engine");
  revalidatePath("/dashboard/build-tracker");
  return { plan, playbookCount: coreIds.length };
}

export async function getGrowthCampaigns(projectId: string): Promise<GrowthCampaignDTO[]> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  const rows = await prisma.marketingCampaign.findMany({
    where: { userId: user.id, projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    project_id: r.projectId,
    title: r.title,
    channel: r.channel,
    content: r.content,
    status: r.status,
    budget: r.budget,
    scheduled_at: r.scheduledAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function createGrowthCampaign(
  projectId: string,
  input: {
    title: string;
    channel: string;
    content?: string;
    budget?: number;
    scheduledAt?: string | null;
  }
) {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  if (!input.title.trim()) throw new Error("Title is required");

  const row = await prisma.marketingCampaign.create({
    data: {
      userId: user.id,
      projectId,
      title: input.title.trim(),
      channel: input.channel,
      content: input.content ?? null,
      budget: input.budget ?? 0,
      status: "draft",
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    },
  });
  revalidatePath("/dashboard/growth-engine");
  return {
    id: row.id,
    project_id: row.projectId,
    title: row.title,
    channel: row.channel,
    content: row.content,
    status: row.status,
    budget: row.budget,
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  } satisfies GrowthCampaignDTO;
}

export async function updateGrowthCampaign(
  id: string,
  input: { status?: string; title?: string; content?: string; budget?: number }
) {
  const user = await requireAuth();
  const row = await prisma.marketingCampaign.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) throw new Error("Campaign not found");
  await prisma.marketingCampaign.update({
    where: { id },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.budget !== undefined && { budget: input.budget }),
    },
  });
  revalidatePath("/dashboard/growth-engine");
}

export async function deleteGrowthCampaign(id: string) {
  const user = await requireAuth();
  const row = await prisma.marketingCampaign.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) throw new Error("Campaign not found");
  await prisma.marketingCampaign.delete({ where: { id } });
  revalidatePath("/dashboard/growth-engine");
}
