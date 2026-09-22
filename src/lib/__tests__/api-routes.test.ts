import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  scoreLead,
  rankLeads,
  type ScoreableLead,
} from "@/lib/lead-scorer";
import {
  calculateMRRHistory,
  analyzeChurn,
  forecastRevenue,
  calculateRevenueSummary,
  type Subscription,
  type Transaction,
  type Plan,
} from "@/lib/revenue-analytics";
import {
  getChannelConfig,
  getContentLimits,
  getOptimalPostTime,
  validateContent,
  trimContentForChannel,
  generateCrossPostSchedule,
  type DistributionChannel,
  type ContentItem,
} from "@/lib/content-distribution";

// --- Lead Scoring Tests ---

describe("Lead Scoring API Logic", () => {
  function makeLead(overrides: Partial<ScoreableLead> = {}): ScoreableLead {
    return {
      id: "lead-1",
      title: "Looking for a task management tool",
      description:
        "I am struggling to keep my solo business organized. Any recommendations?",
      status: "new",
      contactName: null,
      email: null,
      source: "reddit",
      url: "https://reddit.com/r/entrepreneur/123",
      metadata: {
        platform: "reddit",
        comment_count: 5,
        score: 10,
        relevance_score: 0.7,
      },
      createdAt: new Date(),
      ...overrides,
    };
  }

  it("scores a single lead", () => {
    const lead = makeLead();
    const result = scoreLead(lead);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.grade).toBeDefined();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("ranks leads by score", () => {
    const leads = [
      makeLead({ id: "low", title: "Random", metadata: {} }),
      makeLead({
        id: "high",
        title: "Looking for a tool to pay for",
        description: "Frustrated and desperate. Willing to pay!",
        metadata: {
          platform: "twitter",
          comment_count: 20,
          score: 50,
          relevance_score: 0.9,
        },
        email: "test@example.com",
        contactName: "John",
      }),
    ];
    const ranked = rankLeads(leads);
    expect(ranked[0].id).toBe("high");
    expect(ranked[0].score.total).toBeGreaterThanOrEqual(ranked[1].score.total);
  });
});

// --- Revenue Analytics Tests ---

describe("Revenue Analytics API Logic", () => {
  const samplePlans: Plan[] = [
    {
      id: "plan-1",
      name: "Starter",
      amount: 19,
      currency: "USD",
      interval: "month",
    },
    {
      id: "plan-2",
      name: "Pro",
      amount: 49,
      currency: "USD",
      interval: "month",
    },
  ];

  function makeSub(
    overrides: Partial<Subscription> = {}
  ): Subscription {
    return {
      id: "sub-1",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      canceledAt: null,
      planId: "plan-1",
      customerId: "cust-1",
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      ...overrides,
    };
  }

  function makeTxn(
    overrides: Partial<Transaction> = {}
  ): Transaction {
    return {
      id: "txn-1",
      amount: 49,
      currency: "USD",
      status: "succeeded",
      type: "payment",
      createdAt: new Date(),
      customerId: "cust-1",
      ...overrides,
    };
  }

  it("calculates MRR history", () => {
    const now = new Date();
    const subs = [makeSub({ 
      planId: "plan-2",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 1),
    })];
    const result = calculateMRRHistory(subs, samplePlans, 6);
    expect(result).toHaveLength(6);
    // MRR should be 49 for recent months when subscription is active
    const recentMRR = result.slice(-3).reduce((sum, r) => sum + r.mrr, 0);
    expect(recentMRR).toBeGreaterThan(0);
  });

  it("analyzes churn", () => {
    const subs = [
      makeSub({ id: "sub-1", status: "active" }),
      makeSub({
        id: "sub-2",
        status: "canceled",
        canceledAt: new Date(),
      }),
    ];
    const result = analyzeChurn(subs, samplePlans);
    expect(result.churnRate).toBe(0.5);
  });

  it("generates forecast", () => {
    const subs = [makeSub({ planId: "plan-2" })];
    const result = forecastRevenue(subs, samplePlans, 6);
    expect(result.months).toHaveLength(6);
    expect(result.assumptions.averageRevenuePerUser).toBe(49);
  });

  it("calculates revenue summary", () => {
    const subs = [
      makeSub({ planId: "plan-2" }),
      makeSub({ id: "sub-2", planId: "plan-1" }),
    ];
    const txns = [
      makeTxn({ amount: 49 }),
      makeTxn({ id: "txn-2", amount: 19 }),
    ];
    const result = calculateRevenueSummary(txns, subs, samplePlans);
    expect(result.currentMRR).toBe(68);
    expect(result.activeSubscriptions).toBe(2);
  });
});

// --- Content Distribution Tests ---

describe("Content Distribution API Logic", () => {
  it("returns channel config", () => {
    const config = getChannelConfig("twitter");
    expect(config.channel).toBe("twitter");
    expect(config.optimalHours.length).toBeGreaterThan(0);
  });

  it("returns content limits", () => {
    const limits = getContentLimits("twitter");
    expect(limits.maxTitle).toBe(280);
    expect(limits.maxBody).toBe(280);
  });

  it("calculates optimal post time", () => {
    const result = getOptimalPostTime("twitter");
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });

  it("validates content", () => {
    const content: ContentItem = {
      id: "test",
      projectId: "test",
      title: "Test",
      body: "Test body",
      channel: "twitter",
      status: "draft",
      scheduledAt: null,
      publishedAt: null,
      retryCount: 0,
      maxRetries: 3,
      metadata: {},
    };
    const result = validateContent(content);
    expect(result.valid).toBe(true);
  });

  it("trims content for channel", () => {
    const longContent = "x".repeat(500);
    const result = trimContentForChannel(longContent, "twitter");
    expect(result.length).toBeLessThanOrEqual(280);
  });

  it("generates cross-post schedule", () => {
    const channels: DistributionChannel[] = ["twitter", "linkedin"];
    const result = generateCrossPostSchedule(
      "Test content",
      "Test Title",
      channels
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.channel).toBe("twitter");
    expect(result[1]!.channel).toBe("linkedin");
  });
});
