import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreLead, rankLeads, type ScoreableLead } from "@/lib/lead-scorer";
import { withRetry } from "@/lib/retry";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/leads
 * Returns scored and ranked leads for the authenticated user.
 * Query params:
 *   - limit: number (default 50, max 100)
 *   - grade: "hot" | "warm" | "cool" | "cold" (optional filter)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const grade = searchParams.get("grade") as string | null;

    // Fetch leads from database with retry
    const leads = await withRetry(
      async () => {
        return prisma.lead.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      },
      { maxRetries: 2, baseDelayMs: 500, operationName: "fetch leads" }
    );

    if (!leads.success) {
      throw leads.error ?? new Error("Failed to fetch leads");
    }

    // Convert to ScoreableLead format
    const scoreableLeads: ScoreableLead[] = (leads.data ?? []).map((lead) => ({
      id: lead.id,
      title: lead.title,
      description: lead.description,
      status: lead.status,
      contactName: lead.contactName,
      email: lead.email,
      source: lead.source,
      url: lead.url,
      metadata: (lead.metadata as unknown as Record<string, unknown>) ?? {},
      createdAt: lead.createdAt,
    }));

    // Score and rank leads
    const rankedLeads = rankLeads(scoreableLeads);

    // Filter by grade if specified
    const filteredLeads = grade
      ? rankedLeads.filter((l) => l.score.grade === grade)
      : rankedLeads;

    // Apply limit
    const limitedLeads = filteredLeads.slice(0, limit);

    // Calculate summary stats
    const summary = {
      total: rankedLeads.length,
      hot: rankedLeads.filter((l) => l.score.grade === "hot").length,
      warm: rankedLeads.filter((l) => l.score.grade === "warm").length,
      cool: rankedLeads.filter((l) => l.score.grade === "cool").length,
      cold: rankedLeads.filter((l) => l.score.grade === "cold").length,
      averageScore:
        rankedLeads.length > 0
          ? Math.round(
              rankedLeads.reduce((sum, l) => sum + l.score.total, 0) /
                rankedLeads.length
            )
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        leads: limitedLeads.map((lead) => ({
          id: lead.id,
          title: lead.title,
          description: lead.description,
          status: lead.status,
          contactName: lead.contactName,
          email: lead.email,
          source: lead.source,
          url: lead.url,
          score: lead.score,
          createdAt: lead.createdAt.toISOString(),
        })),
        summary,
      },
    });
  } catch (error) {
    console.error("Lead analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/leads
 * Score a single lead or batch of leads without persisting.
 * Body: { leads: ScoreableLead[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leads: inputLeads } = body;

    if (!Array.isArray(inputLeads)) {
      return NextResponse.json(
        { success: false, error: "leads must be an array" },
        { status: 400 }
      );
    }

    // Validate and score leads
    const scoredLeads = inputLeads.map((lead: ScoreableLead) => {
      const score = scoreLead(lead);
      return { ...lead, score };
    });

    // Sort by score descending
    scoredLeads.sort((a, b) => b.score.total - a.score.total);

    return NextResponse.json({
      success: true,
      data: {
        leads: scoredLeads.map((lead) => ({
          id: lead.id,
          title: lead.title,
          score: lead.score,
        })),
        count: scoredLeads.length,
      },
    });
  } catch (error) {
    console.error("Lead scoring error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
