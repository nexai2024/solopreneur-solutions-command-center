import { aiComplete } from "@/lib/ai-config";

export type LeadReplyInput = {
  niche?: string | null;
  postTitle: string;
  postBody: string;
  community: string;
  platform: string;
  author: string;
  intent?: string | null;
  approachAngle?: string | null;
  productName?: string | null;
  productDescription?: string | null;
  toneKeywords?: string[];
  avoidKeywords?: string[];
  audience?: string | null;
};

export async function draftHelpfulReply(input: LeadReplyInput): Promise<string> {
  const tone =
    input.toneKeywords && input.toneKeywords.length > 0
      ? input.toneKeywords.join(", ")
      : "clear, helpful, honest, practical";
  const avoid =
    input.avoidKeywords && input.avoidKeywords.length > 0
      ? input.avoidKeywords.join(", ")
      : "hype, revolutionary, synergy, DM me, check out my tool (as opener)";

  const prompt = `Write a FIRST COMMENT / reply for this public thread. Goal: be genuinely helpful. Soft product mention only if it fits naturally — never spammy.

Thread:
- Platform: ${input.platform}
- Community: ${input.community}
- Author: ${input.author || "OP"}
- Title: ${input.postTitle}
- Body: ${input.postBody.slice(0, 2500) || "(no body)"}
- Detected intent: ${input.intent || "unknown"}
- Suggested approach: ${input.approachAngle || "help first"}

Your product context (optional, use lightly):
- Name: ${input.productName || "N/A"}
- Description: ${input.productDescription || "N/A"}
- Niche focus: ${input.niche || "N/A"}

Brand voice:
- Tone: ${tone}
- Avoid: ${avoid}
- Audience: ${input.audience || "founders and operators"}

Rules:
- 80–180 words max
- Lead with empathy / a concrete tip
- Ask one clarifying question if useful
- If mentioning the product, do it in one short sentence at the end, framed as optional
- No hashtags, no emojis, no "As an AI"
- Sound like a real person who has shipped things

Return JSON: { "reply": "the full comment text ready to paste" }`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt:
        "You write high-trust community replies for solopreneurs. Never sound like an ad. JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as { reply?: string };
    if (parsed.reply?.trim()) return parsed.reply.trim();
  } catch {
    // fall through
  }

  return [
    `Appreciate you sharing this — a lot of people hit the same wall.`,
    ``,
    `One thing that usually helps: write down the exact workflow step that breaks (tool, handoff, or decision), then fix that slice before trying a full overhaul.`,
    ``,
    `Curious what you've already tried and where it fell short?`,
  ].join("\n");
}
