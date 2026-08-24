"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { assertAiRateLimit } from "@/lib/rate-limit";
import {
  generateCampaignPack,
  type CampaignType,
} from "@/lib/ai/marketing/campaign-pack";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";
import { Prisma as PrismaRuntime } from "../../../generated/prisma/client";

export type CampaignChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type CampaignMetrics = {
  impressions: number;
  clicks: number;
  signups: number;
  conversions: number;
  notes: string;
};

export type CampaignPositioning = {
  tagline: string;
  oneLiner: string;
  angles: string[];
};

export type CampaignAssetDTO = {
  id: string;
  campaign_id: string;
  channel: string;
  asset_type: string;
  title: string;
  body: string;
  day_offset: number;
  status: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
};

export type CampaignDTO = {
  id: string;
  project_id: string | null;
  title: string;
  channel: string;
  channels: string[];
  campaign_type: string;
  goal: string | null;
  audience: string | null;
  offer: string | null;
  positioning: CampaignPositioning | null;
  content: string | null;
  status: string;
  budget: number;
  spent: number;
  scheduled_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  metrics: CampaignMetrics;
  checklist: CampaignChecklistItem[];
  created_at: string;
  updated_at: string;
  assets: CampaignAssetDTO[];
  asset_stats: {
    total: number;
    published: number;
    ready: number;
  };
};

const EMPTY_METRICS: CampaignMetrics = {
  impressions: 0,
  clicks: 0,
  signups: 0,
  conversions: 0,
  notes: "",
};

function parseChannels(value: unknown, fallback: string): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return fallback ? [fallback] : [];
}

function parseChecklist(value: unknown): CampaignChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CampaignChecklistItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CampaignChecklistItem).id === "string" &&
        typeof (item as CampaignChecklistItem).label === "string"
    )
    .map((item) => ({
      id: item.id,
      label: item.label,
      done: Boolean(item.done),
    }));
}

function parseMetrics(value: unknown): CampaignMetrics {
  if (!value || typeof value !== "object") return { ...EMPTY_METRICS };
  const m = value as Record<string, unknown>;
  return {
    impressions: Number(m.impressions) || 0,
    clicks: Number(m.clicks) || 0,
    signups: Number(m.signups) || 0,
    conversions: Number(m.conversions) || 0,
    notes: typeof m.notes === "string" ? m.notes : "",
  };
}

function parsePositioning(value: unknown): CampaignPositioning | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  return {
    tagline: typeof p.tagline === "string" ? p.tagline : "",
    oneLiner: typeof p.oneLiner === "string" ? p.oneLiner : "",
    angles: Array.isArray(p.angles)
      ? p.angles.filter((a): a is string => typeof a === "string")
      : [],
  };
}

function toAssetDTO(a: {
  id: string;
  campaignId: string;
  channel: string;
  assetType: string;
  title: string;
  body: string;
  dayOffset: number;
  status: string;
  sortOrder: number;
  metadata: unknown;
  publishedAt: Date | null;
  createdAt: Date;
}): CampaignAssetDTO {
  return {
    id: a.id,
    campaign_id: a.campaignId,
    channel: a.channel,
    asset_type: a.assetType,
    title: a.title,
    body: a.body,
    day_offset: a.dayOffset,
    status: a.status,
    sort_order: a.sortOrder,
    metadata: (a.metadata as Record<string, unknown>) ?? {},
    published_at: a.publishedAt?.toISOString() ?? null,
    created_at: a.createdAt.toISOString(),
  };
}

