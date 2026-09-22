import { describe, expect, it } from "vitest";
import { extractFeatureHints } from "@/lib/ai/product/artifact-pack";

describe("extractFeatureHints", () => {
  it("pulls bullet features and skips section headers", () => {
    const text = `Pitch here

Combined features:
• Stripe sync
• Dark mode
- Analytics dashboard

1. Keyboard shortcuts
`;
    expect(extractFeatureHints(text)).toEqual(
      expect.arrayContaining([
        "Stripe sync",
        "Dark mode",
        "Analytics dashboard",
        "Keyboard shortcuts",
      ])
    );
    expect(extractFeatureHints(text)).not.toContain("Combined features:");
  });
});
