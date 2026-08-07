import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface ABVariantOptions {
  original: string;
  type: string;
  count?: number;
}

export interface GeneratedABVariants {
  variants: string[];
}

export async function generateABVariants(options: ABVariantOptions): Promise<GeneratedABVariants> {
  const { original, type, count = 3 } = options;

  const typeGuidelines: Record<string, string> = {
    headline: "Focus on different angles: benefit-driven, curiosity-driven, urgency-driven, social proof.",
    subject_line: "Test different approaches: question, number, personalization, urgency, curiosity gap.",
    cta: "Vary the action words, urgency, and value proposition in each variant.",
    body_copy: "Adjust the tone, structure, and emphasis while keeping the core message.",
    ad_copy: "Test different hooks, pain points, and benefit framing.",
  };

  const systemPrompt = `You are a conversion optimization expert who creates A/B test variants for indie developers and SaaS products. You understand what drives clicks, opens, and conversions.

Guidelines:
- Each variant should test a meaningfully different approach
- Keep variants similar enough in length to be fair tests
- Focus on one key variable change per variant
${typeGuidelines[type] ? `- ${typeGuidelines[type]}` : ""}

Always return valid JSON.`;

  const prompt = `Generate ${count} A/B test variants for this ${type}:

Original: "${original}"

Return a JSON object with:
- variants: An array of ${count} alternative versions of the original text. Each variant should be a string that tests a different approach while maintaining the same core intent.`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL,
  });

  const parsed = JSON.parse(response);

  return {
    variants: parsed.variants || [],
  };
}
