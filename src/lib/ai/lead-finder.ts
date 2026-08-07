import { aiComplete } from "@/lib/ai-config";
import {
  fetchSubredditNew,
  searchRedditGlobal,
  searchSubredditPosts,
} from "@/lib/leads/sources/reddit";
import { searchHackerNews } from "@/lib/leads/sources/hackernews";
import type {
  RawCommunityPost,
  ScoredLeadPost,
} from "@/lib/leads/sources/types";

export type { ScoredLeadPost as LeadFinderResult };

export type DiscoveredCommunity = {
  platform: "reddit" | "hackernews" | "indiehackers" | "other";
  name: string;
  reason: string;
  search_queries: string[];
  url?: string;
};

function dedupePosts(posts: RawCommunityPost[]): RawCommunityPost[] {
  const seen = new Set<string>();
  const out: RawCommunityPost[] = [];
  for (const post of posts) {
    if (seen.has(post.id) || seen.has(post.permalink)) continue;
    seen.add(post.id);
    seen.add(post.permalink);
    out.push(post);
  }
  return out;
}

/** Step 1: AI finds where the niche audience hangs out */
export async function discoverCommunities(
  niche: string
): Promise<DiscoveredCommunity[]> {
  const prompt = `You help solopreneurs find where their buyers hang out online.

Niche: "${niche}"

Return 4-6 HIGH-SIGNAL communities to mine for real posts (prefer Reddit subreddits + Hacker News when relevant).

Rules:
- Reddit names must be real-ish subreddit names without r/ prefix (e.g. "SaaS", "smallbusiness", "Entrepreneur")
- Include 1-3 search_queries per community that would surface people with pain/buying intent
- Prefer communities where people ask for tools, complain about workflows, or hire help

Return JSON:
{
  "communities": [
    {
      "platform": "reddit" | "hackernews" | "indiehackers" | "other",
      "name": "subreddit name OR Hacker News OR forum name",
      "reason": "why this audience matches",
      "search_queries": ["query1", "query2"],
      "url": "optional homepage"
    }
  ]
}`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt:
        "You are a B2B/indie audience research expert. Return valid JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as {
      communities?: DiscoveredCommunity[];
    };
    const list = parsed.communities ?? [];
    if (list.length) return list.slice(0, 6);
  } catch {
    // fall through
  }

  return [
    {
      platform: "reddit",
      name: "SaaS",
      reason: "Builders and buyers discussing tools",
      search_queries: [niche, `looking for ${niche}`, `${niche} recommendation`],
      url: "https://www.reddit.com/r/SaaS",
    },
    {
      platform: "reddit",
      name: "smallbusiness",
      reason: "Operators with real budget pain",
      search_queries: [niche, `tool for ${niche}`, `alternative to`],
      url: "https://www.reddit.com/r/smallbusiness",
    },
    {
      platform: "hackernews",
      name: "Hacker News",
      reason: "Technical founders discussing products",
      search_queries: [niche],
      url: "https://news.ycombinator.com",
    },
  ];
}

/** Step 2: Pull live posts from discovered communities */
export async function fetchPostsFromCommunities(
  niche: string,
  communities: DiscoveredCommunity[]
): Promise<RawCommunityPost[]> {
  const collected: RawCommunityPost[] = [];

  const redditCommunities = communities.filter((c) => c.platform === "reddit");
  const hnCommunities = communities.filter((c) => c.platform === "hackernews");

  // Parallel fetches — capped to stay fast
  const jobs: Promise<RawCommunityPost[]>[] = [];

  for (const community of redditCommunities.slice(0, 4)) {
    const queries = community.search_queries.slice(0, 2);
    for (const q of queries) {
      jobs.push(searchSubredditPosts(community.name, q, 10));
    }
    jobs.push(fetchSubredditNew(community.name, 8));
  }

  // Always do a global Reddit search for the niche
  jobs.push(searchRedditGlobal(niche, 15));
  jobs.push(
    searchRedditGlobal(`"${niche}" (looking OR recommend OR alternative OR struggling)`, 10)
  );

  for (const community of hnCommunities.slice(0, 1)) {
    for (const q of community.search_queries.slice(0, 2)) {
      jobs.push(searchHackerNews(q || niche, 12));
    }
  }
  if (hnCommunities.length === 0) {
    jobs.push(searchHackerNews(niche, 12));
  }

  const results = await Promise.all(jobs);
  for (const batch of results) {
    collected.push(...batch);
  }

  return dedupePosts(collected).slice(0, 60);
}

