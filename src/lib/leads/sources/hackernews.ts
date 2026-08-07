import type { RawCommunityPost } from "@/lib/leads/sources/types";

type AlgoliaHit = {
  objectID: string;
  title?: string;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  author?: string;
  url?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at?: string;
  created_at_i?: number;
};

type AlgoliaResponse = {
  hits?: AlgoliaHit[];
};

export async function searchHackerNews(
  query: string,
  limit = 15
): Promise<RawCommunityPost[]> {
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: String(Math.min(limit, 20)),
  });

  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?${params}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) {
      console.warn("[hn] fetch failed", res.status);
      return [];
    }

    const data = (await res.json()) as AlgoliaResponse;
    const posts: RawCommunityPost[] = [];

    for (const hit of data.hits ?? []) {
      if (!hit.objectID || !hit.author) continue;
      const title = hit.title || hit.story_title;
      if (!title) continue;

      const body = (hit.story_text || hit.comment_text || "").slice(0, 4000);
      const permalink = `https://news.ycombinator.com/item?id=${hit.objectID}`;

      posts.push({
        id: `hn_${hit.objectID}`,
        platform: "hackernews",
        community: "Hacker News",
        title,
        body,
        author: hit.author,
        authorProfileUrl: `https://news.ycombinator.com/user?id=${encodeURIComponent(hit.author)}`,
        url: hit.url || permalink,
        permalink,
        score: hit.points ?? 0,
        commentCount: hit.num_comments ?? 0,
        createdAt: hit.created_at
          ? new Date(hit.created_at).toISOString()
          : hit.created_at_i
            ? new Date(hit.created_at_i * 1000).toISOString()
            : new Date().toISOString(),
        flair: null,
      });
    }

    return posts;
  } catch (err) {
    console.warn("[hn] fetch error", err instanceof Error ? err.message : err);
    return [];
  }
}
