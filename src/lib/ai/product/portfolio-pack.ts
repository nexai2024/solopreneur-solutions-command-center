import { aiComplete, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export type PortfolioAppCard = {
  projectId: string;
  name: string;
  tagline: string;
  description: string;
  status: string;
  category: string;
  highlights: string[];
  audience: string;
  stage: string;
};

export type PortfolioPack = {
  headline: string;
  bio: string;
  apps: PortfolioAppCard[];
  thesis: string;
};

export async function generatePortfolioPack(input: {
  founderName: string;
  apps: Array<{
    projectId: string;
    name: string;
    description: string | null;
    status: string;
    blurb: string | null;
    features: string[];
    audience: string | null;
  }>;
}): Promise<PortfolioPack> {
  const serialized = input.apps
    .map(
      (app, i) => `App ${i + 1} (${app.projectId}):
Name: ${app.name}
Status: ${app.status}
Audience: ${app.audience || "n/a"}
Description: ${app.description || app.blurb || "n/a"}
Features: ${app.features.length ? app.features.join("; ") : "n/a"}`
    )
    .join("\n\n");

  try {
    const response = await aiComplete({
      model: AI_MODEL_ADVANCED,
      jsonMode: true,
      systemPrompt: `You are a startup storytelling editor writing for VCs, sponsors, and partners. Be concrete, credible, and concise. Return valid JSON only.`,
      prompt: `Create a portfolio pack for ${input.founderName || "a solopreneur"} covering these apps:

${serialized}

Return JSON:
{
  "headline": "one-line positioning for the founder/studio",
  "bio": "2-3 sentences about the builder and the portfolio theme",
  "thesis": "1-2 sentences on the investment/partnership opportunity across the portfolio",
  "apps": [
    {
      "projectId": "must match input id",
      "name": "product name",
      "tagline": "under 12 words",
      "description": "2-3 polished sentences",
      "status": "echo status or map to building/live/planning",
      "category": "short category label e.g. SaaS / Devtools",
      "highlights": ["3 short bullets"],
      "audience": "who it's for",
      "stage": "idea | mvp | growth | live"
    }
  ]
}`,
    });

    const parsed = JSON.parse(response) as Partial<PortfolioPack>;
    const apps = (parsed.apps ?? []).map((app, idx) => {
      const source = input.apps[idx];
      return {
        projectId: app.projectId || source?.projectId || "",
        name: app.name || source?.name || "Untitled",
        tagline: app.tagline || source?.name || "",
        description:
          app.description ||
          source?.blurb ||
          source?.description ||
          "",
        status: app.status || source?.status || "planning",
        category: app.category || "Software",
        highlights: (app.highlights ?? source?.features ?? []).slice(0, 5),
        audience: app.audience || source?.audience || "Builders",
        stage: app.stage || "mvp",
      };
    });

    // Ensure all apps present even if model skipped some
    for (const source of input.apps) {
      if (!apps.some((a) => a.projectId === source.projectId)) {
        apps.push({
          projectId: source.projectId,
          name: source.name,
          tagline: source.name,
          description: source.blurb || source.description || "",
          status: source.status,
          category: "Software",
          highlights: source.features.slice(0, 3),
          audience: source.audience || "Builders",
          stage: "mvp",
        });
      }
    }

    return {
      headline:
        parsed.headline?.trim() ||
        `${input.founderName}'s product portfolio`,
      bio:
        parsed.bio?.trim() ||
        "A focused set of products built for operators who ship alone.",
      thesis:
        parsed.thesis?.trim() ||
        "Partnership and sponsorship opportunities across a coherent product universe.",
      apps,
    };
  } catch {
    return {
      headline: `${input.founderName}'s product portfolio`,
      bio: "Products built and shipping by a solo founder.",
      thesis: "Open to partners, sponsors, and strategic introductions.",
      apps: input.apps.map((app) => ({
        projectId: app.projectId,
        name: app.name,
        tagline: app.name,
        description: app.blurb || app.description || "",
        status: app.status,
        category: "Software",
        highlights: app.features.slice(0, 3),
        audience: app.audience || "Builders",
        stage: "mvp",
      })),
    };
  }
}
