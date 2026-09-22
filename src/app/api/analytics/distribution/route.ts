import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getChannelConfig,
  getContentLimits,
  getOptimalPostTime,
  validateContent,
  trimContentForChannel,
  createDistributionQueue,
  calculateChannelAnalytics,
  generateCrossPostSchedule,
  type DistributionChannel,
  type ContentItem,
} from "@/lib/content-distribution";
import { withRetry } from "@/lib/retry";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/distribution
 * Returns content distribution analytics and scheduling information.
 * Query params:
 *   - projectId: string (optional)
 *   - channel: string (optional filter)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const channel = searchParams.get("channel") as DistributionChannel | null;

    // Fetch content items with retry
    const contentItems = await withRetry(
      async () => {
        return prisma.contentItem.findMany({
          where: {
            project: { userId: user.id },
            ...(projectId ? { projectId } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });
      },
      { maxRetries: 2, baseDelayMs: 500, operationName: "fetch content items" }
    );

    if (!contentItems.success) {
      throw contentItems.error ?? new Error("Failed to fetch content items");
    }

    // Convert to ContentItem format
    const items: ContentItem[] = (contentItems.data ?? []).map((item) => ({
      id: item.id,
      projectId: item.projectId,
      title: item.title,
      body: item.contentBody,
      channel: (item.channel ?? item.type) as DistributionChannel,
      status: item.status as ContentItem["status"],
      scheduledAt: item.scheduledAt,
      publishedAt: null,
      retryCount: 0,
      maxRetries: 3,
      metadata: {},
    }));

    // Filter by channel if specified
    const filteredItems = channel
      ? items.filter((item) => item.channel === channel)
      : items;

    // Calculate queue
    const queue = createDistributionQueue(filteredItems);

    // Calculate analytics for each channel
    const channels: DistributionChannel[] = [
      "twitter",
      "linkedin",
      "reddit",
      "blog",
      "newsletter",
      "mastodon",
      "threads",
    ];

    const channelAnalytics = channels.map((ch) => ({
      ...calculateChannelAnalytics(items, ch),
      config: getChannelConfig(ch),
      limits: getContentLimits(ch),
      nextOptimalTime: getOptimalPostTime(ch).toISOString(),
    }));

    // Summary stats
    const summary = {
      total: items.length,
      draft: items.filter((i) => i.status === "draft").length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      published: items.filter((i) => i.status === "published").length,
      failed: items.filter((i) => i.status === "failed").length,
      queueLength: queue.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        items: filteredItems.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          title: item.title,
          channel: item.channel,
          status: item.status,
          scheduledAt: item.scheduledAt?.toISOString() ?? null,
        })),
        summary,
        channelAnalytics: channelAnalytics.filter(
          (ca) => !channel || ca.channel === channel
        ),
        queue: queue.slice(0, 10).map((q) => ({
          id: q.item.id,
          title: q.item.title,
          channel: q.item.channel,
          scheduledFor: q.scheduledFor.toISOString(),
          priority: q.priority,
        })),
      },
    });
  } catch (error) {
    console.error("Distribution analytics error:", error);
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
 * POST /api/analytics/distribution
 * Generate a cross-posting schedule or validate content for distribution.
 * Body:
 *   - action: "schedule" | "validate" | "adapt"
 *   - content: { title: string, body: string }
 *   - channels: DistributionChannel[]
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, content, channels } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "schedule": {
        if (!content?.title || !content?.body || !channels?.length) {
          return NextResponse.json(
            {
              success: false,
              error: "content.title, content.body, and channels are required",
            },
            { status: 400 }
          );
        }

        const schedule = generateCrossPostSchedule(
          content.body,
          content.title,
          channels
        );

        return NextResponse.json({
          success: true,
          data: {
            schedule: schedule.map((s) => ({
              channel: s.channel,
              scheduledAt: s.scheduledAt.toISOString(),
              adaptedContent: s.adaptedContent,
              limits: getContentLimits(s.channel),
            })),
          },
        });
      }

      case "validate": {
        if (!content?.title || !content?.body || !channels?.length) {
          return NextResponse.json(
            {
              success: false,
              error: "content.title, content.body, and channels are required",
            },
            { status: 400 }
          );
        }

        const validations = channels.map((channel: DistributionChannel) => {
          const contentItem: ContentItem = {
            id: "temp",
            projectId: "temp",
            title: content.title,
            body: content.body,
            channel,
            status: "draft",
            scheduledAt: null,
            publishedAt: null,
            retryCount: 0,
            maxRetries: 3,
            metadata: {},
          };

          return {
            channel,
            ...validateContent(contentItem),
            limits: getContentLimits(channel),
          };
        });

        return NextResponse.json({
          success: true,
          data: { validations },
        });
      }

      case "adapt": {
        if (!content?.body || !channels?.length) {
          return NextResponse.json(
            {
              success: false,
              error: "content.body and channels are required",
            },
            { status: 400 }
          );
        }

        const adaptations = channels.map((channel: DistributionChannel) => ({
          channel,
          adaptedContent: trimContentForChannel(content.body, channel),
          limits: getContentLimits(channel),
        }));

        return NextResponse.json({
          success: true,
          data: { adaptations },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Distribution API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
