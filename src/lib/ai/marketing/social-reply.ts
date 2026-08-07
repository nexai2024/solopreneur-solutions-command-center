import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface SocialReplyOptions {
  originalPost: string;
  comment: string;
  tone?: string;
  brandVoice?: string;
}

export interface GeneratedSocialReplies {
  replies: { reply: string }[];
}

export async function generateSocialReply(options: SocialReplyOptions): Promise<GeneratedSocialReplies> {
  const { originalPost, comment, tone, brandVoice } = options;

  const systemPrompt = `You are a social media community manager for an indie developer or SaaS founder. You craft thoughtful, authentic replies that build community and trust.

Guidelines:
- Be genuine and helpful, never robotic
- Match the conversational tone of the platform
- Address the commenter's point directly
- When appropriate, add value or share insights
${brandVoice ? `- Brand voice: ${brandVoice}` : ""}
${tone ? `- Tone: ${tone}` : "- Tone: friendly and professional"}

Always return valid JSON.`;

  const prompt = `Generate 3 reply options for this social media interaction:

Original post: "${originalPost}"

Comment/reply to respond to: "${comment}"

Return a JSON object with:
- replies: An array of 3 objects, each with:
  - reply: The suggested reply text (keep concise, under 280 characters each)`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL,
  });

  const parsed = JSON.parse(response);

  return {
    replies: parsed.replies || [],
  };
}
