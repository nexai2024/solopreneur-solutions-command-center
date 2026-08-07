import { aiComplete } from "@/lib/ai-config";

export interface StarterMilestoneInput {
  projectTitle: string;
  projectDescription: string;
  aiScore?: number | null;
}

export interface GeneratedMilestone {
  title: string;
  daysFromNow: number;
}

export const DEFAULT_STARTER_MILESTONES: GeneratedMilestone[] = [
  { title: "MVP scope locked", daysFromNow: 7 },
  { title: "Core feature built", daysFromNow: 14 },
  { title: "Landing page live", daysFromNow: 21 },
  { title: "MVP shipped to first users", daysFromNow: 30 },
];

function addDays(from: Date, days: number) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

export function milestoneTargetDate(daysFromNow: number, from = new Date()) {
  return addDays(from, daysFromNow);
}

export async function generateProjectStarterMilestones(
  input: StarterMilestoneInput
): Promise<GeneratedMilestone[]> {
  try {
    const scoreHint =
      input.aiScore != null
        ? `The idea scored ${input.aiScore.toFixed(1)}/100 on viability — adjust timeline ambition accordingly.`
        : "";

    const systemPrompt = `You are a startup advisor creating realistic launch milestones for solopreneurs. Milestones should be sequential and achievable for a solo builder.

Always return valid JSON.`;

    const prompt = `Create 4-5 project milestones for:

Project: ${input.projectTitle}
Description: ${input.projectDescription || "No description provided"}
${scoreHint}

Include a clear "MVP shipped" milestone around day 30 (or sooner if the idea is simple).
Each milestone needs a title and daysFromNow (integer, days from project start).

Return JSON: { "milestones": [{ "title": "...", "daysFromNow": number }] }`;

    const response = await aiComplete({
      prompt,
      systemPrompt,
      jsonMode: true,
    });

    const parsed = JSON.parse(response) as { milestones?: GeneratedMilestone[] };
    if (parsed.milestones?.length) {
      return parsed.milestones
        .filter((m) => m.title && m.daysFromNow > 0)
        .sort((a, b) => a.daysFromNow - b.daysFromNow);
    }
  } catch {
    // Fall through to defaults
  }

  return DEFAULT_STARTER_MILESTONES;
}
