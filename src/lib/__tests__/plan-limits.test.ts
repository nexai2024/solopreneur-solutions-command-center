import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, resolvePlanTier } from "@/lib/plan-limits";

describe("plan-limits", () => {
  it("resolves free tier by default", () => {
    expect(resolvePlanTier(null)).toBe("free");
    expect(resolvePlanTier(undefined)).toBe("free");
    expect(resolvePlanTier("free")).toBe("free");
  });

  it("resolves pro tier for active subscriptions", () => {
    expect(resolvePlanTier("pro")).toBe("pro");
    expect(resolvePlanTier("active")).toBe("pro");
  });

  it("defines increasing limits per tier", () => {
    expect(PLAN_LIMITS.pro.maxProjects).toBeGreaterThan(PLAN_LIMITS.free.maxProjects);
    expect(PLAN_LIMITS.enterprise.maxLeads).toBeGreaterThan(PLAN_LIMITS.pro.maxLeads);
  });
});
