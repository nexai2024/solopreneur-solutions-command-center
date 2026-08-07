import { aiComplete, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export interface CompetitorAnalyzerOptions {
  competitorUrl?: string;
  competitorContent?: string;
  industry: string;
}

export interface CompetitorAnalysisResult {
  analysis: string;
  opportunities: string[];
  contentGaps: string[];
}

export async function analyzeCompetitorContent(options: CompetitorAnalyzerOptions): Promise<CompetitorAnalysisResult> {
  const { competitorUrl, competitorContent, industry } = options;

  const systemPrompt = `You are a competitive intelligence analyst specializing in the ${industry} industry. You analyze competitor content strategies to find opportunities and gaps that indie developers and SaaS founders can exploit.

Guidelines:
- Provide actionable insights, not just observations
- Focus on content strategy gaps that are achievable for solo founders
- Consider SEO, social media, and content marketing angles
- Identify quick wins and longer-term opportunities
- Be specific with recommendations

Always return valid JSON.`;

  const prompt = `Analyze the competitor content strategy for the ${industry} industry:

${competitorUrl ? `Competitor URL: ${competitorUrl}` : ""}
${competitorContent ? `Competitor content/description:\n${competitorContent}` : ""}
${!competitorUrl && !competitorContent ? "Provide a general competitive content analysis for this industry." : ""}

Return a JSON object with:
- analysis: A comprehensive 2-3 paragraph analysis of the competitor's content strategy, strengths, and weaknesses
- opportunities: An array of 5-7 specific content opportunities you can capitalize on
- contentGaps: An array of 4-6 topics or content types the competitor is missing that you could fill`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL_ADVANCED,
  });

  const parsed = JSON.parse(response);

  return {
    analysis: parsed.analysis,
    opportunities: parsed.opportunities || [],
    contentGaps: parsed.contentGaps || [],
  };
}