function toCampaignDTO(
  row: {
    id: string;
    projectId: string | null;
    title: string;
    channel: string;
    channels: unknown;
    campaignType: string;
    goal: string | null;
    audience: string | null;
    offer: string | null;
    positioning: unknown;
    content: string | null;
    status: string;
    budget: number;
    spent: number;
    scheduledAt: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    metrics: unknown;
    checklist: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  assets: CampaignAssetDTO[] = []
): CampaignDTO {
  return {
    id: row.id,
    project_id: row.projectId,
    title: row.title,
    channel: row.channel,
    channels: parseChannels(row.channels, row.channel),
    campaign_type: row.campaignType,
    goal: row.goal,
    audience: row.audience,
    offer: row.offer,
    positioning: parsePositioning(row.positioning),
    content: row.content,
    status: row.status,
    budget: row.budget,
    spent: row.spent,
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
    starts_at: row.startsAt?.toISOString() ?? null,
    ends_at: row.endsAt?.toISOString() ?? null,
    metrics: parseMetrics(row.metrics),
    checklist: parseChecklist(row.checklist),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    assets,
    asset_stats: {
      total: assets.length,
      published: assets.filter((a) => a.status === "published").length,
      ready: assets.filter((a) =>
        ["ready", "draft", "copied"].includes(a.status)
      ).length,
    },
  };
}

async function assertProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

async function assertCampaign(id: string, userId: string) {
  const row = await prisma.marketingCampaign.findFirst({
    where: { id, userId },
    include: {
      assets: { orderBy: [{ dayOffset: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!row) throw new Error("Campaign not found");
  return row;
}

function revalidateCampaignPaths() {
  revalidatePath("/dashboard/growth-engine");
  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard");
}

export async function listCampaigns(projectId: string): Promise<CampaignDTO[]> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);

  const rows = await prisma.marketingCampaign.findMany({
    where: { userId: user.id, projectId },
    include: {
      assets: { orderBy: [{ dayOffset: "asc" }, { sortOrder: "asc" }] },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => toCampaignDTO(r, r.assets.map(toAssetDTO)));
}

export async function getCampaign(id: string): Promise<CampaignDTO> {
  const user = await requireAuth();
  const row = await assertCampaign(id, user.id);
  return toCampaignDTO(row, row.assets.map(toAssetDTO));
}

export async function createCampaign(
  projectId: string,
  input: {
    title: string;
    channel?: string;
    channels?: string[];
    campaignType?: CampaignType;
    goal?: string;
    audience?: string;
    offer?: string;
    content?: string;
    budget?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }
): Promise<CampaignDTO> {
  const user = await requireAuth();
  await assertProject(projectId, user.id);
  if (!input.title.trim()) throw new Error("Title is required");

  const channels =
    input.channels?.length
      ? input.channels
      : [input.channel || "linkedin"];

  const row = await prisma.marketingCampaign.create({
    data: {
      userId: user.id,
      projectId,
      title: input.title.trim(),
      channel: channels[0]!,
      channels: channels as Prisma.InputJsonValue,
      campaignType: input.campaignType ?? "launch",
      goal: input.goal ?? null,
      audience: input.audience ?? null,
      offer: input.offer ?? null,
      content: input.content ?? null,
      budget: input.budget ?? 0,
      status: "draft",
      startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
      endsAt: input.endsAt
        ? new Date(input.endsAt)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      metrics: EMPTY_METRICS as unknown as Prisma.InputJsonValue,
      checklist: [] as Prisma.InputJsonValue,
    },
    include: { assets: true },
  });

  revalidateCampaignPaths();
  return toCampaignDTO(row, []);
}

export async function updateCampaign(
  id: string,
  input: {
    title?: string;
    status?: string;
    content?: string;
    goal?: string;
    audience?: string;
    offer?: string;
    budget?: number;
    spent?: number;
    channels?: string[];
    campaignType?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    checklist?: CampaignChecklistItem[];
    metrics?: Partial<CampaignMetrics>;
    positioning?: CampaignPositioning | null;
  }
): Promise<CampaignDTO> {
  const user = await requireAuth();
  const existing = await assertCampaign(id, user.id);

  const nextMetrics = input.metrics
    ? { ...parseMetrics(existing.metrics), ...input.metrics }
    : undefined;

  const row = await prisma.marketingCampaign.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.goal !== undefined && { goal: input.goal }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.offer !== undefined && { offer: input.offer }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.spent !== undefined && { spent: input.spent }),
      ...(input.campaignType !== undefined && {
        campaignType: input.campaignType,
      }),
      ...(input.channels !== undefined && {
        channels: input.channels as Prisma.InputJsonValue,
        channel: input.channels[0] ?? existing.channel,
      }),
      ...(input.startsAt !== undefined && {
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
      }),
      ...(input.endsAt !== undefined && {
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      }),
      ...(input.checklist !== undefined && {
        checklist: input.checklist as unknown as Prisma.InputJsonValue,
      }),
      ...(nextMetrics !== undefined && {
        metrics: nextMetrics as unknown as Prisma.InputJsonValue,
      }),
      ...(input.positioning !== undefined && {
        positioning:
          input.positioning === null
            ? PrismaRuntime.DbNull
            : (input.positioning as unknown as Prisma.InputJsonValue),
      }),
    },
    include: {
      assets: { orderBy: [{ dayOffset: "asc" }, { sortOrder: "asc" }] },
    },
  });

  revalidateCampaignPaths();
  return toCampaignDTO(row, row.assets.map(toAssetDTO));
}

export async function deleteCampaign(id: string) {
  const user = await requireAuth();
  const row = await prisma.marketingCampaign.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) throw new Error("Campaign not found");
  await prisma.marketingCampaign.delete({ where: { id } });
  revalidateCampaignPaths();
}

/**
 * AI: generate a full multi-channel pack and attach assets to the campaign.
 */
export async function generateCampaignAssets(
  campaignId: string,
  opts?: { replaceExisting?: boolean }
): Promise<CampaignDTO> {
  const user = await requireAuth();
  assertAiRateLimit(user.id);

  const campaign = await assertCampaign(campaignId, user.id);
  if (!campaign.projectId) throw new Error("Campaign has no project");

  const project = await assertProject(campaign.projectId, user.id);

  const pack = await generateCampaignPack({
    projectName: project.name,
    projectDescription: project.description ?? "",
    campaignType: (campaign.campaignType as CampaignType) || "launch",
    goal: campaign.goal,
    audience: campaign.audience,
    offer: campaign.offer,
    channels: parseChannels(campaign.channels, campaign.channel),
    productionUrl: project.productionUrl,
  });

  if (opts?.replaceExisting !== false && campaign.assets.length > 0) {
    await prisma.campaignAsset.deleteMany({ where: { campaignId } });
  }

  await prisma.campaignAsset.createMany({
    data: pack.assets.map((asset, index) => ({
      campaignId,
      channel: asset.channel,
      assetType: asset.assetType,
      title: asset.title,
      body: asset.body,
      dayOffset: asset.dayOffset,
      status: "ready",
      sortOrder: index,
      metadata: (asset.metadata ?? {}) as Prisma.InputJsonValue,
    })),
  });

  const duration = pack.durationDays || 14;
  const startsAt = campaign.startsAt ?? new Date();
  const endsAt = new Date(startsAt.getTime() + duration * 24 * 60 * 60 * 1000);

  const updated = await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      title: campaign.title || pack.title,
      channels: pack.channels as Prisma.InputJsonValue,
      channel: pack.channels[0] ?? campaign.channel,
      campaignType: pack.campaignType,
      goal: pack.goal,
      audience: pack.audience,
      offer: pack.offer,
      positioning: pack.positioning as unknown as Prisma.InputJsonValue,
      checklist: pack.checklist as unknown as Prisma.InputJsonValue,
      startsAt,
      endsAt,
      status: campaign.status === "draft" ? "active" : campaign.status,
    },
    include: {
      assets: { orderBy: [{ dayOffset: "asc" }, { sortOrder: "asc" }] },
    },
  });

  revalidateCampaignPaths();
  return toCampaignDTO(updated, updated.assets.map(toAssetDTO));
}