/** Step 3: AI reviews posts and returns only relevant ones with author + approach */
export async function scoreRelevantPosts(
  niche: string,
  posts: RawCommunityPost[]
): Promise<ScoredLeadPost[]> {
  if (posts.length === 0) return [];

  const compact = posts.slice(0, 40).map((p, i) => ({
    i,
    id: p.id,
    platform: p.platform,
    community: p.community,
    author: p.author,
    title: p.title,
    body: p.body.slice(0, 500),
    score: p.score,
    comments: p.commentCount,
    url: p.permalink,
    posted_at: p.createdAt,
  }));

  const prompt = `You are reviewing REAL forum/Reddit/HN posts to find warm leads for a solopreneur.

Niche / product focus: "${niche}"

Posts (JSON):
${JSON.stringify(compact)}

Select 5-12 posts that show:
- pain matching the niche
- buying / switching intent
- asking for tool recommendations
- describing a broken workflow the product could fix

Skip memes, jokes, off-topic, or pure news with no human problem.

For each selected post return:
- index: number (the "i" field from input)
- relevance_score: 1-10
- intent: buying | pain | looking_for_tool | advice | hiring | other
- why: 1-2 sentences why this person/post is a lead
- approach_angle: concrete first reply / DM angle (helpful, not spammy)

Return JSON:
{ "matches": [{ "index", "relevance_score", "intent", "why", "approach_angle" }] }`;

  try {
    const response = await aiComplete({
      prompt,
      systemPrompt:
        "You are a careful lead researcher. Only flag genuine intent. Return valid JSON only.",
      jsonMode: true,
    });
    const parsed = JSON.parse(response) as {
      matches?: Array<{
        index: number;
        relevance_score: number;
        intent: ScoredLeadPost["intent"];
        why: string;
        approach_angle: string;
      }>;
    };

    const matches = parsed.matches ?? [];
    const scored: ScoredLeadPost[] = [];

    for (const match of matches) {
      const post = posts[match.index];
      if (!post) continue;

      scored.push({
        title: post.title,
        description: `${match.why}\n\nApproach: ${match.approach_angle}`,
        source: post.community,
        url: post.permalink,
        relevance_score: Math.min(10, Math.max(1, Number(match.relevance_score) || 5)),
        author: post.author,
        author_profile_url: post.authorProfileUrl,
        post_body: post.body || post.title,
        community: post.community,
        platform: post.platform,
        score: post.score,
        comment_count: post.commentCount,
        posted_at: post.createdAt,
        intent: match.intent || "other",
        approach_angle: match.approach_angle,
        lead_type: "post",
      });
    }

    return scored.sort((a, b) => b.relevance_score - a.relevance_score);
  } catch {
    // Heuristic fallback if AI scoring fails
    return posts.slice(0, 8).map((post) => ({
      title: post.title,
      description: `Active discussion in ${post.community}. Review and reply helpfully.`,
      source: post.community,
      url: post.permalink,
      relevance_score: 5,
      author: post.author,
      author_profile_url: post.authorProfileUrl,
      post_body: post.body || post.title,
      community: post.community,
      platform: post.platform,
      score: post.score,
      comment_count: post.commentCount,
      posted_at: post.createdAt,
      intent: "other" as const,
      approach_angle: "Reply with a useful insight before mentioning your product.",
      lead_type: "post" as const,
    }));
  }
}

/** Communities that had no post hits — still useful as place-based leads */
function communityFallbackLeads(
  communities: DiscoveredCommunity[]
): ScoredLeadPost[] {
  return communities.slice(0, 3).map((c) => ({
    title: `Mine ${c.platform === "reddit" ? `r/${c.name}` : c.name}`,
    description: `${c.reason} Search queries: ${c.search_queries.join("; ")}`,
    source: c.platform === "reddit" ? `r/${c.name}` : c.name,
    url:
      c.url ||
      (c.platform === "reddit"
        ? `https://www.reddit.com/r/${c.name}`
        : c.platform === "hackernews"
          ? "https://news.ycombinator.com"
          : undefined) ||
      "",
    relevance_score: 4,
    author: "",
    author_profile_url: null,
    post_body: "",
    community: c.platform === "reddit" ? `r/${c.name}` : c.name,
    platform: c.platform,
    score: 0,
    comment_count: 0,
    posted_at: new Date().toISOString(),
    intent: "other",
    approach_angle: "Lurk first, then reply to threads with clear pain.",
    lead_type: "community",
  }));
}

/**
 * Full pipeline:
 * 1) Discover communities for the niche
 * 2) Fetch live posts from Reddit / HN
 * 3) AI reviews posts and returns author + post + approach data
 */
export async function findLeadsForNiche(niche: string): Promise<ScoredLeadPost[]> {
  const trimmed = niche.trim();
  if (!trimmed) return [];

  const communities = await discoverCommunities(trimmed);
  const posts = await fetchPostsFromCommunities(trimmed, communities);
  const scored = await scoreRelevantPosts(trimmed, posts);

  if (scored.length > 0) {
    // Also attach top communities as secondary context leads (max 2)
    const placeLeads = communityFallbackLeads(communities).slice(0, 2);
    return [...scored, ...placeLeads].slice(0, 16);
  }

  // If Reddit/HN blocked or empty, still return community targets
  return communityFallbackLeads(communities);
}
