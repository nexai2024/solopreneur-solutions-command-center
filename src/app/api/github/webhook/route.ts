import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  processGithubWebhookEvent,
  retryWebhookDelivery,
} from "@/lib/github/webhook-processor";
import { getGithubConnectionByFullName } from "@/lib/github/token";

export const runtime = "nodejs";

function verifyGithubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const received = signature.slice("sha256=".length);
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    );
  } catch {
    return false;
  }
}

async function queueAndProcess(input: {
  deliveryId: string;
  eventType: string;
  projectId: string;
  payload: unknown;
}) {
  const existing = await prisma.repoWebhookDelivery.findUnique({
    where: { deliveryId: input.deliveryId },
  });

  if (existing?.status === "processed") {
    return;
  }

  await prisma.repoWebhookDelivery.upsert({
    where: { deliveryId: input.deliveryId },
    create: {
      deliveryId: input.deliveryId,
      eventType: input.eventType,
      projectId: input.projectId,
      payload: input.payload as object,
      status: "pending",
    },
    update: {
      attempts: { increment: 1 },
    },
  });

  try {
    await processGithubWebhookEvent(
      input.eventType,
      input.payload,
      input.projectId
    );
    await prisma.repoWebhookDelivery.update({
      where: { deliveryId: input.deliveryId },
      data: {
        status: "processed",
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.repoWebhookDelivery.update({
      where: { deliveryId: input.deliveryId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      },
    });
    throw error;
  }
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "GITHUB_WEBHOOK_SECRET not configured" },
      { status: 503 }
    );
  }

  const deliveryId = request.headers.get("x-github-delivery");
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");

  if (!deliveryId || !eventType) {
    return NextResponse.json({ error: "Missing GitHub headers" }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyGithubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = (payload as { repository?: { full_name?: string } })
    .repository?.full_name;
  if (!repoFullName) {
    return NextResponse.json({ error: "No repository in payload" }, { status: 400 });
  }

  const connection = await getGithubConnectionByFullName(repoFullName);
  if (!connection) {
    await prisma.repoWebhookDelivery.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        eventType,
        payload: payload as object,
        status: "skipped",
        errorMessage: `No linked project for ${repoFullName}`,
      },
      update: { status: "skipped" },
    });
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await queueAndProcess({
      deliveryId,
      eventType,
      projectId: connection.projectId,
      payload,
    });
  } catch {
    // Return 200 so GitHub doesn't infinite-retry; failed deliveries can be retried in-app
    return NextResponse.json({ ok: false, queued: true, retryable: true });
  }

  return NextResponse.json({ ok: true });
}

/** Manual retry endpoint for failed deliveries (authenticated via secret query param in dev) */
export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get("deliveryId");
  const adminSecret = searchParams.get("secret");

  if (
    !process.env.GITHUB_WEBHOOK_SECRET ||
    adminSecret !== process.env.GITHUB_WEBHOOK_SECRET ||
    !deliveryId
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await retryWebhookDelivery(deliveryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retry failed" },
      { status: 500 }
    );
  }
}