/**
 * One-click: create a launch campaign + generate the full AI pack.
 */
export async function createLaunchCampaignPack(
  projectId: string,
  opts?: { version?: string | null; title?: string }
): Promise<CampaignDTO> {
  const user = await requireAuth();
  assertAiRateLimit(user.id);
  const project = await assertProject(projectId, user.id);

  const pack = await generateCampaignPack({
    projectName: project.name,
    projectDescription: project.description ?? "",
    campaignType: "launch",
    version: opts?.version,
    productionUrl: project.productionUrl,
  });

  const startsAt = new Date();
  const endsAt = new Date(
    startsAt.getTime() + (pack.durationDays || 14) * 24 * 60 * 60 * 1000
  );

  const campaign = await prisma.marketingCampaign.create({
    data: {
      userId: user.id,
      projectId,
      title: opts?.title || pack.title,
      channel: pack.channels[0] ?? "product-hunt",
      channels: pack.channels as Prisma.InputJsonValue,
      campaignType: "launch",
      goal: pack.goal,
      audience: pack.audience,
      offer: pack.offer,
      positioning: pack.positioning as unknown as Prisma.InputJsonValue,
      content: `AI-generated launch pack for ${project.name}`,
      status: "active",
      startsAt,
      endsAt,
      scheduledAt: startsAt,
      metrics: EMPTY_METRICS as unknown as Prisma.InputJsonValue,
      checklist: pack.checklist as unknown as Prisma.InputJsonValue,
      assets: {
        create: pack.assets.map((asset, index) => ({
          channel: asset.channel,
          assetType: asset.assetType,
          title: asset.title,
          body: asset.body,
          dayOffset: asset.dayOffset,
          status: "ready",
          sortOrder: index,
          metadata: (asset.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      },
    },
    include: {
      assets: { orderBy: [{ dayOffset: "asc" }, { sortOrder: "asc" }] },
    },
  });

  revalidateCampaignPaths();
  return toCampaignDTO(campaign, campaign.assets.map(toAssetDTO));
}

export async function updateCampaignAsset(
  assetId: string,
  input: {
    title?: string;
    body?: string;
    status?: string;
    dayOffset?: number;
  }
): Promise<CampaignAssetDTO> {
  const user = await requireAuth();
  const asset = await prisma.campaignAsset.findFirst({
    where: { id: assetId, campaign: { userId: user.id } },
  });
  if (!asset) throw new Error("Asset not found");

  const publishedAt =
    input.status === "published" && asset.status !== "published"
      ? new Date()
      : input.status && input.status !== "published"
        ? null
        : asset.publishedAt;

  const updated = await prisma.campaignAsset.update({
    where: { id: assetId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.dayOffset !== undefined && { dayOffset: input.dayOffset }),
      publishedAt,
    },
  });

  revalidateCampaignPaths();
  return toAssetDTO(updated);
}

export async function deleteCampaignAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await prisma.campaignAsset.findFirst({
    where: { id: assetId, campaign: { userId: user.id } },
  });
  if (!asset) throw new Error("Asset not found");
  await prisma.campaignAsset.delete({ where: { id: assetId } });
  revalidateCampaignPaths();
}

export async function pushCampaignAssetsToCalendar(
  campaignId: string
): Promise<{ created: number }> {
  const user = await requireAuth();
  const campaign = await assertCampaign(campaignId, user.id);
  if (!campaign.projectId) throw new Error("Campaign has no project");

  const start = campaign.startsAt ?? new Date();
  let created = 0;

  for (const asset of campaign.assets) {
    if (["email", "ad", "outreach"].includes(asset.assetType)) continue;

    const scheduledAt = new Date(start);
    scheduledAt.setDate(scheduledAt.getDate() + asset.dayOffset);

    await prisma.contentItem.create({
      data: {
        projectId: campaign.projectId,
        title: `[${campaign.title}] ${asset.title}`,
        type: asset.assetType === "thread" ? "social" : "social",
        channel: asset.channel,
        status: "draft",
        scheduledAt,
        contentBody: asset.body,
      },
    });
    created += 1;
  }

  revalidatePath("/dashboard/growth-engine");
  return { created };
}
