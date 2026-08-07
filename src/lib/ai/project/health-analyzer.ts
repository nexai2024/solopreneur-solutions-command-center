import { aiComplete } from "@/lib/ai-config";

export interface ProjectHealthInput {
  title: string;
  description: string;
  status: string;
  milestones: { title: string; status: string; dueDate: string | null }[];
  tasks: { title: string; status: string; priority: string; dueDate: string | null }[];
  features: { title: string; isCompleted: boolean; type: string; taskCount: number }[];
  requirements: { statement: string; isCompleted: boolean; priority: string }[];
}

export interface HealthScore {
  score: number;
  rating: "Excellent" | "Good" | "At Risk" | "Critical";
  factors: string[];
  recommendations: string[];
}

export function calculateHeuristicHealth(input: ProjectHealthInput): HealthScore {
  const factors: string[] = [];
  let score = 100;

  // Task completion rate
  const totalTasks = input.tasks.length;
  const doneTasks = input.tasks.filter(t => t.status === "DONE").length;
  const taskRate = totalTasks > 0 ? doneTasks / totalTasks : 0;

  if (totalTasks === 0) {
    score -= 15;
    factors.push("No tasks created yet");
  } else if (taskRate < 0.2) {
    score -= 20;
    factors.push(`Low task completion rate (${Math.round(taskRate * 100)}%)`);
  } else if (taskRate >= 0.7) {
    factors.push(`Strong task completion (${Math.round(taskRate * 100)}%)`);
  }

  // Blocked tasks
  const blockedTasks = input.tasks.filter(t => t.status === "BLOCKED").length;
  if (blockedTasks > 0) {
    const blockedRatio = blockedTasks / totalTasks;
    score -= Math.min(25, Math.round(blockedRatio * 50));
    factors.push(`${blockedTasks} blocked task${blockedTasks > 1 ? "s" : ""}`);
  }

  // Overdue milestones
  const now = new Date();
  const overdueMilestones = input.milestones.filter(m => {
    if (!m.dueDate || m.status === "COMPLETED") return false;
    return new Date(m.dueDate) < now;
  });
  if (overdueMilestones.length > 0) {
    score -= overdueMilestones.length * 10;
    factors.push(`${overdueMilestones.length} overdue milestone${overdueMilestones.length > 1 ? "s" : ""}`);
  }

  // Milestone progress
  const completedMilestones = input.milestones.filter(m => m.status === "COMPLETED").length;
  if (input.milestones.length > 0 && completedMilestones > 0) {
    factors.push(`${completedMilestones}/${input.milestones.length} milestones completed`);
  }

  // Feature coverage
  const featuresWithTasks = input.features.filter(f => f.taskCount > 0).length;
  if (input.features.length > 0 && featuresWithTasks < input.features.length) {
    const uncovered = input.features.length - featuresWithTasks;
    score -= uncovered * 5;
    factors.push(`${uncovered} feature${uncovered > 1 ? "s" : ""} without tasks`);
  }

  // Requirements completion
  const totalReqs = input.requirements.length;
  const completedReqs = input.requirements.filter(r => r.isCompleted).length;
  if (totalReqs > 0 && completedReqs < totalReqs) {
    const reqRate = completedReqs / totalReqs;
    if (reqRate < 0.5) {
      score -= 10;
      factors.push(`Only ${Math.round(reqRate * 100)}% of requirements met`);
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let rating: HealthScore["rating"];
  if (score >= 80) rating = "Excellent";
  else if (score >= 60) rating = "Good";
  else if (score >= 40) rating = "At Risk";
  else rating = "Critical";

  const recommendations: string[] = [];
  if (blockedTasks > 0) recommendations.push("Resolve blocked tasks to unblock progress");
  if (overdueMilestones.length > 0) recommendations.push("Review and update overdue milestone deadlines");
  if (totalTasks === 0) recommendations.push("Break down features into actionable tasks");
  if (input.features.length > 0 && featuresWithTasks < input.features.length) {
    recommendations.push("Create tasks for features that don't have any yet");
  }

  return { score, rating, factors, recommendations };
}

export async function deepHealthAnalysis(input: ProjectHealthInput): Promise<HealthScore> {
  const heuristic = calculateHeuristicHealth(input);

  const systemPrompt = `You are a project management expert. Analyze this project's health and provide actionable recommendations.

Always return valid JSON.`;

  const prompt = `Analyze this project's health:

Project: ${input.title}
Description: ${input.description}
Status: ${input.status}

Milestones (${input.milestones.length}):
${input.milestones.map(m => `- ${m.title} [${m.status}]${m.dueDate ? ` due ${m.dueDate}` : ""}`).join("\n")}

Tasks (${input.tasks.length} total, ${input.tasks.filter(t => t.status === "DONE").length} done):
- TODO: ${input.tasks.filter(t => t.status === "TODO").length}
- IN_PROGRESS: ${input.tasks.filter(t => t.status === "IN_PROGRESS").length}
- BLOCKED: ${input.tasks.filter(t => t.status === "BLOCKED").length}
- DONE: ${input.tasks.filter(t => t.status === "DONE").length}

Features (${input.features.length}):
${input.features.map(f => `- ${f.title} [${f.type}] ${f.isCompleted ? "DONE" : "in progress"} (${f.taskCount} tasks)`).join("\n")}

Current heuristic score: ${heuristic.score}/100 (${heuristic.rating})
Current factors: ${heuristic.factors.join(", ")}

Return JSON: { "score": number (0-100), "rating": "Excellent"|"Good"|"At Risk"|"Critical", "factors": string[], "recommendations": string[] }

Provide 3-5 specific, actionable recommendations based on the project's current state.`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
  });

  return JSON.parse(response);
}
