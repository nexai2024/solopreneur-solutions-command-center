import { aiComplete } from "@/lib/ai-config";

export interface TaskGeneratorOptions {
  featureTitle: string;
  featureDescription: string;
  projectTitle: string;
  projectDescription: string;
  techStack: string[];
  existingTasks: string[];
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimatedHours: number;
}

export async function generateFeatureTasks(
  options: TaskGeneratorOptions
): Promise<GeneratedTask[]> {
  const systemPrompt = `You are a senior software engineer who breaks down features into actionable development tasks. You create clear, specific tasks with accurate time estimates.

Always return valid JSON.`;

  const prompt = `Break down this feature into development tasks:

Feature: ${options.featureTitle}
Description: ${options.featureDescription}

Project context:
- Project: ${options.projectTitle}
- Description: ${options.projectDescription}
- Tech stack: ${options.techStack.join(", ") || "Not specified"}

${options.existingTasks.length > 0 ? `Existing tasks (avoid duplicates):\n${options.existingTasks.map(t => `- ${t}`).join("\n")}` : ""}

Generate 3-8 specific, actionable development tasks. Each task should be completable in a single work session.

Return JSON: { "tasks": [{ "title": "...", "description": "...", "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "estimatedHours": number }] }`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
  });

  const parsed = JSON.parse(response);
  return parsed.tasks || [];
}
