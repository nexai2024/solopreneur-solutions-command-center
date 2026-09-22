import { describe, expect, it } from "vitest";
import {
  getChannelConfig,
  getContentLimits,
  getOptimalPostTime,
  validateContent,
  trimContentForChannel,
  scheduleContent,
  createDistributionQueue,
  handleDistributionFailure,
  calculateChannelAnalytics,
  generateCrossPostSchedule,
  type ContentItem,
  type DistributionChannel,
} from "@/lib/content-distribution";

function makeContent(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "content-1",
    projectId: "proj-1",
    title: "Test Post",
    body: "This is a test post body",
    channel: "twitter",
    status: "draft",
    scheduledAt: null,
    publishedAt: null,
    retryCount: 0,
    maxRetries: 3,
    metadata: {},
    ...overrides,
  };
}

describe("getChannelConfig", () => {
  it("returns config for each channel", () => {
    const channels: DistributionChannel[] = ["twitter", "linkedin", "reddit", "blog"];
    for (const channel of channels) {
      const config = getChannelConfig(channel);
      expect(config.channel).toBe(channel);
      expect(config.optimalHours.length).toBeGreaterThan(0);
      expect(config.cooldownMinutes).toBeGreaterThan(0);
      expect(config.maxPerDay).toBeGreaterThan(0);
    }
  });
});

describe("getContentLimits", () => {
  it("returns limits for each channel", () => {
    const limits = getContentLimits("twitter");
    expect(limits.maxTitle).toBe(280);
    expect(limits.maxBody).toBe(280);
  });
});

describe("getOptimalPostTime", () => {
  it("returns a future date", () => {
    const result = getOptimalPostTime("twitter");
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });

  it("respects preferred date", () => {
    const preferred = new Date();
    preferred.setHours(0, 0, 0, 0);
    const result = getOptimalPostTime("twitter", preferred);
    expect(result.getTime()).toBeGreaterThan(preferred.getTime());
  });
});

describe("validateContent", () => {
  it("validates required fields", () => {
    const content = makeContent({ title: "", body: "" });
    const result = validateContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates content length", () => {
    const content = makeContent({
      title: "x".repeat(300),
      channel: "twitter",
    });
    const result = validateContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("limit"))).toBe(true);
  });

  it("passes valid content", () => {
    const content = makeContent({ title: "Test", body: "Test body" });
    const result = validateContent(content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("trimContentForChannel", () => {
  it("trims long content", () => {
    const longContent = "x".repeat(500);
    const result = trimContentForChannel(longContent, "twitter");
    expect(result.length).toBeLessThanOrEqual(280);
    expect(result.endsWith("...")).toBe(true);
  });

  it("preserves short content", () => {
    const shortContent = "Short post";
    const result = trimContentForChannel(shortContent, "twitter");
    expect(result).toBe(shortContent);
  });
});

describe("createDistributionQueue", () => {
  it("creates queue from scheduled items", () => {
    const items = [
      makeContent({ id: "1", status: "scheduled", scheduledAt: new Date() }),
      makeContent({ id: "2", status: "draft" }),
      makeContent({ id: "3", status: "scheduled", scheduledAt: new Date(Date.now() + 3600000) }),
    ];
    const queue = createDistributionQueue(items);
    expect(queue).toHaveLength(2);
  });

  it("sorts by priority", () => {
    const now = new Date();
    const items = [
      makeContent({
        id: "later",
        status: "scheduled",
        scheduledAt: new Date(now.getTime() + 7200000),
      }),
      makeContent({
        id: "sooner",
        status: "scheduled",
        scheduledAt: new Date(now.getTime() + 1000),
      }),
    ];
    const queue = createDistributionQueue(items);
    expect(queue[0]!.item.id).toBe("sooner");
  });
});

describe("handleDistributionFailure", () => {
  it("suggests retry for first failure", () => {
    const item = makeContent({ retryCount: 0, maxRetries: 3 });
    const result = handleDistributionFailure(item, "Network error");
    expect(result.shouldRetry).toBe(true);
    expect(result.retryAfter).toBeDefined();
  });

  it("does not retry after max attempts", () => {
    const item = makeContent({ retryCount: 3, maxRetries: 3 });
    const result = handleDistributionFailure(item, "Network error");
    expect(result.shouldRetry).toBe(false);
    expect(result.finalError).toBeDefined();
  });
});

describe("calculateChannelAnalytics", () => {
  it("calculates analytics for channel", () => {
    const items = [
      makeContent({ channel: "twitter", status: "published", publishedAt: new Date() }),
      makeContent({ id: "2", channel: "twitter", status: "failed" }),
      makeContent({ id: "3", channel: "linkedin", status: "published" }),
    ];
    const result = calculateChannelAnalytics(items, "twitter");
    expect(result.totalPublished).toBe(1);
    expect(result.totalFailed).toBe(1);
    expect(result.channel).toBe("twitter");
  });
});

describe("generateCrossPostSchedule", () => {
  it("generates schedule for multiple channels", () => {
    const channels: DistributionChannel[] = ["twitter", "linkedin", "reddit"];
    const result = generateCrossPostSchedule(
      "Test content",
      "Test Title",
      channels
    );
    expect(result).toHaveLength(3);
    expect(result[0]!.channel).toBe("twitter");
    expect(result[1]!.channel).toBe("linkedin");
    expect(result[2]!.channel).toBe("reddit");
  });

  it("staggers posting times", () => {
    const channels: DistributionChannel[] = ["twitter", "linkedin"];
    const result = generateCrossPostSchedule(
      "Test content",
      "Test Title",
      channels
    );
    expect(result[1]!.scheduledAt.getTime()).toBeGreaterThan(
      result[0]!.scheduledAt.getTime()
    );
  });
});
