import { aiComplete, AI_MODEL_ADVANCED } from "@/lib/ai-config";

export type CampaignType =
  | "launch"
  | "feature"
  | "content"
  | "outreach"
  | "ads"
  | "retention";

export type CampaignAssetDraft = {
  channel: string;
  assetType: "post" | "thread" | "email" | "ad" | "landing" | "outreach";
  title: string;
  body: string;
  dayOffset: number;
  metadata?: Record<string, unknown>;
};

export type GeneratedCampaignPack = {
  title: string;
  campaignType: CampaignType;
  channels: string[];
  goal: string;
  audience: string;
  offer: string;
  positioning: {
    tagline: string;
    oneLiner: string;
    angles: string[];
  };
  checklist: Array<{ id: string; label: string; done: boolean }>;
  /** Suggested length of the campaign in days */
  durationDays: number;
  assets: CampaignAssetDraft[];
};

export type CampaignPackInput = {
  projectName: string;
  projectDescription: string;
  campaignType?: CampaignType;
  goal?: string | null;
  audience?: string | null;
  offer?: string | null;
  channels?: string[];
  version?: string | null;
  productionUrl?: string | null;
};

const DEFAULT_CHANNELS = [
  "product-hunt",
  "hacker-news",
  "reddit",
  "linkedin",
  "twitter",
  "newsletter",
  "indie-hackers",
];

function fallbackPack(input: CampaignPackInput): GeneratedCampaignPack {
  const name = input.projectName;
  const url = input.productionUrl || "your app URL";
  const type = input.campaignType ?? "launch";

  return {
    title: `${name} ${type === "launch" ? "Launch" : type} Campaign`,
    campaignType: type,
    channels: input.channels?.length ? input.channels : DEFAULT_CHANNELS,
    goal:
      input.goal ||
      `Get first users and signal for ${name} through community + launch channels`,
    audience:
      input.audience ||
      "Indie founders, solopreneurs, and builders looking for this category of tool",
    offer: input.offer || `Try ${name} — free to start`,
    positioning: {
      tagline: `${name} — ship faster with less chaos`,
      oneLiner: input.projectDescription?.slice(0, 160) || `${name} helps solopreneurs grow.`,
      angles: [
        "Save time vs doing it manually",
        "Built for solo founders, not enterprise teams",
        "Ship → learn → iterate in one place",
      ],
    },
    checklist: [
      { id: "brief", label: "Confirm positioning & offer", done: false },
      { id: "assets", label: "Review & edit AI assets", done: false },
      { id: "warmup", label: "Post warm-up content (day 0–2)", done: false },
      { id: "launch", label: "Ship primary launch posts", done: false },
      { id: "followup", label: "Follow up + collect testimonials", done: false },
      { id: "metrics", label: "Log impressions / signups / spend", done: false },
    ],
    durationDays: 14,
    assets: [
      {
        channel: "product-hunt",
        assetType: "post",
        title: "Product Hunt tagline + description",
        dayOffset: 3,
        body: `Tagline: ${name} — built for solopreneurs who ship alone.\n\nDescription:\n${input.projectDescription || name}\n\nFirst comment:\nHey hunters — maker here. Built ${name} because I needed it myself. Happy to answer anything. Link: ${url}`,
      },
      {
        channel: "hacker-news",
        assetType: "post",
        title: "Show HN draft",
        dayOffset: 3,
        body: `Show HN: ${name} – ${input.projectDescription?.slice(0, 80) || "a tool for solopreneurs"}\n\n${url}\n\nBuilt this to solve my own workflow. Feedback welcome.`,
      },
      {
        channel: "reddit",
        assetType: "post",
        title: "r/SaaS / r/Entrepreneur launch post",
        dayOffset: 4,
        body: `I just launched ${name}.\n\nProblem: …\nWhat I built: ${input.projectDescription || name}\nWould love feedback from folks who’ve launched solo.\n\n${url}`,
      },
      {
        channel: "linkedin",
        assetType: "post",
        title: "LinkedIn launch announcement",
        dayOffset: 3,
        body: `I just shipped ${name}.\n\n${input.projectDescription || ""}\n\nIf you’re a solopreneur building in public, I’d love your take.\n\n${url}`,
      },
      {
        channel: "twitter",
        assetType: "thread",
        title: "X/Twitter launch thread",
        dayOffset: 3,
        body: `1/ Just launched ${name}\n\n2/ Why I built it: ${input.projectDescription?.slice(0, 100) || "..."}\n\n3/ Try it: ${url}\n\n4/ What should I build next?`,
      },
      {
        channel: "newsletter",
        assetType: "email",
        title: "Launch email to waitlist",
        dayOffset: 3,
        body: `Subject: ${name} is live\n\nHey —\n\n${name} is ready. ${input.projectDescription || ""}\n\nGet started: ${url}\n\nReply and tell me what you try first.`,
      },
      {
        channel: "ads",
        assetType: "ad",
        title: "Meta / LinkedIn ad variants",
        dayOffset: 5,
        body: `Headline: Stop juggling launch chaos\nBody: ${name} keeps growth, tasks, and outreach in one OS for solopreneurs.\nCTA: Start free\n\nHeadline: Built for founders who ship alone\nBody: From idea → launch checklist → first users.\nCTA: See how it works`,
      },
      {
        channel: "outreach",
        assetType: "outreach",
        title: "Cold DM / email template",
        dayOffset: 6,
        body: `Hey {{name}} — saw your post about {{pain}}.\n\nI built ${name} for exactly that. Would a 10-min look be useful, or should I send a short loom?\n\n${url}`,
      },
    ],
  };
}

