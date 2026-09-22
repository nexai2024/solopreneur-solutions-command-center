import { aiComplete, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export type MessagingArtifactPack = {
  shortDescription: string;
  valueProposition: string;
  featureList: string;
  tagline: string;
  longDescription: string;
};

/**
 * Generate the core messaging artifacts founders usually need after scoring/merging an idea.
 */
export async function generateMessagingArtifactPack(input: {
  projectTitle: string;
  projectDescription: string;
  features?: string[];
  coreProblem?: string | null;
  proposedSolution?: string | null;
  targetPersona?: string | null;
}): Promise<MessagingArtifactPack> {
  const featureBlock =
    input.features && input.features.length > 0
      ? input.features.map((f) => `• ${f}`).join("\n")
      : "(derive features from the description)";

  const response = await aiComplete({
    model: AI_MODEL_ADVANCED,
    jsonMode: true,
    systemPrompt: `You are a product marketer for solopreneur SaaS. Write clear, specific messaging — no fluff or buzzword salad. Return valid JSON only.`,
    prompt: `Create messaging artifacts for this product.

Title: ${input.projectTitle}
Description:
${input.projectDescription || "(none)"}
${input.coreProblem ? `Core problem: ${input.coreProblem}` : ""}
${input.proposedSolution ? `Proposed solution: ${input.proposedSolution}` : ""}
${input.targetPersona ? `Persona: ${input.targetPersona}` : ""}
Known features:
${featureBlock}

Return JSON:
{
  "tagline": "under 10 words",
  "shortDescription": "1-2 sentence elevator pitch",
  "valueProposition": "2-4 sentences: who it's for, the pain, the outcome",
  "featureList": "markdown bullet list of 4-8 must-have features (each line starts with - )",
  "longDescription": "markdown, 2-4 short paragraphs for a landing page About section"
}`,
  });

  const parsed = JSON.parse(response) as Partial<MessagingArtifactPack>;
  const fallbackPitch =
    input.projectDescription?.trim().slice(0, 280) ||
    `${input.projectTitle} helps solve a real problem for its users.`;

  return {
    tagline: parsed.tagline?.trim() || input.projectTitle,
    shortDescription: parsed.shortDescription?.trim() || fallbackPitch,
    valueProposition:
      parsed.valueProposition?.trim() ||
      [input.coreProblem, input.proposedSolution].filter(Boolean).join(" → ") ||
      fallbackPitch,
    featureList:
      parsed.featureList?.trim() ||
      (input.features?.length
        ? input.features.map((f) => `- ${f}`).join("\n")
        : "- Core workflow\n- Simple onboarding\n- Essential integrations"),
    longDescription:
      parsed.longDescription?.trim() ||
      input.projectDescription?.trim() ||
      fallbackPitch,
  };
}

/** Pull feature-like lines from project/idea description text. */
export function extractFeatureHints(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const cleaned = line
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .trim();
    if (!cleaned) continue;
    if (
      /^(combined features|features|feature list|must-have)/i.test(cleaned) &&
      cleaned.length < 40
    ) {
      continue;
    }
    if (
      line.trim().startsWith("-") ||
      line.trim().startsWith("•") ||
      line.trim().startsWith("*") ||
      /^\d+\.\s+/.test(line.trim())
    ) {
      out.push(cleaned.slice(0, 120));
    }
  }
  return [...new Set(out)].slice(0, 12);
}
