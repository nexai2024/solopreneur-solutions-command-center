export const FEATURE_CATEGORIES = [
  "MVP",
  "Production",
  "Planned",
  "Nice to have",
] as const;

export type FeatureCategory = (typeof FEATURE_CATEGORIES)[number];

export const FEATURE_STATUSES = ["todo", "in_progress", "done", "cut"] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export function isFeatureCategory(value: string): value is FeatureCategory {
  return (FEATURE_CATEGORIES as readonly string[]).includes(value);
}

export function isFeatureStatus(value: string): value is FeatureStatus {
  return (FEATURE_STATUSES as readonly string[]).includes(value);
}

export function priorityForFeatureCategory(
  category: FeatureCategory
): "low" | "medium" | "high" {
  switch (category) {
    case "MVP":
      return "high";
    case "Production":
      return "medium";
    case "Planned":
    case "Nice to have":
    default:
      return "low";
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
