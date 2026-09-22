import { describe, expect, it } from "vitest";
import {
  buildStructuralMerge,
  classifyMergeRole,
  planMerge,
  type MergeNodeInput,
} from "@/lib/brainstorm-merge";

function node(
  partial: Partial<MergeNodeInput> &
    Pick<MergeNodeInput, "id" | "title" | "nodeType">
): MergeNodeInput {
  return {
    content: partial.content ?? partial.title,
    coreProblem: partial.coreProblem ?? null,
    proposedSolution: partial.proposedSolution ?? null,
    targetUserPersona: partial.targetUserPersona ?? null,
    features: partial.features ?? [],
    ...partial,
  };
}

describe("classifyMergeRole", () => {
  it("maps known node types", () => {
    expect(classifyMergeRole("Idea")).toBe("idea");
    expect(classifyMergeRole("Feature")).toBe("feature");
    expect(classifyMergeRole("User Story")).toBe("feature");
    expect(classifyMergeRole("Research")).toBe("research");
    expect(classifyMergeRole("Risk")).toBe("risk");
    expect(classifyMergeRole("Marketing")).toBe("marketing");
    expect(classifyMergeRole("Task")).toBe("task");
    expect(classifyMergeRole("Unknown")).toBe("other");
  });
});

describe("planMerge / buildStructuralMerge combinations", () => {
  it("Idea + Feature → enrich_primary_idea; Idea title preserved; feature attached", () => {
    const plan = planMerge([
      node({
        id: "i1",
        title: "Invoice Copilot",
        nodeType: "Idea",
        content: "AI that drafts invoices",
        coreProblem: "Freelancers hate invoicing",
        proposedSolution: "Auto-draft from time logs",
        targetUserPersona: "Freelancers",
      }),
      node({
        id: "f1",
        title: "Stripe sync",
        nodeType: "Feature",
      }),
    ]);

    expect(plan.strategy).toBe("enrich_primary_idea");
    expect(plan.primaryIdeas).toHaveLength(1);
    expect(plan.featureLabels).toContain("Stripe sync");

    const structural = buildStructuralMerge(plan);
    expect(structural.title).toBe("Invoice Copilot");
    expect(structural.coreProblem).toBe("Freelancers hate invoicing");
    expect(structural.combinedFeatures).toEqual(["Stripe sync"]);
    expect(structural.needsAiPolish).toBe(false);
  });

  it("Idea + User Story + Task → features include both story and task", () => {
    const plan = planMerge([
      node({ id: "i1", title: "CRM Lite", nodeType: "Idea" }),
      node({ id: "us1", title: "As a rep I log calls", nodeType: "User Story" }),
      node({ id: "t1", title: "Add call form", nodeType: "Task" }),
    ]);

    expect(plan.strategy).toBe("enrich_primary_idea");
    expect(plan.featureLabels).toEqual(
      expect.arrayContaining(["As a rep I log calls", "Add call form"])
    );

    const structural = buildStructuralMerge(plan);
    expect(structural.title).toBe("CRM Lite");
    expect(structural.combinedFeatures).toEqual(
      expect.arrayContaining(["As a rep I log calls", "Add call form"])
    );
  });

  it("Idea + Research + Risk + Marketing → enrich with polish; notes not features", () => {
    const plan = planMerge([
      node({ id: "i1", title: "Niche SEO tool", nodeType: "Idea" }),
      node({
        id: "r1",
        title: "Competitors charge $49/mo",
        nodeType: "Research",
      }),
      node({ id: "rk1", title: "Google API quota", nodeType: "Risk" }),
      node({ id: "m1", title: "Reddit GTM", nodeType: "Marketing" }),
    ]);

    expect(plan.strategy).toBe("enrich_primary_idea");
    expect(plan.featureLabels).toEqual([]);
    expect(plan.research).toHaveLength(1);
    expect(plan.risks).toHaveLength(1);
    expect(plan.marketing).toHaveLength(1);

    const structural = buildStructuralMerge(plan);
    expect(structural.title).toBe("Niche SEO tool");
    expect(structural.combinedFeatures).toEqual([]);
    expect(structural.content).toContain("Research");
    expect(structural.content).toContain("Risks");
    expect(structural.content).toContain("Marketing");
    expect(structural.needsAiPolish).toBe(true);
  });

  it("Idea with existing child features + selected Feature → unions and dedupes", () => {
    const plan = planMerge([
      node({
        id: "i1",
        title: "Dashboard OS",
        nodeType: "Idea",
        features: ["Auth", "Billing", "Stripe sync"],
      }),
      node({ id: "f1", title: "Stripe sync", nodeType: "Feature" }),
      node({ id: "f2", title: "Analytics", nodeType: "Feature" }),
    ]);

    expect(plan.strategy).toBe("enrich_primary_idea");
    expect(plan.featureLabels).toEqual(
      expect.arrayContaining(["Auth", "Billing", "Stripe sync", "Analytics"])
    );
    expect(plan.featureLabels).toHaveLength(4);
  });

  it("2 Ideas + Feature → synthesize_ideas; feature attached", () => {
    const plan = planMerge([
      node({ id: "i1", title: "Lead Finder", nodeType: "Idea" }),
      node({ id: "i2", title: "Outreach Writer", nodeType: "Idea" }),
      node({ id: "f1", title: "CSV export", nodeType: "Feature" }),
    ]);

    expect(plan.strategy).toBe("synthesize_ideas");
    expect(plan.primaryIdeas).toHaveLength(2);
    expect(plan.featureLabels).toContain("CSV export");

    const structural = buildStructuralMerge(plan);
    expect(structural.title).toContain("Lead Finder");
    expect(structural.title).toContain("Outreach Writer");
    expect(structural.combinedFeatures).toContain("CSV export");
    expect(structural.needsAiPolish).toBe(true);
  });

  it("Features only → promote_features", () => {
    const plan = planMerge([
      node({ id: "f1", title: "Dark mode", nodeType: "Feature" }),
      node({ id: "f2", title: "Keyboard shortcuts", nodeType: "Feature" }),
    ]);

    expect(plan.strategy).toBe("promote_features");
    expect(plan.primaryIdeas).toHaveLength(0);
    expect(plan.featureLabels).toEqual(["Dark mode", "Keyboard shortcuts"]);

    const structural = buildStructuralMerge(plan);
    expect(structural.combinedFeatures).toEqual([
      "Dark mode",
      "Keyboard shortcuts",
    ]);
    expect(structural.needsAiPolish).toBe(true);
  });

  it("Features + Research → promote_features with research context", () => {
    const plan = planMerge([
      node({ id: "f1", title: "Shared inbox", nodeType: "Feature" }),
      node({ id: "r1", title: "Users complain about Gmail labels", nodeType: "Research" }),
    ]);

    expect(plan.strategy).toBe("promote_features");
    expect(plan.featureLabels).toEqual(["Shared inbox"]);
    expect(plan.research).toHaveLength(1);

    const structural = buildStructuralMerge(plan);
    expect(structural.content).toContain("Research");
    expect(structural.combinedFeatures).toEqual(["Shared inbox"]);
  });

  it("Research + Risk only → synthesize_context", () => {
    const plan = planMerge([
      node({ id: "r1", title: "Market wants local SEO", nodeType: "Research" }),
      node({ id: "rk1", title: "Yelp ToS", nodeType: "Risk" }),
    ]);

    expect(plan.strategy).toBe("synthesize_context");
    expect(plan.featureLabels).toEqual([]);

    const structural = buildStructuralMerge(plan);
    expect(structural.needsAiPolish).toBe(true);
    expect(structural.content).toContain("Research");
    expect(structural.content).toContain("Risk");
  });

  it("Marketing + Task only → synthesize_context with task as feature label", () => {
    const plan = planMerge([
      node({ id: "m1", title: "Product Hunt launch", nodeType: "Marketing" }),
      node({ id: "t1", title: "Write launch checklist", nodeType: "Task" }),
    ]);

    // Task alone without Feature/Idea: still synthesize_context but task enters featureLabels
    expect(plan.strategy).toBe("promote_features");
    expect(plan.featureLabels).toContain("Write launch checklist");
    expect(plan.marketing).toHaveLength(1);
  });

  it("Idea + Feature + Research → Idea primary, feature attached, research enriches", () => {
    const plan = planMerge([
      node({
        id: "i1",
        title: "Booking widget",
        nodeType: "Idea",
        coreProblem: "No-shows",
      }),
      node({ id: "f1", title: "SMS reminders", nodeType: "Feature" }),
      node({ id: "r1", title: "40% no-show rate in clinics", nodeType: "Research" }),
    ]);

    expect(plan.strategy).toBe("enrich_primary_idea");
    const structural = buildStructuralMerge(plan);
    expect(structural.title).toBe("Booking widget");
    expect(structural.coreProblem).toBe("No-shows");
    expect(structural.combinedFeatures).toEqual(["SMS reminders"]);
    expect(structural.content).toContain("40% no-show");
    expect(structural.needsAiPolish).toBe(true);
  });
});
