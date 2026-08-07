import { getOpenAIClient, AI_MODEL_ADVANCED } from './ai-config';

/**
 * SOLOOS IDEA SCORING FRAMEWORK
 *
 * A comprehensive scoring system based on real-world startup evaluation criteria.
 * This framework evaluates ideas across 7 key dimensions that determine startup success potential.
 *
 * SCORING CATEGORIES & JUSTIFICATION:
 *
 * 1. MARKET SIZE (TAM/SAM/SOM) - Weight: 15%
 *    Why: The size of the addressable market determines the ceiling of potential revenue.
 *    A great solution in a tiny market has limited upside. VCs prioritize this heavily.
 *    Source: Marc Andreessen's "Product-Market Fit" framework
 *
 * 2. MARKET GROWTH - Weight: 10%
 *    Why: Static markets are harder to enter; growing markets create natural tailwinds.
 *    Startups riding market growth outperform those fighting for share in stagnant markets.
 *    Source: McKinsey market analysis, a]b growth principles
 *
 * 3. PROBLEM SEVERITY (Pain Level) - Weight: 20%
 *    Why: The most successful products solve "hair on fire" problems. Users pay more
 *    and convert faster when the problem causes significant pain. This is THE most
 *    important factor for early-stage success.
 *    Source: Y Combinator's problem severity framework, Jobs-to-be-Done theory
 *
 * 4. COMPETITIVE ADVANTAGE (Moat Potential) - Weight: 15%
 *    Why: Without defensibility, successful products get copied. This evaluates
 *    network effects, switching costs, data advantages, brand, and technical moats.
 *    Source: Hamilton Helmer's "7 Powers", Warren Buffett's moat concept
 *
 * 5. EXECUTION FEASIBILITY - Weight: 15%
 *    Why: Great ideas fail with poor execution. This assesses technical complexity,
 *    team requirements, time to MVP, and operational challenges.
 *    Source: Steve Blank's customer development methodology
 *
 * 6. MONETIZATION CLARITY - Weight: 15%
 *    Why: Clear paths to revenue reduce risk. This evaluates pricing model viability,
 *    willingness to pay, revenue predictability, and unit economics potential.
 *    Source: SaaS metrics frameworks, Bessemer's state of cloud reports
 *
 * 7. TIMING & TRENDS - Weight: 10%
 *    Why: Being too early is the same as being wrong. This evaluates whether
 *    enabling technologies, regulations, and market conditions are favorable NOW.
 *    Source: Bill Gross's "Single Biggest Reason Why Startups Succeed" (TED)
 *
 * COMPOSITE SCORE CALCULATION:
 * Each category is scored 1-100, then weighted and combined.
 * Final score interpretation:
 * - 80-100: Exceptional opportunity, pursue aggressively
 * - 65-79:  Strong opportunity, worth serious investment
 * - 50-64:  Moderate opportunity, needs refinement
 * - 35-49:  Weak opportunity, significant pivots needed
 * - 0-34:   Poor opportunity, reconsider fundamentally
 */

export interface ScoreImprovementSuggestion {
  suggestion: string;
  category: string;
  targetDimensions: string[];
  estimatedImpact: number; // 1-20
}

export interface IdeaScoreResult {
  // Individual scores (1-100)
  marketSizeScore: number;
  marketGrowthScore: number;
  problemSeverityScore: number;
  competitiveAdvantageScore: number;
  executionFeasibilityScore: number;
  monetizationScore: number;
  timingScore: number;

  // Composite weighted score
  aiScore: number;

  // Detailed reasoning for each category
  marketSizeReason: string;
  marketGrowthReason: string;
  problemSeverityReason: string;
  competitiveAdvantageReason: string;
  executionFeasibilityReason: string;
  monetizationReason: string;
  timingReason: string;

  // Overall assessment
  aiScoreReason: string;
  overallAssessment: string;

  // Actionable insights
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  // Risk factors
  keyRisks: string[];

  // Market context
  marketEvaluation: string;

  // Improvement suggestions
  improvements: ScoreImprovementSuggestion[];
}

// Category weights (must sum to 1.0)
export const IDEA_SCORE_WEIGHTS = {
  marketSize: 0.15,
  marketGrowth: 0.10,
  problemSeverity: 0.20,
  competitiveAdvantage: 0.15,
  executionFeasibility: 0.15,
  monetization: 0.15,
  timing: 0.10,
} as const;

