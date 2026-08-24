import { aiComplete } from "@/lib/ai-config";
import type { GeneratedTask } from "./task-generator";
import {
  DEFAULT_STARTER_MILESTONES,
  type GeneratedMilestone,
} from "./starter-milestones";

export type StarterPlanMilestone = GeneratedMilestone & {
  tasks: GeneratedTask[];
};

/** Default launch plan: each milestone has the tasks that unlock it. */
export const DEFAULT_STARTER_PLAN: StarterPlanMilestone[] = [
  {
    title: "MVP scope locked",
    daysFromNow: 7,
    tasks: [
      {
        title: "Define MVP scope",
        description: "List must-have features for v1 and cut everything else.",
        priority: "HIGH",
        estimatedHours: 2,
      },
      {
        title: "Set up project repository",
        description: "Initialize repo, README, and basic project structure.",
        priority: "HIGH",
        estimatedHours: 1,
      },
    ],
  },
  {
    title: "Core feature built",
    daysFromNow: 14,
    tasks: [
      {
        title: "Implement core user flow",
        description: "Ship the single most important workflow end-to-end.",
        priority: "URGENT",
        estimatedHours: 8,
      },
    ],
  },
  {
    title: "Landing page live",
    daysFromNow: 21,
    tasks: [
      {
        title: "Build landing page",
        description:
          "Create a simple page explaining the value prop with a waitlist or signup CTA.",
        priority: "MEDIUM",
        estimatedHours: 4,
      },
    ],
  },
  {
    title: "MVP shipped to first users",
    daysFromNow: 30,
    tasks: [
      {
        title: "Identify first 10 users",
        description:
          "List specific people or communities to reach out to for early feedback.",
        priority: "MEDIUM",
        estimatedHours: 2,
      },
      {
        title: "Ship MVP to first users",
        description:
          "Deploy a usable build and get it in front of at least a few real users.",
        priority: "HIGH",
        estimatedHours: 4,
      },
    ],
  },
];

export interface StarterPlanInput {
  projectTitle: string;
  projectDescription: string;
  aiScore?: number | null;
}

/**
 * Generate a linked milestone → tasks plan so completing tasks unlocks milestones.
 */
export async function generateProjectStarterPlan(
  input: StarterPlanInput
): Promise<StarterPlanMilestone[]> {
  try {
    const scoreHint =
      input.aiScore != null
        ? `The idea scored ${input.aiScore.toFixed(1)}/100 on viability — adjust timeline ambition accordingly.`
        : "";

    const systemPrompt = `You are a startup advisor creating a realistic 30-day launch plan for solopreneurs.
Each milestone must include 1-3 concrete tasks that, when all done, mean that milestone is complete.
Milestones should be sequential. Always return valid JSON.`;

    const prompt = `Create a linked launch plan for:

Project: ${input.projectTitle}
Description: ${input.projectDescription || "No description provided"}
${scoreHint}

Return 4-5 milestones. Include a clear "MVP shipped" milestone around day 30.
Each milestone needs: title, daysFromNow (integer), and tasks[] with title, description, priority (LOW|MEDIUM|HIGH|URGENT), estimatedHours.

Return JSON:
{
  "milestones": [
    {
      "title": "...",
      "daysFromNow": number,
      "tasks": [{ "title": "...", "description": "...", "priority": "HIGH", "estimatedHours": 2 }]
    }
  ]
}`;

    const response = await aiComplete({
      prompt,
      systemPrompt,
      jsonMode: true,
    });

    const parsed = JSON.parse(response) as {
      milestones?: Array<{
        title?: string;
        daysFromNow?: number;
        tasks?: GeneratedTask[];
      }>;
    };

    if (parsed.milestones?.length) {
      const plan = parsed.milestones
        .filter(
          (m): m is { title: string; daysFromNow: number; tasks?: GeneratedTask[] } =>
            Boolean(m.title && typeof m.daysFromNow === "number" && m.daysFromNow > 0)
        )
        .map((m) => ({
          title: m.title,
          daysFromNow: m.daysFromNow,
          tasks: (m.tasks ?? [])
            .filter((t) => t.title)
            .map((t) => ({
              title: t.title,
              description: t.description || "",
              priority: t.priority || "MEDIUM",
              estimatedHours: Number(t.estimatedHours) || 2,
            })),
        }))
        .sort((a, b) => a.daysFromNow - b.daysFromNow)
        .filter((m) => m.tasks.length > 0);

      if (plan.length > 0) return plan;
    }
  } catch {
    // Fall through to defaults
  }

  return DEFAULT_STARTER_PLAN;
}

/** Fallback when only milestones exist (legacy callers). */
export function milestonesFromPlan(
  plan: StarterPlanMilestone[] = DEFAULT_STARTER_PLAN
): GeneratedMilestone[] {
  return plan.map(({ title, daysFromNow }) => ({ title, daysFromNow }));
}

export { DEFAULT_STARTER_MILESTONES };
