import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface HashtagOptions {
  content: string;
  platform: string;
  count?: number;
}

export interface HashtagResult {
  hashtags: string[];
}

export async function suggestHashtags(options: HashtagOptions): Promise<HashtagResult> {
  const { content, platform, count = 10 } = options;

  const platformGuidelines: Record<string, string> = {
    TWITTER: "Twitter/X: Use 2-3 hashtags max. Focus on trending and niche tags.",
    LINKEDIN: "LinkedIn: Use 3-5 hashtags. Mix industry and topic-specific tags.",
    THREADS: "Threads: Use 3-5 relevant hashtags. Keep them conversational.",
    BLUESKY: "Bluesky: Hashtags are less common. Suggest 2-3 highly relevant ones.",
    MASTODON: "Mastodon: Hashtags are important for discovery. Use 5-10 relevant tags.",
    OTHER: "Use 5-8 relevant hashtags.",
  };

  const systemPrompt = `You are a social media hashtag strategist who helps indie developers and SaaS founders maximize content discoverability.

Guidelines:
- ${platformGuidelines[platform] || platformGuidelines.OTHER}
- Mix popular and niche hashtags for optimal reach
- Include industry-specific tags
- Avoid overly generic hashtags
- Consider current trending topics when relevant

Always return valid JSON.`;

  const prompt = `Suggest ${count} hashtags for this ${platform} post:

Content: "${content}"

Return a JSON object with:
- hashtags: An array of ${count} hashtag strings WITHOUT the # symbol (e.g., "buildinpublic" not "#buildinpublic"). Order them from most relevant to least relevant.`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL,
  });

  const parsed = JSON.parse(response);

  return {
    hashtags: parsed.hashtags || [],
  };
}
