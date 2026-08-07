import { aiComplete, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export interface BlogPostOptions {
  topic: string;
  outline?: string;
  tone?: string;
  targetAudience?: string;
  brandVoice?: string;
}

export interface GeneratedBlogPost {
  title: string;
  content: Record<string, unknown>;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
}

export async function generateBlogPost(options: BlogPostOptions): Promise<GeneratedBlogPost> {
  const { topic, outline, tone, targetAudience, brandVoice } = options;

  const systemPrompt = `You are an expert content writer for indie developers and SaaS founders. You write engaging, well-structured blog posts that drive organic traffic and establish thought leadership.

Your writing style:
- Clear, concise, and actionable
- Uses real examples and data points
- Optimized for SEO without keyword stuffing
- Includes compelling introductions and conclusions
${brandVoice ? `- Brand voice: ${brandVoice}` : ""}
${tone ? `- Tone: ${tone}` : "- Tone: professional yet approachable"}

Always return valid JSON.`;

  const prompt = `Write a comprehensive blog post about: "${topic}"

${outline ? `Follow this outline:\n${outline}\n` : ""}
${targetAudience ? `Target audience: ${targetAudience}` : "Target audience: indie developers and solopreneurs"}

Return a JSON object with:
- title: A compelling, SEO-optimized title (under 70 characters)
- content: A Tiptap JSON document structure with type "doc" and an array of content nodes. Each node should be a paragraph (type: "paragraph") or heading (type: "heading" with attrs.level). Paragraph and heading nodes have a "content" array with text nodes (type: "text" with "text" field). Include at least 5-8 well-developed paragraphs with clear headings.
- excerpt: A compelling 1-2 sentence summary (under 160 characters)
- seoTitle: An SEO-optimized page title (under 60 characters)
- seoDescription: A meta description optimized for click-through (under 155 characters)
- seoKeywords: An array of 5-8 relevant SEO keywords`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL_ADVANCED,
  });

  const parsed = JSON.parse(response);

  return {
    title: parsed.title,
    content: parsed.content,
    excerpt: parsed.excerpt,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    seoKeywords: parsed.seoKeywords || [],
  };
}
