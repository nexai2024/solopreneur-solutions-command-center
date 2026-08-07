import { aiComplete } from "@/lib/ai-config";

export type GrowthCoachAction = {
  id: string;
  title: string;
  channel: string;
  why: string;
  effort: "low" | "medium" | "high";
  done: boolean;
};

export type GrowthCoachPlan = {
  summary: string;
  actions: GrowthCoachAction[];
};

export type FanOutVariant = {
  channel: "blog" | "twitter" | "linkedin" | "newsletter";
  title: string;
  body: string;
  hashtags: string[];
};

export type LaunchCopyPacks = Record<string, string>;

function weekStartIso(date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getWeekStart(date = new Date()): Date {
  return new Date(weekStartIso(date));
}

export async function generateWeeklyGrowthPlan(input: {
  projectName: string;
  projectDescription: string;
  projectStatus: string;
  brandAudience?: string | null;
  recentContentTitles?: string[];
  launchMode?: boolean;
  releaseVersion?: string | null;
}): Promise<GrowthCoachPlan> {
  const prompt = `You are a growth coach for solopreneurs who are NOT marketers.
Create a focused THIS WEEK plan (5 actions max) for:

Project: ${input.projectName}
Description: ${input.projectDescription || "N/A"}
Stage/status: ${input.projectStatus}
Audience: ${input.brandAudience || "indie founders / early adopters"}
Recent content: ${(input.recentContentTitles ?? []).slice(0, 8).join("; ") || "none yet"}
${input.launchMode ? `LAUNCH MODE: yes — version ${input.releaseVersion ?? "latest"} is ready. Prioritize launch distribution.` : ""}

Rules:
- Be concrete and executable in under 2 hours each when possible
- Prefer owned channels + high-signal communities over vanity posting
- Every action needs a clear "why"
- Channels: blog, linkedin, twitter, newsletter, product-hunt, reddit, indie-hackers, seo, email

Return JSON:
{
  "summary": "2-3 sentence weekly strategy",
  "actions": [
    {
      "id": "a1",
      "title": "...",
      "channel": "...",
      "why": "...",
      "effort": "low|medium|high",
      "done": false
    }
  ]
}`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt: "You are a pragmatic solopreneur growth coach. Return valid JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as GrowthCoachPlan;
    const actions = (parsed.actions ?? []).slice(0, 5).map((a, i) => ({
      id: a.id || `a${i + 1}`,
      title: a.title,
      channel: a.channel,
      why: a.why,
      effort: (["low", "medium", "high"].includes(a.effort) ? a.effort : "medium") as
        | "low"
        | "medium"
        | "high",
      done: false,
    }));
    return {
      summary: parsed.summary || `Focus this week on growing ${input.projectName}.`,
      actions,
    };
  } catch {
    return {
      summary: `Ship visible proof for ${input.projectName}, then distribute it in 2 high-signal channels.`,
      actions: [
        {
          id: "a1",
          title: "Write a founder story post (problem → solution → ask)",
          channel: "linkedin",
          why: "Personal narrative converts better than product pitches for solos.",
          effort: "medium",
          done: false,
        },
        {
          id: "a2",
          title: "Turn that post into an X/Twitter thread",
          channel: "twitter",
          why: "One idea should create multiple touchpoints this week.",
          effort: "low",
          done: false,
        },
        {
          id: "a3",
          title: "Publish a short newsletter with one CTA",
          channel: "newsletter",
          why: "Owned audience compounds even when social reach dips.",
          effort: "medium",
          done: false,
        },
        {
          id: "a4",
          title: "Share a milestone on Indie Hackers",
          channel: "indie-hackers",
          why: "High-intent founders give feedback and early users.",
          effort: "medium",
          done: false,
        },
        {
          id: "a5",
          title: "Target 3 SEO keywords for a launch blog",
          channel: "seo",
          why: "Capture demand after launch noise fades.",
          effort: "high",
          done: false,
        },
      ],
    };
  }
}

