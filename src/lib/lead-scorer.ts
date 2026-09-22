/**
 * Automated Lead Scoring Engine
 *
 * Deterministic, explainable 0-100 scoring based on intent signals already
 * stored in lead metadata by the AI lead finder. Zero AI calls — scores are
 * free, instant, and stable for sorting.
 *
 * Score dimensions:
 *  - Intent signals (pain/buying language in post body)  — 30 pts
 *  - Relevance score from AI discovery                   — 25 pts
 *  - Recency of the post                                 — 15 pts
 *  - Engagement (comments/upvotes)                       — 15 pts
 *  - Contactability (author info, email, platform)       — 10 pts
 *  - Reachability bonus (DM-able platform)               —  5 pts
 */

export type ScoreableLead = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  contactName?: string | null;
  email?: string | null;
  source?: string | null;
  url?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type LeadScoreBreakdown = {
  total: number;
  grade: "hot" | "warm" | "cool" | "cold";
  reasons: string[];
  dimensions: {
    intent: number;
    relevance: number;
    recency: number;
    engagement: number;
    contactability: number;
    reachability: number;
  };
};

const PAIN_WORDS = [
  "struggling", "stuck", "frustrated", "hate", "pain", "annoying",
  "can't figure out", "cannot figure out", "no solution", "wasted hours",
  "nothing works", "so hard", "impossible", "help needed", "desperate",
];

const BUYING_WORDS = [
  "willing to pay", "looking for a tool", "budget", "quote", "pricing",
  "recommend", "shut up and take my money", "would pay", "subscription",
  "any suggestions for paid", "worth paying",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textOf(lead: ScoreableLead): string {
  return [
    lead.title ?? "",
    lead.description ?? "",
    typeof lead.metadata.post_body === "string" ? lead.metadata.post_body : "",
  ]
    .join(" ")
    .toLowerCase();
}

function countMatches(haystack: string, needles: string[]): number {
  return needles.reduce((count, word) => (haystack.includes(word) ? count + 1 : count), 0);
}

function scoreIntent(lead: ScoreableLead): { points: number; reasons: string[] } {
  const text = textOf(lead);
  const painHits = countMatches(text, PAIN_WORDS);
  const buyingHits = countMatches(text, BUYING_WORDS);

  const painPoints = clamp(painHits * 6, 0, 18);
  const buyingPoints = clamp(buyingHits * 8, 0, 12);
  const points = painPoints + buyingPoints;

  const reasons: string[] = [];
  if (buyingHits > 0) reasons.push(`Buying language detected (${buyingHits} signal${buyingHits > 1 ? "s" : ""})`);
  if (painHits > 0) reasons.push(`Pain-point language detected (${painHits} signal${painHits > 1 ? "s" : ""})`);
  if (points === 0) reasons.push("No strong intent language found");

  return { points, reasons };
}

function scoreRelevance(lead: ScoreableLead): { points: number; reasons: string[] } {
  const raw = lead.metadata.relevance_score;
  const score = typeof raw === "number" ? clamp(raw, 0, 1) : typeof raw === "number" && raw > 1 ? clamp(raw / 100, 0, 1) : null;

  if (score === null) return { points: 8, reasons: ["No AI relevance data — neutral score"] };

  const points = Math.round(score * 25);
  const reasons =
    points >= 20
      ? ["High AI relevance match"]
      : points >= 12
        ? ["Moderate AI relevance match"]
        : ["Low AI relevance match"];
  return { points, reasons };
}

function scoreRecency(lead: ScoreableLead): { points: number; reasons: string[] } {
  const postedAt = typeof lead.metadata.posted_at === "string" ? new Date(lead.metadata.posted_at) : null;
  const ref = postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : lead.createdAt;
  const ageDays = Math.max(0, (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));

  if (ageDays <= 1) return { points: 15, reasons: ["Posted within 24 hours"] };
  if (ageDays <= 3) return { points: 12, reasons: ["Posted within 3 days"] };
  if (ageDays <= 7) return { points: 9, reasons: ["Posted within a week"] };
  if (ageDays <= 14) return { points: 5, reasons: ["Posted within two weeks"] };
  return { points: 2, reasons: [`Post is ${Math.floor(ageDays)} days old`] };
}

function scoreEngagement(lead: ScoreableLead): { points: number; reasons: string[] } {
  const comments = typeof lead.metadata.comment_count === "number" ? lead.metadata.comment_count : 0;
  const upvotes = typeof lead.metadata.score === "number" ? lead.metadata.score : 0;

  const points = clamp(Math.floor(comments * 2) + Math.floor(upvotes / 10), 0, 15);
  if (points >= 10) return { points, reasons: ["High engagement thread"] };
  if (points >= 4) return { points, reasons: ["Moderate engagement thread"] };
  return { points, reasons: ["Low engagement thread"] };
}

function scoreContactability(lead: ScoreableLead): { points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];

  if (lead.email) {
    points += 5;
    reasons.push("Email address available");
  }
  if (lead.contactName || typeof lead.metadata.author === "string") {
    points += 3;
    reasons.push("Known author/identity");
  }
  if (lead.url) {
    points += 2;
    reasons.push("Source thread linked");
  }
  if (reasons.length === 0) reasons.push("Limited contact information");

  return { points: clamp(points, 0, 10), reasons };
}

function scoreReachability(lead: ScoreableLead): { points: number; reasons: string[] } {
  const platform = String(lead.metadata.platform ?? lead.source ?? "").toLowerCase();
  const dmFriendly = ["twitter", "x", "linkedin", "reddit"].some((p) => platform.includes(p));

  return dmFriendly
    ? { points: 5, reasons: [`Direct outreach possible via ${platform}`] }
    : { points: 2, reasons: ["Public-thread outreach only"] };
}

/** Score a single lead. Pure function — no DB, no AI. */
export function scoreLead(lead: ScoreableLead): LeadScoreBreakdown {
  const intent = scoreIntent(lead);
  const relevance = scoreRelevance(lead);
  const recency = scoreRecency(lead);
  const engagement = scoreEngagement(lead);
  const contactability = scoreContactability(lead);
  const reachability = scoreReachability(lead);

  const total = clamp(
    intent.points +
      relevance.points +
      recency.points +
      engagement.points +
      contactability.points +
      reachability.points,
    0,
    100
  );

  const grade: LeadScoreBreakdown["grade"] =
    total >= 75 ? "hot" : total >= 55 ? "warm" : total >= 35 ? "cool" : "cold";

  return {
    total,
    grade,
    reasons: [
      ...intent.reasons,
      ...relevance.reasons,
      ...recency.reasons,
      ...engagement.reasons,
      ...contactability.reasons,
      ...reachability.reasons,
    ],
    dimensions: {
      intent: intent.points,
      relevance: relevance.points,
      recency: recency.points,
      engagement: engagement.points,
      contactability: contactability.points,
      reachability: reachability.points,
    },
  };
}

export type ScoredLead<T> = T & { score: LeadScoreBreakdown };

/** Score and sort leads hottest-first. Pure function. */
export function rankLeads<T extends ScoreableLead>(leads: T[]): ScoredLead<T>[] {
  return leads
    .map((lead) => ({ ...lead, score: scoreLead(lead) }))
    .sort((a, b) => b.score.total - a.score.total);
}
