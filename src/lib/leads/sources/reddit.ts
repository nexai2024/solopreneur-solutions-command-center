import type { RawCommunityPost } from "@/lib/leads/sources/types";

const USER_AGENT =
  process.env.REDDIT_USER_AGENT ||
  "SolopreneurCommandCenter/1.0 (lead research; contact: app@localhost)";

type RedditListingChild = {
  data?: {
    id?: string;
    name?: string;
    title?: string;
    selftext?: string;
    author?: string;
    subreddit?: string;
    permalink?: string;
    url?: string;
    score?: number;
    ups?: number;
    num_comments?: number;
    created_utc?: number;
    link_flair_text?: string | null;
    stickied?: boolean;
    over_18?: boolean;
  };
};

type RedditListing = {
  data?: {
    children?: RedditListingChild[];
  };
};

function cleanSubreddit(name: string): string {
  return name.replace(/^r\//i, "").replace(/^\//, "").trim();
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getRedditAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

async function fetchRedditJson(pathOrUrl: string): Promise<RedditListing | null> {
  const token = await getRedditAccessToken();

  // Prefer OAuth API when credentials exist (most reliable)
  if (token && pathOrUrl.startsWith("/")) {
    try {
      const res = await fetch(`https://oauth.reddit.com${pathOrUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) return (await res.json()) as RedditListing;
    } catch (err) {
      console.warn("[reddit] oauth fetch error", err instanceof Error ? err.message : err);
    }
  }

  const publicUrls = pathOrUrl.startsWith("/")
    ? [
        `https://old.reddit.com${pathOrUrl}`,
        `https://www.reddit.com${pathOrUrl}`,
      ]
    : [pathOrUrl];

  for (const url of publicUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) continue;
      return (await res.json()) as RedditListing;
    } catch (err) {
      console.warn("[reddit] fetch error", err instanceof Error ? err.message : err);
    }
  }

  return null;
}

function mapChildren(children: RedditListingChild[] | undefined): RawCommunityPost[] {
  if (!children?.length) return [];
  const posts: RawCommunityPost[] = [];

  for (const child of children) {
    const d = child.data;
    if (!d?.id || !d.title || d.stickied || d.over_18) continue;
    if (!d.author || d.author === "[deleted]") continue;

    const sub = d.subreddit || "unknown";
    const permalink = d.permalink
      ? `https://www.reddit.com${d.permalink}`
      : d.url || `https://www.reddit.com/r/${sub}`;

    posts.push({
      id: `reddit_${d.name || d.id}`,
      platform: "reddit",
      community: `r/${sub}`,
      title: d.title,
      body: (d.selftext || "").slice(0, 4000),
      author: d.author,
      authorProfileUrl: `https://www.reddit.com/user/${d.author}`,
      url: permalink,
      permalink,
      score: d.score ?? d.ups ?? 0,
      commentCount: d.num_comments ?? 0,
      createdAt: d.created_utc
        ? new Date(d.created_utc * 1000).toISOString()
        : new Date().toISOString(),
      flair: d.link_flair_text ?? null,
    });
  }

  return posts;
}

/** Search within a subreddit for niche-related posts */
export async function searchSubredditPosts(
  subreddit: string,
  query: string,
  limit = 15
): Promise<RawCommunityPost[]> {
  const sub = cleanSubreddit(subreddit);
  if (!sub) return [];

  const params = new URLSearchParams({
    q: query,
    restrict_sr: "true",
    sort: "relevance",
    t: "month",
    limit: String(Math.min(limit, 25)),
    raw_json: "1",
  });

  const listing = await fetchRedditJson(
    `/r/${encodeURIComponent(sub)}/search.json?${params}`
  );
  return mapChildren(listing?.data?.children);
}

/** Pull recent posts from a subreddit (fallback when search is thin) */
export async function fetchSubredditNew(
  subreddit: string,
  limit = 15
): Promise<RawCommunityPost[]> {
  const sub = cleanSubreddit(subreddit);
  if (!sub) return [];

  const params = new URLSearchParams({
    limit: String(Math.min(limit, 25)),
    raw_json: "1",
  });

  const listing = await fetchRedditJson(
    `/r/${encodeURIComponent(sub)}/new.json?${params}`
  );
  return mapChildren(listing?.data?.children);
}

/** Sitewide Reddit search */
export async function searchRedditGlobal(
  query: string,
  limit = 20
): Promise<RawCommunityPost[]> {
  const params = new URLSearchParams({
    q: query,
    sort: "relevance",
    t: "month",
    limit: String(Math.min(limit, 25)),
    raw_json: "1",
    type: "link",
  });

  const listing = await fetchRedditJson(`/search.json?${params}`);
  return mapChildren(listing?.data?.children);
}