export async function generateContentFanOut(input: {
  projectName: string;
  sourceTitle: string;
  sourceBody: string;
  brandAudience?: string | null;
  toneKeywords?: string[];
}): Promise<FanOutVariant[]> {
  const prompt = `Fan out ONE source into 4 channel-ready assets for a solopreneur product.

Product: ${input.projectName}
Audience: ${input.brandAudience || "indie founders"}
Tone: ${(input.toneKeywords ?? ["clear", "honest", "practical"]).join(", ")}

Source title: ${input.sourceTitle}
Source body:
${input.sourceBody.slice(0, 4000)}

Return JSON:
{
  "variants": [
    { "channel": "blog", "title": "...", "body": "full draft markdown-ish text", "hashtags": [] },
    { "channel": "twitter", "title": "thread title", "body": "numbered thread", "hashtags": ["..."] },
    { "channel": "linkedin", "title": "...", "body": "...", "hashtags": ["..."] },
    { "channel": "newsletter", "title": "subject line", "body": "...", "hashtags": [] }
  ]
}`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt:
        "You are a multi-channel content strategist for solopreneurs. Return valid JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as { variants?: FanOutVariant[] };
    return (parsed.variants ?? []).filter((v) =>
      ["blog", "twitter", "linkedin", "newsletter"].includes(v.channel)
    );
  } catch {
    return [
      {
        channel: "twitter",
        title: `${input.sourceTitle} (thread)`,
        body: `1/ ${input.sourceTitle}\n\n2/ ${input.sourceBody.slice(0, 280)}\n\n3/ Want early access? Link in bio.`,
        hashtags: ["buildinpublic"],
      },
      {
        channel: "linkedin",
        title: input.sourceTitle,
        body: input.sourceBody.slice(0, 1200),
        hashtags: ["solopreneur", "saas"],
      },
      {
        channel: "newsletter",
        title: input.sourceTitle,
        body: `Hey — quick update.\n\n${input.sourceBody.slice(0, 800)}\n\n— Reply and tell me what you want next.`,
        hashtags: [],
      },
      {
        channel: "blog",
        title: input.sourceTitle,
        body: input.sourceBody,
        hashtags: [],
      },
    ];
  }
}

export async function generateLaunchCopyPacks(input: {
  projectName: string;
  projectDescription: string;
  version?: string | null;
  productionUrl?: string | null;
}): Promise<LaunchCopyPacks> {
  const prompt = `Write launch copy packs for ${input.projectName}.
Description: ${input.projectDescription || "N/A"}
Version: ${input.version || "1.0"}
URL: ${input.productionUrl || "(add your URL)"}

Return JSON object with string fields:
tagline, firstComment, launchPost, followUp, milestonePost, redditPost, directoryBlurb, teaser, launchSocial, proofFollowUp

Keep each under 800 chars except firstComment/launchPost/redditPost (max 1500).`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt: "You write high-converting launch copy for indie products. JSON only.",
      jsonMode: true,
    });
    return JSON.parse(response) as LaunchCopyPacks;
  } catch {
    return {
      tagline: `${input.projectName} — built for solopreneurs who ship.`,
      firstComment: `Hey Product Hunt! We built ${input.projectName} because solos drown in disconnected tools. Would love your feedback.`,
      launchPost: `Shipped ${input.projectName}${input.version ? ` ${input.version}` : ""}. ${input.projectDescription || ""}`,
      followUp: `Thanks for the launch love — what should we build next?`,
      milestonePost: `Milestone: ${input.projectName} is live. Here's what I learned shipping solo.`,
      redditPost: `I built ${input.projectName} to solve: ${input.projectDescription || "a painful solo workflow"}. Looking for tough feedback.`,
      directoryBlurb: `${input.projectName}: ${input.projectDescription || "Command center for solopreneurs."}`,
      teaser: `Shipping something for solopreneurs this week. Hint: less tab chaos.`,
      launchSocial: `${input.projectName} is live${input.productionUrl ? ` → ${input.productionUrl}` : ""}.`,
      proofFollowUp: `First reactions are in — here's what early users said about ${input.projectName}.`,
    };
  }
}
