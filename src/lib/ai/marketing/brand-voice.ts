import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface BrandVoiceOptions {
  content: string;
  toneKeywords: string[];
  avoidKeywords: string[];
  targetAudience: string;
}

export interface BrandVoiceResult {
  rewritten: string;
}

export async function applyBrandVoice(options: BrandVoiceOptions): Promise<BrandVoiceResult> {
  const { content, toneKeywords, avoidKeywords, targetAudience } = options;

  const systemPrompt = `You are a brand voice expert who rewrites content to match a specific brand identity. You maintain the original meaning and structure while transforming the tone and style.

Guidelines:
- Preserve all factual information and key points
- Transform the voice without changing the message
- Ensure consistency throughout the entire piece
- Make it sound natural, not forced
- Target audience: ${targetAudience}
- Desired tone: ${toneKeywords.join(", ")}
${avoidKeywords.length > 0 ? `- Avoid: ${avoidKeywords.join(", ")}` : ""}

Always return valid JSON.`;

  const prompt = `Rewrite the following content to match the specified brand voice:

Tone keywords: ${toneKeywords.join(", ")}
${avoidKeywords.length > 0 ? `Words/phrases to avoid: ${avoidKeywords.join(", ")}` : ""}
Target audience: ${targetAudience}

Content to rewrite:
${content}

Return a JSON object with:
- rewritten: The full rewritten content matching the brand voice`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL,
  });

  const parsed = JSON.parse(response);

  return {
    rewritten: parsed.rewritten,
  };
}