export type IdeaDimensionScores = {
  marketSizeScore: number;
  marketGrowthScore: number;
  problemSeverityScore: number;
  competitiveAdvantageScore: number;
  executionFeasibilityScore: number;
  monetizationScore: number;
  timingScore: number;
};

export function calculateCompositeScore(scores: IdeaDimensionScores): number {
  const composite =
    scores.marketSizeScore * IDEA_SCORE_WEIGHTS.marketSize +
    scores.marketGrowthScore * IDEA_SCORE_WEIGHTS.marketGrowth +
    scores.problemSeverityScore * IDEA_SCORE_WEIGHTS.problemSeverity +
    scores.competitiveAdvantageScore * IDEA_SCORE_WEIGHTS.competitiveAdvantage +
    scores.executionFeasibilityScore * IDEA_SCORE_WEIGHTS.executionFeasibility +
    scores.monetizationScore * IDEA_SCORE_WEIGHTS.monetization +
    scores.timingScore * IDEA_SCORE_WEIGHTS.timing;
  return Math.round(composite * 100) / 100;
}

export function interpretCompositeScore(compositeScore: number): string {
  if (compositeScore >= 80) {
    return "Exceptional opportunity with strong fundamentals across all dimensions.";
  }
  if (compositeScore >= 65) {
    return "Strong opportunity worth serious investment.";
  }
  if (compositeScore >= 50) {
    return "Moderate opportunity with potential.";
  }
  if (compositeScore >= 35) {
    return "Weak opportunity with fundamental concerns.";
  }
  return "Significant challenges — reconsider the fundamental approach.";
}

const WEIGHTS = IDEA_SCORE_WEIGHTS;

