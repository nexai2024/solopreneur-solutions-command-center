"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "../../../generated/prisma/client";
import {
  buildProjectImportTemplateCsv,
  parseBool,
  parseDate,
  parseNumber,
  parsePipeList,
  validateProjectImportCsv,
  type ValidatedImportRow,
} from "@/lib/import/project-csv";
import { isArtifactKind } from "@/lib/project-artifacts";
import { defaultFormatForKind } from "@/lib/project-artifacts";

export type ProjectImportResult = {
  ok: boolean;
  projectsCreated: number;
  counts: {
    ideas: number;
    milestones: number;
    tasks: number;
    artifacts: number;
    seo: number;
    content: number;
    campaigns: number;
    campaignAssets: number;
    envKeys: number;
  };
  projectIds: string[];
  errors: Array<{ line: number; projectKey?: string; message: string }>;
  warnings: Array<{ line: number; projectKey?: string; message: string }>;
};

export async function getProjectImportTemplateCsv(): Promise<string> {
  await requireAuth();
  return buildProjectImportTemplateCsv();
}

export async function importProjectsFromCsv(
  csvText: string
): Promise<ProjectImportResult> {
  const user = await requireAuth();
  const parsed = validateProjectImportCsv(csvText);

  const emptyCounts = {
    ideas: 0,
    milestones: 0,
    tasks: 0,
    artifacts: 0,
    seo: 0,
    content: 0,
    campaigns: 0,
    campaignAssets: 0,
    envKeys: 0,
  };

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      projectsCreated: 0,
      counts: emptyCounts,
      projectIds: [],
      errors: parsed.errors,
      warnings: parsed.warnings,
    };
  }

  const byProject = new Map<string, ValidatedImportRow[]>();
  for (const row of parsed.rows) {
    const list = byProject.get(row.projectKey) ?? [];
    list.push(row);
    byProject.set(row.projectKey, list);
  }

  const counts = { ...emptyCounts };
  const projectIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const [projectKey, rows] of byProject) {
      const projectRow = rows.find((r) => r.recordType === "project");
      const first = rows[0]!;
      const name =
        projectRow?.cells.name?.trim() ||
        first.cells.name?.trim() ||
        first.cells.title?.trim() ||
        projectKey;

      const description =
        projectRow?.cells.description?.trim() ||
        null;

      const techStack = parsePipeList(projectRow?.cells.tech_stack ?? "");
      const toolsUsed = parsePipeList(projectRow?.cells.tools_used ?? "");
      const brandTone = parsePipeList(projectRow?.cells.brand_tone ?? "");
      const brandAvoid = parsePipeList(projectRow?.cells.brand_avoid ?? "");

      const project = await tx.project.create({
        data: {
          userId: user.id,
          name: name.slice(0, 200),
          description,
          status: projectRow?.cells.status?.trim() || "planning",
          repoUrl: projectRow?.cells.repo_url?.trim() || null,
          productionUrl: projectRow?.cells.production_url?.trim() || null,
          hostingProvider: projectRow?.cells.hosting_provider?.trim() || null,
          currentVersion: projectRow?.cells.current_version?.trim() || null,
          techStack: techStack.length
            ? (techStack as Prisma.InputJsonValue)
            : undefined,
          toolsUsed: toolsUsed.length
            ? (toolsUsed as Prisma.InputJsonValue)
            : undefined,
          brandVoiceTone: brandTone.length
            ? (brandTone as Prisma.InputJsonValue)
            : undefined,
          brandVoiceAvoid: brandAvoid.length
            ? (brandAvoid as Prisma.InputJsonValue)
            : undefined,
          brandAudience: projectRow?.cells.brand_audience?.trim() || null,
          devNotes: projectRow?.cells.dev_notes?.trim() || null,
          aiNotes: projectRow?.cells.ai_notes?.trim() || null,
        },
      });
      projectIds.push(project.id);

      const milestoneIdByTitle = new Map<string, string>();
      const campaignIdByTitle = new Map<string, string>();

      // Order: milestones → campaigns → everything else (tasks need milestones; assets need campaigns)
      const ordered = [
        ...rows.filter((r) => r.recordType === "milestone"),
        ...rows.filter((r) => r.recordType === "campaign"),
        ...rows.filter(
          (r) =>
            r.recordType !== "project" &&
            r.recordType !== "milestone" &&
            r.recordType !== "campaign"
        ),
      ];

      let taskOrder = 0;

      for (const row of ordered) {
        const c = row.cells;
        switch (row.recordType) {
          case "idea": {
            const ideaDescription = c.description || c.body;
            if (!ideaDescription) break;
            await tx.idea.create({
              data: {
                userId: user.id,
                projectId: project.id,
                title: c.title.slice(0, 200),
                description: ideaDescription,
                status: c.status || "draft",
                aiScore: parseNumber(c.ai_score),
              },
            });
            counts.ideas += 1;
            break;
          }
          case "milestone": {
            const targetDate = parseDate(c.target_date)!;
            const milestone = await tx.milestone.create({
              data: {
                projectId: project.id,
                title: c.title.slice(0, 200),
                targetDate,
                isCompleted: parseBool(c.is_completed, false),
              },
            });
            milestoneIdByTitle.set(c.title.toLowerCase(), milestone.id);
            counts.milestones += 1;
            break;
          }
          case "task": {
            const milestoneId = c.milestone_title
              ? milestoneIdByTitle.get(c.milestone_title.toLowerCase()) ?? null
              : null;
            await tx.task.create({
              data: {
                projectId: project.id,
                milestoneId,
                title: c.title.slice(0, 200),
                description: c.description || null,
                status: c.status || "todo",
                priority: c.priority || "medium",
                order: parseNumber(c.order) ?? taskOrder++,
                dueDate: parseDate(c.due_date),
                estimatedHours: parseNumber(c.estimated_hours),
              },
            });
            counts.tasks += 1;
            break;
          }
          case "artifact": {
            const kind = isArtifactKind(c.kind) ? c.kind : "other";
            const format =
              c.format ||
              defaultFormatForKind(kind);
            await tx.projectArtifact.create({
              data: {
                projectId: project.id,
                userId: user.id,
                title: c.title.slice(0, 200),
                kind,
                format,
                body: c.body || null,
                url: c.url || null,
                tags: parsePipeList(c.tags) as Prisma.InputJsonValue,
                sortOrder: parseNumber(c.order) ?? 0,
                metadata: {
                  source: "csv_import",
                  project_key: projectKey,
                } as Prisma.InputJsonValue,
              },
            });
            counts.artifacts += 1;
            break;
          }
          case "seo": {
            await tx.seoKeyword.create({
              data: {
                projectId: project.id,
                keyword: c.keyword.slice(0, 200),
                targetUrl: c.target_url || null,
                difficulty: parseNumber(c.difficulty) ?? 0,
                searchVolume: parseNumber(c.search_volume) ?? 0,
                rank: parseNumber(c.rank),
              },
            });
            counts.seo += 1;
            break;
          }
          case "content": {
            await tx.contentItem.create({
              data: {
                projectId: project.id,
                title: c.title.slice(0, 200),
                type: c.type || "blog",
                channel: c.channel || null,
                status: c.status || "draft",
                scheduledAt: parseDate(c.scheduled_at),
                contentBody: c.body || c.content_body || null,
                hashtags: parsePipeList(c.hashtags) as Prisma.InputJsonValue,
              },
            });
            counts.content += 1;
            break;
          }
          case "campaign": {
            const campaign = await tx.marketingCampaign.create({
              data: {
                userId: user.id,
                projectId: project.id,
                title: c.title.slice(0, 200),
                channel: c.channel,
                channels: [c.channel] as Prisma.InputJsonValue,
                campaignType: c.campaign_type || "launch",
                goal: c.goal || null,
                audience: c.audience || null,
                offer: c.offer || null,
                content: c.body || c.description || null,
                status: c.status || "draft",
                budget: parseNumber(c.budget) ?? 0,
                scheduledAt: parseDate(c.scheduled_at),
              },
            });
            campaignIdByTitle.set(c.title.toLowerCase(), campaign.id);
            counts.campaigns += 1;
            break;
          }
          case "campaign_asset": {
            const campaignId = campaignIdByTitle.get(
              c.campaign_title.toLowerCase()
            );
            if (!campaignId) break;
            await tx.campaignAsset.create({
              data: {
                campaignId,
                channel: c.channel || "x",
                assetType: c.asset_type,
                title: c.title.slice(0, 200),
                body: c.body,
                dayOffset: parseNumber(c.day_offset) ?? 0,
                status: c.status || "draft",
              },
            });
            counts.campaignAssets += 1;
            break;
          }
          case "env": {
            const environment = c.environment || "production";
            await tx.projectEnvVar.upsert({
              where: {
                projectId_key_environment: {
                  projectId: project.id,
                  key: c.env_key,
                  environment,
                },
              },
              create: {
                projectId: project.id,
                key: c.env_key.slice(0, 200),
                environment,
                isSecret: true,
                source: "csv_import",
                valueEncrypted: null,
              },
              update: {
                source: "csv_import",
              },
            });
            counts.envKeys += 1;
            break;
          }
          default:
            break;
        }
      }
    }
  });

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/growth-engine");

  return {
    ok: true,
    projectsCreated: projectIds.length,
    counts,
    projectIds,
    errors: [],
    warnings: parsed.warnings,
  };
}