/**
 * Generate a full multi-channel campaign pack (RocketSeq / StartKitz-style)
 * with day-sequenced assets, positioning, and a launch checklist.
 */
export async function generateCampaignPack(
  input: CampaignPackInput
): Promise<GeneratedCampaignPack> {
  try {
    const channels =
      input.channels?.length ? input.channels.join(", ") : DEFAULT_CHANNELS.join(", ");
    const type = input.campaignType ?? "launch";

    const systemPrompt = `You are an elite B2B SaaS growth marketer for solopreneurs and indie founders.
You create campaign packs competitive with RocketSeq, StartKitz, and Vendilo:
platform-native copy, sequenced over ~14 days (warm-up → launch → follow-up), authentic tone, no spammy hype.

Always return valid JSON only.`;

    const prompt = `Create a complete ${type} marketing campaign pack for:

Product: ${input.projectName}
Description: ${input.projectDescription || "No description"}
URL: ${input.productionUrl || "not set"}
Version: ${input.version || "n/a"}
Goal: ${input.goal || "first users + awareness"}
Audience: ${input.audience || "solopreneurs / indie SaaS founders"}
Offer: ${input.offer || "free trial / waitlist"}
Preferred channels: ${channels}

Return JSON:
{
  "title": "Campaign title",
  "campaignType": "${type}",
  "channels": ["product-hunt","reddit",...],
  "goal": "...",
  "audience": "...",
  "offer": "...",
  "positioning": {
    "tagline": "max 60 chars",
    "oneLiner": "one sentence",
    "angles": ["3 messaging angles"]
  },
  "checklist": [{ "id": "slug", "label": "action", "done": false }],
  "durationDays": 14,
  "assets": [
    {
      "channel": "product-hunt|hacker-news|reddit|linkedin|twitter|newsletter|indie-hackers|ads|outreach|seo",
      "assetType": "post|thread|email|ad|landing|outreach",
      "title": "short label",
      "body": "ready-to-paste copy (full text)",
      "dayOffset": 0
    }
  ]
}

Requirements:
- 10–16 assets spanning dayOffset 0–13
- Include warm-up (0–2), launch day (~3), follow-ups (4–10), metrics reminder
- Platform-native tone (PH first comment, Show HN, Reddit non-salesy, LinkedIn professional, X thread numbered)
- Include at least 1 email, 1 ad set, 1 outreach template
- Checklist must have 5–8 concrete launch readiness steps`;

    const response = await aiComplete({
      prompt,
      systemPrompt,
      jsonMode: true,
      model: AI_MODEL_ADVANCED,
    });

    const parsed = JSON.parse(response) as Partial<GeneratedCampaignPack>;
    if (!parsed.assets?.length || !parsed.title) {
      return fallbackPack(input);
    }

    const assets = parsed.assets
      .filter((a) => a.title && a.body && a.channel)
      .map((a) => ({
        channel: String(a.channel),
        assetType: (a.assetType || "post") as CampaignAssetDraft["assetType"],
        title: String(a.title),
        body: String(a.body),
        dayOffset: Number(a.dayOffset) || 0,
        metadata: a.metadata,
      }));

    if (assets.length === 0) return fallbackPack(input);

    return {
      title: parsed.title,
      campaignType: (parsed.campaignType as CampaignType) || type,
      channels:
        parsed.channels?.length
          ? parsed.channels.map(String)
          : input.channels?.length
            ? input.channels
            : DEFAULT_CHANNELS,
      goal: parsed.goal || input.goal || fallbackPack(input).goal,
      audience: parsed.audience || input.audience || fallbackPack(input).audience,
      offer: parsed.offer || input.offer || fallbackPack(input).offer,
      positioning: {
        tagline: parsed.positioning?.tagline || fallbackPack(input).positioning.tagline,
        oneLiner:
          parsed.positioning?.oneLiner || fallbackPack(input).positioning.oneLiner,
        angles:
          parsed.positioning?.angles?.length
            ? parsed.positioning.angles
            : fallbackPack(input).positioning.angles,
      },
      checklist:
        parsed.checklist?.length
          ? parsed.checklist.map((c, i) => ({
              id: c.id || `step-${i}`,
              label: c.label,
              done: Boolean(c.done),
            }))
          : fallbackPack(input).checklist,
      durationDays: parsed.durationDays || 14,
      assets,
    };
  } catch {
    return fallbackPack(input);
  }
}