export async function scoreIdea(
  title: string,
  description: string,
  context?: {
    personas?: Array<{ name: string; role: string; painPoints: string[]; goals: string[] }>;
    problems?: Array<{ statement: string; severity: string; frequency: string }>;
    competitors?: Array<{ name: string; strengths: string[]; weaknesses: string[] }>;
    userProfile?: {
      niche?: string;
      techStack?: string[];
      experience?: string;
      targetAudience?: string;
    };
    previousScores?: {
      marketSizeScore: number;
      marketGrowthScore: number;
      problemSeverityScore: number;
      competitiveAdvantageScore: number;
      executionFeasibilityScore: number;
      monetizationScore: number;
      timingScore: number;
      aiScore: number;
    };
    completedImprovements?: Array<{
      suggestion: string;
      category: string;
      targetDimensions: string[];
      estimatedImpact: number;
    }>;
  }
): Promise<IdeaScoreResult | null> {
  const isRescore = !!(context?.previousScores && context?.completedImprovements?.length);

  try {
    const openai = getOpenAIClient();

    const rescoreInstructions = isRescore ? `

IMPORTANT — THIS IS A RE-SCORE AFTER IMPROVEMENTS:
The founder has already been scored and has completed specific improvements. You MUST:
1. Use the previous scores as your baseline/anchor.
2. For dimensions targeted by completed improvements, scores MUST increase (or at minimum stay the same).
3. Only DECREASE a score if there is an extremely compelling reason unrelated to the improvements.
4. The overall composite score should go UP after improvements are completed.
5. Be generous in recognizing the effort the founder put into improvements.` : '';

    const systemPrompt = `You are an elite startup evaluator combining the analytical frameworks of Y Combinator partners, top-tier VCs, and successful founders. You provide brutally honest, data-driven assessments of business ideas.

Your evaluation must be rigorous and grounded in reality. Do NOT give inflated scores to be nice. A mediocre idea should score 40-55. Only truly exceptional ideas with clear evidence of strong fundamentals should score above 75.

SCORING PHILOSOPHY:
- Be skeptical by default. Most ideas have significant flaws.
- Compare against real market data and successful companies.
- Consider the perspective of a seed-stage investor risking $500K.
- Acknowledge uncertainty but make decisive assessments.

SCORE CALIBRATION:
- 90-100: Generational opportunity (rare, maybe 1 in 1000 ideas)
- 75-89: Excellent opportunity, would invest enthusiastically
- 60-74: Good opportunity with notable strengths
- 45-59: Mediocre, significant concerns
- 30-44: Weak, fundamental issues
- 0-29: Poor, would not recommend pursuing
${rescoreInstructions}

Return your analysis as JSON with the exact structure specified.`;

    const contextInfo = context ? `
ADDITIONAL CONTEXT:
${context.personas?.length ? `
Target Personas:
${context.personas.map(p => `- ${p.name} (${p.role}): Pain points: ${p.painPoints.join(', ')}`).join('\n')}
` : ''}
${context.problems?.length ? `
Problem Statements:
${context.problems.map(p => `- ${p.statement} (${p.severity} severity, ${p.frequency})`).join('\n')}
` : ''}
${context.competitors?.length ? `
Known Competitors:
${context.competitors.map(c => `- ${c.name}: Strengths: ${c.strengths.join(', ')}; Weaknesses: ${c.weaknesses.join(', ')}`).join('\n')}
` : ''}
${context.userProfile ? `
Builder Profile:
- Niche: ${context.userProfile.niche || 'Not specified'}
- Tech Stack: ${context.userProfile.techStack?.join(', ') || 'Not specified'}
- Experience: ${context.userProfile.experience || 'Not specified'}
- Target Audience: ${context.userProfile.targetAudience || 'Not specified'}
` : ''}
${context?.previousScores ? `
PREVIOUS SCORES (use these as your baseline — scores should only go UP after improvements):
- Market Size: ${context.previousScores.marketSizeScore}/100
- Market Growth: ${context.previousScores.marketGrowthScore}/100
- Problem Severity: ${context.previousScores.problemSeverityScore}/100
- Competitive Advantage: ${context.previousScores.competitiveAdvantageScore}/100
- Execution Feasibility: ${context.previousScores.executionFeasibilityScore}/100
- Monetization: ${context.previousScores.monetizationScore}/100
- Timing: ${context.previousScores.timingScore}/100
- Overall Composite: ${context.previousScores.aiScore}/100
` : ''}
${context?.completedImprovements?.length ? `
COMPLETED IMPROVEMENTS (the founder has implemented these — reward their effort with higher scores in targeted dimensions):
${context.completedImprovements.map((imp: { suggestion: string; category: string; targetDimensions: string[]; estimatedImpact: number }, i: number) => `${i + 1}. "${imp.suggestion}" (category: ${imp.category}, targets: ${imp.targetDimensions.join(', ')}, estimated impact: +${imp.estimatedImpact} points)`).join('\n')}
` : ''}` : '';

    const userPrompt = `${isRescore ? 'RE-EVALUATE' : 'Evaluate'} this startup idea with rigorous analysis:

IDEA TITLE: ${title}

IDEA DESCRIPTION: ${description}
${contextInfo}

Provide a comprehensive evaluation with scores (1-100) and detailed reasoning for each of these 7 categories:

1. MARKET SIZE (TAM/SAM/SOM Analysis)
   - What is the realistic total addressable market?
   - What portion can this startup realistically capture?
   - Compare to known market sizes in similar industries.

2. MARKET GROWTH
   - Is this market expanding, stable, or contracting?
   - What's driving growth or decline?
   - What are the 5-year projections?

3. PROBLEM SEVERITY ("Hair on Fire" Test)
   - How painful is this problem for users?
   - Are people actively seeking solutions?
   - Would users pay significant money to solve this?
   - Is this a "must-have" or "nice-to-have"?

4. COMPETITIVE ADVANTAGE (Moat Potential)
   - What defensibility mechanisms exist?
   - Network effects, switching costs, data advantages?
   - How easily could this be replicated by incumbents?
   - Is there a unique insight or approach?

5. EXECUTION FEASIBILITY
   - Technical complexity assessment
   - Time and resources needed for MVP
   - Key dependencies and risks
   - Team/skills requirements

6. MONETIZATION CLARITY
   - How will this make money?
   - What's the pricing model viability?
   - What are realistic unit economics?
   - Willingness to pay signals?

7. TIMING & TRENDS
   - Why is NOW the right time?
   - What enabling factors exist today that didn't before?
   - Regulatory, technological, or social tailwinds?
   - Risk of being too early or too late?

Return a JSON object with this EXACT structure:
{
  "marketSizeScore": <number 1-100>,
  "marketSizeReason": "<2-3 sentences with specific market size estimates if possible>",

  "marketGrowthScore": <number 1-100>,
  "marketGrowthReason": "<2-3 sentences on growth trajectory>",

  "problemSeverityScore": <number 1-100>,
  "problemSeverityReason": "<2-3 sentences on pain level and urgency>",

  "competitiveAdvantageScore": <number 1-100>,
  "competitiveAdvantageReason": "<2-3 sentences on defensibility>",

  "executionFeasibilityScore": <number 1-100>,
  "executionFeasibilityReason": "<2-3 sentences on build complexity>",

  "monetizationScore": <number 1-100>,
  "monetizationReason": "<2-3 sentences on revenue clarity>",

  "timingScore": <number 1-100>,
  "timingReason": "<2-3 sentences on market timing>",

  "overallAssessment": "<1 paragraph executive summary>",

  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "keyRisks": ["<risk 1>", "<risk 2>", "<risk 3>"],

  "marketEvaluation": "<detailed market analysis paragraph including competitor landscape>",

  "improvements": [
    {
      "suggestion": "<specific, actionable improvement the founder can make>",
      "category": "<one of: features, niche, positioning, techStack, pricing, marketing, partnerships, timing>",
      "targetDimensions": ["<dimension IDs this would improve, e.g. marketSize, problemSeverity, monetization>"],
      "estimatedImpact": <1-20, estimated total point increase across targeted dimensions>
    }
  ]
}

IMPORTANT for improvements:
- Provide exactly 5-8 specific, actionable improvement suggestions
- Each suggestion should be concrete enough for the founder to act on immediately
- targetDimensions must use these exact IDs: marketSize, marketGrowth, problemSeverity, competitiveAdvantage, executionFeasibility, monetization, timing
- estimatedImpact should be realistic (1-20 range) — how many points total the improvement could add
- Categories: features (product changes), niche (market focus), positioning (how it's framed), techStack (technology choices), pricing (monetization model), marketing (go-to-market), partnerships (strategic alliances), timing (launch timing)`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL_ADVANCED,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: isRescore ? 0.3 : 0.7, // Lower temperature for rescoring to reduce variance
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");

    // Validate and clamp scores to 1-100 range
    const clampScore = (score: number): number => Math.min(100, Math.max(1, Math.round(score)));

    // For rescoring, ensure scores don't drop below previous values for improved dimensions
    const prev = context?.previousScores;
    const improvedDimensions = new Set(
      (context?.completedImprovements || []).flatMap(imp => imp.targetDimensions)
    );

    const clampRescore = (score: number, dimension: string, fallback: number): number => {
      const clamped = clampScore(score || fallback);
      if (isRescore && prev && improvedDimensions.has(dimension)) {
        const prevScore = prev[`${dimension}Score` as keyof typeof prev] as number;
        return Math.max(clamped, prevScore);
      }
      return clamped;
    };

    const scores = {
      marketSizeScore: clampRescore(data.marketSizeScore, 'marketSize', 50),
      marketGrowthScore: clampRescore(data.marketGrowthScore, 'marketGrowth', 50),
      problemSeverityScore: clampRescore(data.problemSeverityScore, 'problemSeverity', 50),
      competitiveAdvantageScore: clampRescore(data.competitiveAdvantageScore, 'competitiveAdvantage', 50),
      executionFeasibilityScore: clampRescore(data.executionFeasibilityScore, 'executionFeasibility', 50),
      monetizationScore: clampRescore(data.monetizationScore, 'monetization', 50),
      timingScore: clampRescore(data.timingScore, 'timing', 50),
    };

    // Calculate weighted composite score
    const compositeScore =
      scores.marketSizeScore * WEIGHTS.marketSize +
      scores.marketGrowthScore * WEIGHTS.marketGrowth +
      scores.problemSeverityScore * WEIGHTS.problemSeverity +
      scores.competitiveAdvantageScore * WEIGHTS.competitiveAdvantage +
      scores.executionFeasibilityScore * WEIGHTS.executionFeasibility +
      scores.monetizationScore * WEIGHTS.monetization +
      scores.timingScore * WEIGHTS.timing;

    // Generate score interpretation
    let scoreInterpretation: string;
    if (compositeScore >= 80) {
      scoreInterpretation = "Exceptional opportunity with strong fundamentals across all dimensions. This idea shows characteristics of highly successful startups.";
    } else if (compositeScore >= 65) {
      scoreInterpretation = "Strong opportunity worth serious investment. Address the identified weaknesses to move toward exceptional.";
    } else if (compositeScore >= 50) {
      scoreInterpretation = "Moderate opportunity with potential. Significant refinement needed in weak areas before major investment.";
    } else if (compositeScore >= 35) {
      scoreInterpretation = "Weak opportunity with fundamental concerns. Consider pivoting or addressing core issues before proceeding.";
    } else {
      scoreInterpretation = "This idea has significant challenges. Recommend reconsidering the fundamental approach or exploring different opportunities.";
    }

    return {
      ...scores,
      aiScore: Math.round(compositeScore * 100) / 100,

      marketSizeReason: data.marketSizeReason || "Unable to assess market size.",
      marketGrowthReason: data.marketGrowthReason || "Unable to assess market growth.",
      problemSeverityReason: data.problemSeverityReason || "Unable to assess problem severity.",
      competitiveAdvantageReason: data.competitiveAdvantageReason || "Unable to assess competitive advantage.",
      executionFeasibilityReason: data.executionFeasibilityReason || "Unable to assess execution feasibility.",
      monetizationReason: data.monetizationReason || "Unable to assess monetization.",
      timingReason: data.timingReason || "Unable to assess timing.",

      aiScoreReason: scoreInterpretation,
      overallAssessment: data.overallAssessment || "Unable to generate overall assessment.",

      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      recommendations: data.recommendations || [],
      keyRisks: data.keyRisks || [],

      marketEvaluation: data.marketEvaluation || "Unable to generate market evaluation.",

      improvements: (data.improvements || []).map((imp: Record<string, unknown>) => ({
        suggestion: String(imp.suggestion || ""),
        category: String(imp.category || "features"),
        targetDimensions: Array.isArray(imp.targetDimensions) ? imp.targetDimensions.map(String) : [],
        estimatedImpact: Math.min(20, Math.max(1, Math.round(Number(imp.estimatedImpact) || 5))),
      })),
    };
  } catch (error) {
    console.error("AI Scoring Error:", error);
    if (error instanceof Error) {
      throw new Error(`Idea scoring failed: ${error.message}`);
    }
    throw new Error("Idea scoring failed");
  }
}

