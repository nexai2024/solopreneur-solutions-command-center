import { describe, expect, it } from "vitest";
import {
  FEATURE_CATEGORIES,
  isFeatureCategory,
  priorityForFeatureCategory,
  slugify,
} from "@/lib/project-features";

describe("project-features helpers", () => {
  it("recognizes all feature categories", () => {
    for (const cat of FEATURE_CATEGORIES) {
      expect(isFeatureCategory(cat)).toBe(true);
    }
    expect(isFeatureCategory("Other")).toBe(false);
  });

  it("maps category to task priority", () => {
    expect(priorityForFeatureCategory("MVP")).toBe("high");
    expect(priorityForFeatureCategory("Production")).toBe("medium");
    expect(priorityForFeatureCategory("Planned")).toBe("low");
    expect(priorityForFeatureCategory("Nice to have")).toBe("low");
  });

  it("slugifies names for public URLs", () => {
    expect(slugify("My Cool App!")).toBe("my-cool-app");
    expect(slugify("  Acme Copilot  ")).toBe("acme-copilot");
  });
});
