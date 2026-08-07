import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
  };
};

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET not configured" }, { status: 503 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.warn("Clerk webhook verification failed", { route: "/api/clerk/webhook" }, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const clerkId = event.data.id;
        const primaryEmail = event.data.email_addresses?.find(
          (e) => e.id === event.data.primary_email_address_id
        )?.email_address ?? event.data.email_addresses?.[0]?.email_address;

        if (!primaryEmail) break;

        const name = [event.data.first_name, event.data.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || primaryEmail.split("@")[0];

        await prisma.user.upsert({
          where: { clerkId },
          create: { clerkId, email: primaryEmail, name },
          update: { email: primaryEmail, name },
        });
        logger.info("Clerk user synced", { clerkId, eventType: event.type });
        break;
      }
      case "user.deleted": {
        const clerkId = event.data.id;
        await prisma.user.deleteMany({ where: { clerkId } });
        logger.info("Clerk user deleted from DB", { clerkId });
        break;
      }
      default:
        logger.debug("Unhandled Clerk event", { eventType: event.type });
    }
  } catch (err) {
    logger.error("Clerk webhook handler error", { eventType: event.type }, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