/**
 * Quick validation check - is this idea worth deeper analysis?
 * Used for rapid filtering before full scoring.
 */
export async function quickValidation(title: string, description: string): Promise<{
  isViable: boolean;
  confidence: number;
  quickTake: string;
} | null> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: AI_MODEL_ADVANCED,
      messages: [
        {
          role: "system",
          content: "You are a startup advisor doing a quick 30-second evaluation. Be direct and honest."
        },
        {
          role: "user",
          content: `Quick viability check for: "${title}" - ${description}

Return JSON: { "isViable": boolean, "confidence": 1-100, "quickTake": "one sentence assessment" }`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Quick Validation Error:", error);
    return null;
  }
}

/**
 * Generate next steps based on current idea state and scores
 */
export async function getNextSteps(idea: {
  title: string;
  description: string;
  personas?: Array<unknown>;
  problemStatements?: Array<unknown>;
  validationItems?: Array<{ isCompleted: boolean }>;
  competitors?: Array<unknown>;
  aiScore?: number;
  problemSeverityScore?: number;
  marketSizeScore?: number;
}): Promise<{
  nextSteps: Array<{ action: string; priority: string; rationale: string }>;
  focusArea: string;
} | null> {
  try {
    const openai = getOpenAIClient();

    const validationProgress = idea.validationItems?.length
      ? idea.validationItems.filter(v => v.isCompleted).length / idea.validationItems.length
      : 0;

    const response = await openai.chat.completions.create({
      model: AI_MODEL_ADVANCED,
      messages: [
        {
          role: "system",
          content: "You are a startup advisor providing specific, actionable next steps based on the idea's current validation state."
        },
        {
          role: "user",
          content: `Based on this idea's current state, what are the 3 most important next steps?

Idea: ${idea.title}
Description: ${idea.description}
Current State:
- Personas defined: ${idea.personas?.length || 0}
- Problems identified: ${idea.problemStatements?.length || 0}
- Validation progress: ${Math.round(validationProgress * 100)}%
- Competitors analyzed: ${idea.competitors?.length || 0}
- AI Score: ${idea.aiScore || 'Not yet scored'}
- Problem Severity Score: ${idea.problemSeverityScore || 'Not yet scored'}
- Market Size Score: ${idea.marketSizeScore || 'Not yet scored'}

Return JSON: {
  "nextSteps": [
    { "action": "specific action", "priority": "HIGH/MEDIUM/LOW", "rationale": "why this matters" }
  ],
  "focusArea": "the single most important area to focus on right now"
}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("AI Next Steps Error:", error);
    return null;
  }
}
