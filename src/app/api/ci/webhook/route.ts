import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BuildPipelineStatus } from "@/lib/build-rbac";

export const runtime = "nodejs";

type CIWebhookPayload = {
  projectId?: string;
  secret?: string;
  provider?: string;
  appName?: string;
  platform?: "ios" | "android" | "web";
  version?: string;
  environment?: string;
  branch?: string;
  commitSha?: string;
  commitUrl?: string;
  pipelineStatus?: BuildPipelineStatus;
  previewUrl?: string;
  releaseNotes?: string;
  testingInstructions?: string;
  knownIssues?: string;
  buildDurationMs?: number;
  testPassRate?: number;
  testFailedCount?: number;
  testTotalCount?: number;
  artifacts?: Array<{
    name: string;
    artifactType: "apk" | "aab" | "ipa" | "zip" | "url";
    downloadUrl: string;
    sizeBytes?: number;
  }>;
};

export async function POST(request: Request) {
  const secret = process.env.CI_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CI_WEBHOOK_SECRET not configured" }, { status: 503 });
  }

  let body: CIWebhookPayload;
  try {
    body = (await request.json()) as CIWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body.projectId || !body.version || !body.platform) {
    return NextResponse.json(
      { error: "projectId, version, and platform are required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const build = await prisma.buildRelease.create({
    data: {
      projectId: body.projectId,
      createdByUserId: project.userId,
      appName: body.appName ?? project.name,
      platform: body.platform,
      version: body.version,
      buildNumber: await (async () => {
        const latest = await prisma.buildRelease.findFirst({
          where: { projectId: body.projectId },
          orderBy: { buildNumber: "desc" },
        });
        return (latest?.buildNumber ?? 0) + 1;
      })(),
      environment: body.environment ?? "Dev",
      pipelineStatus: body.pipelineStatus ?? "success",
      branch: body.branch ?? null,
      commitSha: body.commitSha ?? null,
      commitUrl: body.commitUrl ?? null,
      releaseNotes: body.releaseNotes ?? null,
      testingInstructions: body.testingInstructions ?? null,
      knownIssues: body.knownIssues ?? null,
      previewUrl: body.previewUrl ?? null,
      buildDurationMs: body.buildDurationMs ?? null,
      testPassRate: body.testPassRate ?? null,
      testFailedCount: body.testFailedCount ?? null,
      testTotalCount: body.testTotalCount ?? null,
      source: "ci_webhook",
      ciProvider: body.provider ?? "generic",
      artifactSizeBytes: body.artifacts?.reduce(
        (s, a) => s + BigInt(a.sizeBytes ?? 0),
        BigInt(0)
      ),
      artifacts: body.artifacts?.length
        ? {
            create: body.artifacts.map((a) => ({
              name: a.name,
              artifactType: a.artifactType,
              downloadUrl: a.downloadUrl,
              sizeBytes: a.sizeBytes ? BigInt(a.sizeBytes) : null,
            })),
          }
        : undefined,
    },
    include: { artifacts: true },
  });

  return NextResponse.json({ ok: true, buildId: build.id });
}
