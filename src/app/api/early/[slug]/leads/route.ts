import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/webhook-rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const ip = getClientIp(request) || "unknown";
    const limited = checkRateLimit(`early-access:${slug}:${ip}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many signups from this network. Try again later." },
        { status: 429 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { earlyAccessSlug: slug, earlyAccessEnabled: true },
      select: { id: true, userId: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      company?: string;
      website?: string; // honeypot
    };

    if (body.website) {
      // Bot honeypot — pretend success
      return NextResponse.json({ ok: true });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const contactName = body.name?.trim() || null;
    const company = body.company?.trim() || null;

    // Avoid unique(url) collisions — leave url null; dedupe by email+project in metadata
    const existing = await prisma.lead.findFirst({
      where: {
        userId: project.userId,
        projectId: project.id,
        email,
        source: "early_access",
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await prisma.lead.create({
      data: {
        userId: project.userId,
        projectId: project.id,
        title: `Early access: ${email}`,
        description: `Waitlist signup for ${project.name}`,
        email,
        contactName,
        company,
        source: "early_access",
        status: "new",
        metadata: {
          channel: "early_access",
          slug,
          ip,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
