import { describe, expect, it } from "vitest";
import {
  scoreLead,
  rankLeads,
  type ScoreableLead,
  type LeadScoreBreakdown,
} from "@/lib/lead-scorer";

function makeLead(overrides: Partial<ScoreableLead> = {}): ScoreableLead {
  return {
    id: "lead-1",
    title: "Looking for a task management tool",
    description: "I am struggling to keep my solo business organized. Any recommendations?",
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
      post_body: "I am struggling to keep my solo business organized.",
    },
    createdAt: new Date(),
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("returns a score between 0 and 100", () => {
    const lead = makeLead();
    const result = scoreLead(lead);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("assigns hot grade for high scores", () => {
    const lead = makeLead({
      title: "Looking for a tool to pay for",
      description: "I am frustrated and desperate for a solution. Willing to pay!",
      metadata: {
        platform: "twitter",
        comment_count: 50,
        score: 100,
        relevance_score: 0.95,
        post_body: "I am frustrated and desperate. Willing to pay!",
      },
      email: "test@example.com",
      contactName: "John",
    });
    const result = scoreLead(lead);
    expect(result.grade).toBe("hot");
    expect(result.total).toBeGreaterThanOrEqual(75);
  });

  it("assigns cold grade for low scores", () => {
    const lead = makeLead({
      title: "Random post",
      description: "Just sharing something",
      metadata: {},
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });
    const result = scoreLead(lead);
    expect(["cold", "cool"]).toContain(result.grade);
  });

  it("includes reasons for scoring", () => {
    const lead = makeLead();
    const result = scoreLead(lead);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe("rankLeads", () => {
  it("sorts leads by score descending", () => {
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
          post_body: "Frustrated and desperate. Willing to pay!",
        },
        email: "test@example.com",
        contactName: "John",
      }),
    ];
    const ranked = rankLeads(leads);
    expect(ranked[0].id).toBe("high");
    expect(ranked[0].score.total).toBeGreaterThanOrEqual(ranked[1].score.total);
  });

  it("preserves original lead data", () => {
    const lead = makeLead({ id: "custom-id" });
    const ranked = rankLeads([lead]);
    expect(ranked[0].id).toBe("custom-id");
  });
});
