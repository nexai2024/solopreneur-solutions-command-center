import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface AdCopyOptions {
  productName: string;
  productDescription: string;
  platform: string;
  objective: string;
  tone?: string;
}

export interface AdCopyVariant {
  headline: string;
  body: string;
  callToAction: string;
}

export interface GeneratedAdCopy {
  variants: AdCopyVariant[];
}

export async function generateAdCopy(options: AdCopyOptions): Promise<GeneratedAdCopy> {
  const { productName, productDescription, platform, objective, tone } = options;

  const platformGuidelines: Record<string, string> = {
    GOOGLE: "Google Ads: Headlines max 30 chars, descriptions max 90 chars. Focus on search intent.",
    META: "Meta/Facebook Ads: Headlines max 40 chars, primary text max 125 chars. Visual-first platform.",
    REDDIT: "Reddit Ads: Authentic tone, avoid hard sells. Headlines max 100 chars.",
    TIKTOK: "TikTok Ads: Casual, trendy, short-form. Headlines max 50 chars.",
    LINKEDIN: "LinkedIn Ads: Professional tone, B2B focused. Headlines max 70 chars.",
    OTHER: "General ad copy with standard lengths.",
  };

  const systemPrompt = `You are an expert performance marketer specializing in ad copy for indie developers and SaaS products. You write copy that converts while staying authentic.

Platform guidelines: ${platformGuidelines[platform] || platformGuidelines.OTHER}
${tone ? `Tone: ${tone}` : "Tone: compelling and clear"}

Always return valid JSON.`;

  const prompt = `Generate 3 ad copy variants for:

Product: ${productName}
Description: ${productDescription}
Platform: ${platform}
Campaign objective: ${objective}

Return a JSON object with:
- variants: An array of 3 objects, each with:
  - headline: The ad headline
  - body: The ad body/description text
  - callToAction: The CTA button text (e.g., "Start Free Trial", "Learn More")`;

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
