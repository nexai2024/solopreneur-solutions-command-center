import { describe, expect, it } from "vitest";
import {
  calculateCompositeScore,
  interpretCompositeScore,
  IDEA_SCORE_WEIGHTS,
} from "@/lib/idea-scorer";

describe("idea-scorer", () => {
  it("weights sum to 1.0", () => {
    const sum = Object.values(IDEA_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("calculates weighted composite score", () => {
    const score = calculateCompositeScore({
      marketSizeScore: 80,
      marketGrowthScore: 70,
      problemSeverityScore: 90,
      competitiveAdvantageScore: 60,
      executionFeasibilityScore: 75,
      monetizationScore: 65,
      timingScore: 70,
    });
    expect(score).toBeGreaterThan(60);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns max score when all dimensions are 100", () => {
    const perfect = {
      marketSizeScore: 100,
      marketGrowthScore: 100,
      problemSeverityScore: 100,
      competitiveAdvantageScore: 100,
      executionFeasibilityScore: 100,
      monetizationScore: 100,
      timingScore: 100,
    };
    expect(calculateCompositeScore(perfect)).toBe(100);
  });

  it("interprets composite score bands", () => {
    expect(interpretCompositeScore(85)).toContain("Exceptional");
    expect(interpretCompositeScore(70)).toContain("Strong");
    expect(interpretCompositeScore(55)).toContain("Moderate");
    expect(interpretCompositeScore(40)).toContain("Weak");
    expect(interpretCompositeScore(20)).toContain("challenges");
  });
});
