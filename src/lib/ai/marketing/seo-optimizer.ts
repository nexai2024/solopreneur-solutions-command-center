import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface SEOOptions {
  title: string;
  content: string;
  currentKeywords?: string[];
}

export interface SEOResult {
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  suggestions: string[];
}

export async function optimizeSEO(options: SEOOptions): Promise<SEOResult> {
  const { title, content, currentKeywords } = options;

  const systemPrompt = `You are an SEO expert who optimizes content for indie developers and SaaS products. You understand search intent, keyword research, and on-page SEO best practices.

Guidelines:
- Focus on long-tail keywords with achievable ranking potential
- Write meta descriptions that drive click-through
- Suggest actionable improvements
- Consider search intent alignment
- Prioritize relevance over keyword density

Always return valid JSON.`;

  const contentPreview = content.length > 3000 ? content.substring(0, 3000) + "..." : content;

  const prompt = `Analyze and optimize the SEO for this content:

Title: "${title}"
${currentKeywords && currentKeywords.length > 0 ? `Current keywords: ${currentKeywords.join(", ")}` : ""}

Content:
${contentPreview}

Return a JSON object with:
- seoTitle: An optimized page title (under 60 characters, include primary keyword)
- seoDescription: An optimized meta description (under 155 characters, include CTA)
- keywords: An array of 8-12 relevant keywords (mix of primary, secondary, and long-tail)
- suggestions: An array of 3-5 actionable SEO improvement suggestions for the content`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL,
  });

  const parsed = JSON.parse(response);

  return {
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    keywords: parsed.keywords || [],
    suggestions: parsed.suggestions || [],
  };
}
