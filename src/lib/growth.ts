export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export type SEOKeyword = {
  id: string;
  project_id: string;
  keyword: string;
  target_url: string | null;
  difficulty: number;
  search_volume: number;
  rank: number | null;
  created_at: string;
};

export type ContentItem = {
  id: string;
  project_id: string;
  title: string;
  type: string;
  status: "draft" | "scheduled" | "published";
  scheduled_at: string | null;
  content_body: string | null;
  created_at: string;
};
