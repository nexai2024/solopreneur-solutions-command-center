import { aiComplete } from "@/lib/ai-config";
import type { GeneratedTask } from "./task-generator";

export interface StarterTaskInput {
  projectTitle: string;
  projectDescription: string;
}

export const DEFAULT_STARTER_TASKS: GeneratedTask[] = [
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
  {
    title: "Build landing page",
    description: "Create a simple page explaining the value prop with a waitlist or signup CTA.",
    priority: "MEDIUM",
    estimatedHours: 4,
  },
  {
    title: "Implement core user flow",
    description: "Ship the single most important workflow end-to-end.",
    priority: "URGENT",
    estimatedHours: 8,
  },
  {
    title: "Identify first 10 users",
    description: "List specific people or communities to reach out to for early feedback.",
    priority: "MEDIUM",
    estimatedHours: 2,
  },
];

export async function generateProjectStarterTasks(
  input: StarterTaskInput
): Promise<GeneratedTask[]> {
  try {
    const systemPrompt = `You are a startup advisor helping solopreneurs launch MVPs quickly. Generate practical kickoff tasks for a brand-new project.

Always return valid JSON.`;

    const prompt = `Create 5-7 starter tasks for launching this new project:

Project: ${input.projectTitle}
Description: ${input.projectDescription || "No description provided"}

Tasks should cover: MVP scoping, technical setup, landing page, core feature build, and first user outreach.
Keep tasks actionable and completable within 1-2 days each.

Return JSON: { "tasks": [{ "title": "...", "description": "...", "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "estimatedHours": number }] }`;

    const response = await aiComplete({
      prompt,
      systemPrompt,
      jsonMode: true,
    });

    const parsed = JSON.parse(response) as { tasks?: GeneratedTask[] };
    if (parsed.tasks?.length) {
      return parsed.tasks;
    }
  } catch {
    // Fall through to defaults
  }

  return DEFAULT_STARTER_TASKS;
}
