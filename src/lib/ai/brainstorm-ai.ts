import { aiComplete, AI_MODEL, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export type IdeaSuggestion = {
  title: string;
  description: string;
  targetUser: string;
  monetization: string;
};

export type VettingSuggestion = {
  core_problem: string;
  proposed_solution: string;
  target_user_persona: string;
  estimated_complexity: number;
  market_need_intensity: number;
  tech_stack_familiarity: number;
  monetization_potential: boolean;
  time_to_mvp_days: number;
  target_technology: string;
  dependency_risk: string;
  summary: string;
};

export async function generateIdeaSuggestions(
  niche: string,
  count = 5
): Promise<IdeaSuggestion[]> {
  const response = await aiComplete({
    model: AI_MODEL_ADVANCED,
    jsonMode: true,
    systemPrompt:
      "You are a solopreneur ideation coach. Generate practical, buildable SaaS/product ideas. Return valid JSON only.",
    prompt: `Generate ${count} distinct product ideas for this niche or interest: "${niche}"

Return JSON:
{
  "ideas": [
    {
      "title": "short product name",
      "description": "2-3 sentences: problem, solution, differentiation",
      "targetUser": "specific persona",
      "monetization": "how it makes money"
    }
  ]
}`,
  });

  const parsed = JSON.parse(response) as { ideas?: IdeaSuggestion[] };
  return parsed.ideas ?? [];
}

export async function enhanceIdeaText(
  title: string,
  description: string
): Promise<{ title: string; description: string }> {
  const response = await aiComplete({
    model: AI_MODEL,
    jsonMode: true,
    systemPrompt: "You improve startup idea pitches for clarity and investor-readiness. Return valid JSON only.",
    prompt: `Improve this idea pitch. Keep the same core concept but make it sharper.

Title: ${title}
Description: ${description || "No description yet"}

Return JSON: { "title": "...", "description": "..." }`,
  });

  const parsed = JSON.parse(response) as { title?: string; description?: string };
  return {
    title: parsed.title?.trim() || title,
    description: parsed.description?.trim() || description,
  };
}

export async function generateSessionIdeas(
  sessionTitle: string,
  prompt: string,
  count = 4
): Promise<Array<{ content: string; nodeType: string }>> {
  const response = await aiComplete({
    model: AI_MODEL_ADVANCED,
    jsonMode: true,
    systemPrompt: "You help founders brainstorm on a canvas. Return valid JSON only.",
    prompt: `Session: "${sessionTitle}"
Brainstorm prompt: "${prompt}"

Generate ${count} root-level idea nodes for a brainstorm canvas. Mix Idea, Research, and Marketing node types.

Return JSON:
{
  "nodes": [
    { "content": "...", "nodeType": "Idea|Feature|Research|Marketing|Risk" }
  ]
}`,
  });

  const parsed = JSON.parse(response) as {
    nodes?: Array<{ content: string; nodeType: string }>;
  };
  return parsed.nodes ?? [];
}

export async function autoFillVettingFields(
  nodeContent: string,
  sessionContext?: string
): Promise<VettingSuggestion> {
  const response = await aiComplete({
    model: AI_MODEL_ADVANCED,
    jsonMode: true,
    systemPrompt:
      "You are a startup advisor filling out an idea vetting worksheet. Be specific and realistic. Return valid JSON only.",
    prompt: `Fill vetting fields for this idea:

"${nodeContent}"
${sessionContext ? `\nSession context: ${sessionContext}` : ""}

Return JSON:
{
  "core_problem": "...",
  "proposed_solution": "...",
  "target_user_persona": "...",
  "estimated_complexity": 1-5 (1=hardest),
  "market_need_intensity": 1-5 (5=critical),
  "tech_stack_familiarity": 1-5 (5=expert),
  "monetization_potential": true/false,
  "time_to_mvp_days": number,
  "target_technology": "Web|Mobile|Desktop|Extension|AI/ML|Web3",
  "dependency_risk": "...",
  "summary": "one sentence viability take"
}`,
  });

  const parsed = JSON.parse(response) as VettingSuggestion;
  return {
    core_problem: parsed.core_problem ?? "",
    proposed_solution: parsed.proposed_solution ?? "",
    target_user_persona: parsed.target_user_persona ?? "",
    estimated_complexity: clamp(parsed.estimated_complexity, 1, 5, 3),
    market_need_intensity: clamp(parsed.market_need_intensity, 1, 5, 3),
    tech_stack_familiarity: clamp(parsed.tech_stack_familiarity, 1, 5, 3),
    monetization_potential: Boolean(parsed.monetization_potential),
    time_to_mvp_days: clamp(parsed.time_to_mvp_days, 7, 180, 30),
    target_technology: parsed.target_technology ?? "Web",
    dependency_risk: parsed.dependency_risk ?? "",
    summary: parsed.summary ?? "",
  };
}

export async function brainstormCopilotReply(
  message: string,
  context: {
    sessionTitle?: string;
    nodes?: string[];
    activeIdea?: string;
  },
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  const nodeList = context.nodes?.length
    ? `\nIdeas on canvas:\n${context.nodes.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
    : "";

  const historyBlock = history.length
    ? `\nRecent conversation:\n${history
        .slice(-12)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n")}\n`
    : "";

  return aiComplete({
    model: AI_MODEL_ADVANCED,
    systemPrompt: `You are a brainstorming co-pilot for solopreneurs. Be concise, actionable, and creative.
Help with: idea refinement, pivot suggestions, feature prioritization, GTM angles, naming, and what to build first.
Use bullet points when listing options. Keep responses under 200 words unless asked for detail.
Continue the conversation naturally when prior messages are provided.`,
    prompt: `Session: ${context.sessionTitle ?? "Brainstorm"}
${context.activeIdea ? `Focus idea: ${context.activeIdea}` : ""}
${nodeList}
${historyBlock}

User: ${message}`,
  });
}

export function formatCopilotHistoryForProject(
  messages: Array<{ role: string; content: string; createdAt?: Date }>
): string {
  if (messages.length === 0) return "";

  const recent = messages.slice(-8);
  const lines = recent.map((m) => {
    const label = m.role === "user" ? "You" : "Co-pilot";
    const text = m.content.length > 280 ? `${m.content.slice(0, 277)}…` : m.content;
    return `• ${label}: ${text}`;
  });

  return `\n\n---\nAI Co-pilot notes (from brainstorm session):\n${lines.join("\n")}`;
}

export async function brainstormNodeAI(
  action: "explode" | "validate" | "enhance" | "analyze" | "develop",
  nodeContent: string,
  sessionContext?: string
) {
  const actionPrompts: Record<string, string> = {
    explode: `Break this into 5-7 concrete sub-branches. Mix features, risks, research angles, and marketing hooks.
Return JSON: { "nodes": [{ "label": "...", "nodeType": "Feature|Risk|Research|Marketing|User Story|Task" }] }`,
    validate: `Quick market validation. Return JSON matching:
{ "score": 1-10, "verdict": "Strong|Moderate|Weak", "strengths": ["..."], "risks": ["..."], "suggestion": "..." }`,
    enhance: `Rewrite this idea to be clearer and more compelling for a solo founder.
Return JSON: { "content": "enhanced text", "title": "short title" }`,
    analyze: `Deep market analysis. Return JSON:
{ "marketFit": { "score": 1-10, "targetAudience": "...", "painPoints": [], "competitors": [] },
  "feasibility": { "score": 1-10, "technicalComplexity": "...", "timeToMVP": "...", "resourceRequirements": [] },
  "valuation": { "potential": "High|Medium|Low", "monetizationModels": [], "estimatedTAM": "..." } }`,
    develop: `Product blueprint for MVP. Return JSON:
{ "description": "...", "features": [{ "name": "...", "priority": "Must-have|Should-have|Could-have", "description": "..." }],
  "userStories": ["..."], "personas": [{ "name": "...", "role": "...", "goals": [] }] }`,
  };

  const response = await aiComplete({
    model: AI_MODEL_ADVANCED,
    jsonMode: true,
    systemPrompt: "You are an expert startup advisor. Return valid JSON only.",
    prompt: `${actionPrompts[action]}

Idea: ${nodeContent}
${sessionContext ? `Session context: ${sessionContext}` : ""}`,
  });

  return JSON.parse(response) as Record<string, unknown>;
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
