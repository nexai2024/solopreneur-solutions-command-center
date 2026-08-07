import { aiComplete, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export interface NewsletterOptions {
  topic: string;
  sections?: string[];
  tone?: string;
  productName?: string;
}

export interface GeneratedNewsletter {
  subject: string;
  previewText: string;
  blocks: Record<string, unknown>[];
}

export async function generateNewsletter(options: NewsletterOptions): Promise<GeneratedNewsletter> {
  const { topic, sections, tone, productName } = options;

  const systemPrompt = `You are an expert email marketing strategist for indie developers and SaaS founders. You craft newsletters that have high open rates, engaging content, and drive action.

Your newsletter style:
- Compelling subject lines that drive opens
- Scannable content with clear sections
- Personal and conversational tone
- Strong calls-to-action
${tone ? `- Tone: ${tone}` : "- Tone: friendly and informative"}

Always return valid JSON.`;

  const prompt = `Create a newsletter about: "${topic}"

${productName ? `Product: ${productName}` : ""}
${sections && sections.length > 0 ? `Include these sections:\n${sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "Include 3-5 relevant sections"}

Return a JSON object with:
- subject: A compelling email subject line (under 60 characters)
- previewText: Preview text shown in inbox (under 90 characters)
- blocks: An array of newsletter block objects. Each block should have:
  - type: One of "header", "text", "cta", "divider", "image"
  - For "header" blocks: { type: "header", content: "Header text", level: 1|2|3 }
  - For "text" blocks: { type: "text", content: "Paragraph text with rich content" }
  - For "cta" blocks: { type: "cta", content: "Button text", url: "#", style: "primary"|"secondary" }
  - For "divider" blocks: { type: "divider" }
  - Include at least 6-10 blocks for a well-structured newsletter`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL_ADVANCED,
  });

  const parsed = JSON.parse(response);

  return {
    subject: parsed.subject,
    previewText: parsed.previewText,
    blocks: parsed.blocks || [],
  };
}
