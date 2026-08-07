import { aiComplete } from "@/lib/ai-config";

export interface ProductContentOptions {
  projectTitle: string;
  projectDescription: string;
  features: string[];
  targetAudience?: string;
  techStack?: string[];
  existingName?: string;
  existingTagline?: string;
}

export interface GeneratedProductContent {
  slogan?: string;
  shortDescription?: string;
  longDescription?: string;
  marketingContent?: {
    taglines: string[];
    featureHighlights: { title: string; description: string }[];
    valuePropositions: string[];
    nameAlternatives: string[];
  };
}

export async function generateProductContent(
  options: ProductContentOptions,
  field: "slogan" | "shortDescription" | "longDescription" | "marketingContent" | "all"
): Promise<GeneratedProductContent> {
  const systemPrompt = `You are an expert product marketer specializing in developer tools and SaaS products. You create compelling, clear marketing content that resonates with technical audiences.

Always return valid JSON.`;

  const context = `Product: ${options.existingName || options.projectTitle}
Description: ${options.projectDescription}
Features: ${options.features.join(", ")}
${options.targetAudience ? `Target audience: ${options.targetAudience}` : ""}
${options.techStack?.length ? `Tech stack: ${options.techStack.join(", ")}` : ""}
${options.existingTagline ? `Current tagline: ${options.existingTagline}` : ""}`;

  const fieldPrompts: Record<string, string> = {
    slogan: `Generate a catchy, memorable slogan (under 10 words) for this product.
Return JSON: { "slogan": "..." }`,
    shortDescription: `Write a compelling 1-2 sentence elevator pitch for this product.
Return JSON: { "shortDescription": "..." }`,
    longDescription: `Write a comprehensive product description in markdown (3-5 paragraphs). Cover what it does, who it's for, key benefits, and why it's different.
Return JSON: { "longDescription": "..." }`,
    marketingContent: `Generate marketing content for this product:
- 3 alternative taglines
- Feature highlights (title + description for each key feature)
- 3 value propositions
- 3 alternative product name suggestions
Return JSON: { "marketingContent": { "taglines": [...], "featureHighlights": [{"title":"...","description":"..."}], "valuePropositions": [...], "nameAlternatives": [...] } }`,
    all: `Generate comprehensive marketing content for this product:
- slogan: catchy phrase under 10 words
- shortDescription: 1-2 sentence elevator pitch
- longDescription: full markdown description (3-5 paragraphs)
- marketingContent: { taglines: string[], featureHighlights: [{title, description}], valuePropositions: string[], nameAlternatives: string[] }
Return JSON with all four fields.`,
  };

  const prompt = `${context}\n\n${fieldPrompts[field]}`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
  });

  return JSON.parse(response);
}
