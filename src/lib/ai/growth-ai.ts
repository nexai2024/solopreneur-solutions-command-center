import { aiComplete } from "@/lib/ai-config";

export async function suggestKeywords(projectName: string, projectDescription: string) {
  const prompt = `Suggest 8 SEO keywords for:
Project: ${projectName}
Description: ${projectDescription || "N/A"}

Return JSON: { "result": [{ "keyword": "...", "difficulty": 1-100, "search_volume": number }] }`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt: "You are an SEO expert. Return valid JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as {
      result?: Array<{ keyword: string; difficulty: number; search_volume: number }>;
    };
    return parsed.result ?? [];
  } catch {
    return [
      { keyword: `${projectName} tool`, difficulty: 45, search_volume: 1200 },
      { keyword: `best ${projectName}`, difficulty: 60, search_volume: 800 },
    ];
  }
}

export async function generateContentIdeas(projectName: string, projectDescription: string) {
  const prompt = `Generate 5 content ideas for:
Project: ${projectName}
Description: ${projectDescription || "N/A"}

Return JSON: { "result": [{ "title": "...", "type": "blog|twitter|newsletter|video", "description": "..." }] }`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt: "You are a content marketing strategist. Return valid JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as {
      result?: Array<{ title: string; type: string; description: string }>;
    };
    return parsed.result ?? [];
  } catch {
    return [
      {
        title: `Why I built ${projectName}`,
        type: "blog",
        description: "Founder story post for launch.",
      },
    ];
  }
}

export async function brainstormNodeAI(
  action: "explode" | "validate" | "enhance" | "analyze" | "develop",
  nodeContent: string,
  sessionContext?: string
) {
  const { brainstormNodeAI: run } = await import("@/lib/ai/brainstorm-ai");
  return run(action, nodeContent, sessionContext);
}
