export type RawCommunityPost = {
  id: string;
  platform: "reddit" | "hackernews" | "other";
  community: string;
  title: string;
  body: string;
  author: string;
  authorProfileUrl: string | null;
  url: string;
  permalink: string;
  score: number;
  commentCount: number;
  createdAt: string;
  flair: string | null;
};

export type ScoredLeadPost = {
  title: string;
  description: string;
  source: string;
  url: string;
  relevance_score: number;
  author: string;
  author_profile_url: string | null;
  post_body: string;
  community: string;
  platform: string;
  score: number;
  comment_count: number;
  posted_at: string;
  intent: "buying" | "pain" | "looking_for_tool" | "advice" | "hiring" | "other";
  approach_angle: string;
  lead_type: "post" | "community";
};
