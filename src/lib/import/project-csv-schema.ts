/**
 * Project batch CSV import — field catalog.
 *
 * Format: multi-row CSV. Rows share `project_key` and use `record_type`
 * to seed a Project plus related product tables in one file.
 */

export const PROJECT_IMPORT_RECORD_TYPES = [
  "project",
  "idea",
  "milestone",
  "task",
  "artifact",
  "seo",
  "content",
  "campaign",
  "campaign_asset",
  "env",
] as const;

export type ProjectImportRecordType = (typeof PROJECT_IMPORT_RECORD_TYPES)[number];

export type CsvFieldDef = {
  key: string;
  label: string;
  /** Which record_types use this column */
  usedBy: ProjectImportRecordType[] | "all";
  /** Required when the row's record_type is in this list (or all usedBy) */
  mandatoryFor: ProjectImportRecordType[] | "never";
  description?: string;
  example?: string;
};

/** Comprehensive column list for the projects import template. */
export const PROJECT_IMPORT_FIELDS: CsvFieldDef[] = [
  {
    key: "project_key",
    label: "Project key",
    usedBy: "all",
    mandatoryFor: [
      "project",
      "idea",
      "milestone",
      "task",
      "artifact",
      "seo",
      "content",
      "campaign",
      "campaign_asset",
      "env",
    ],
    description:
      "Stable slug grouping rows for one project in this file (not the DB id). Use letters, numbers, hyphens.",
    example: "acme-copilot",
  },
  {
    key: "record_type",
    label: "Record type",
    usedBy: "all",
    mandatoryFor: [
      "project",
      "idea",
      "milestone",
      "task",
      "artifact",
      "seo",
      "content",
      "campaign",
      "campaign_asset",
      "env",
    ],
    description: `One of: ${PROJECT_IMPORT_RECORD_TYPES.join(", ")}`,
    example: "project",
  },

  // Project
  {
    key: "name",
    label: "Name",
    usedBy: ["project"],
    mandatoryFor: ["project"],
    description: "Project display name",
    example: "Acme Copilot",
  },
  {
    key: "description",
    label: "Description",
    usedBy: ["project", "idea", "task", "campaign"],
    mandatoryFor: ["idea"],
    description: "Long-form description / idea pitch / task notes / campaign notes",
    example: "AI writing assistant for solopreneurs",
  },
  {
    key: "status",
    label: "Status",
    usedBy: ["project", "idea", "task", "content", "campaign", "campaign_asset"],
    mandatoryFor: "never",
    description:
      "project: planning|building|launched|archived · idea: draft|scored|promoted · task: todo|in_progress|done · content/campaign: draft|…",
    example: "planning",
  },
  {
    key: "repo_url",
    label: "Repo URL",
    usedBy: ["project"],
    mandatoryFor: "never",
    description: "GitHub/GitLab URL (metadata only; does not sync CI)",
    example: "https://github.com/acme/copilot",
  },
  {
    key: "production_url",
    label: "Production URL",
    usedBy: ["project"],
    mandatoryFor: "never",
    description: "Live product URL",
    example: "https://acme.example",
  },
  {
    key: "hosting_provider",
    label: "Hosting provider",
    usedBy: ["project"],
    mandatoryFor: "never",
    example: "Vercel",
  },
  {
    key: "current_version",
    label: "Current version",
    usedBy: ["project"],
    mandatoryFor: "never",
    example: "0.1.0",
  },
  {
    key: "tech_stack",
    label: "Tech stack",
    usedBy: ["project"],
    mandatoryFor: "never",
    description: "Pipe-separated list",
    example: "Next.js|Prisma|Clerk",
  },
  {
    key: "tools_used",
    label: "Tools used",
    usedBy: ["project"],
    mandatoryFor: "never",
    description: "Pipe-separated list",
    example: "Cursor|Figma",
  },
  {
    key: "brand_tone",
    label: "Brand tone",
    usedBy: ["project"],
    mandatoryFor: "never",
    description: "Pipe-separated voice traits",
    example: "confident|clear|friendly",
  },
  {
    key: "brand_avoid",
    label: "Brand avoid",
    usedBy: ["project"],
    mandatoryFor: "never",
    description: "Pipe-separated phrases/tones to avoid",
    example: "hype|jargon",
  },
  {
    key: "brand_audience",
    label: "Brand audience",
    usedBy: ["project"],
    mandatoryFor: "never",
    example: "Indie founders shipping alone",
  },
  {
    key: "dev_notes",
    label: "Dev notes",
    usedBy: ["project"],
    mandatoryFor: "never",
  },
  {
    key: "ai_notes",
    label: "AI notes",
    usedBy: ["project"],
    mandatoryFor: "never",
  },

  // Shared title for child records
  {
    key: "title",
    label: "Title",
    usedBy: [
      "idea",
      "milestone",
      "task",
      "artifact",
      "content",
      "campaign",
      "campaign_asset",
    ],
    mandatoryFor: [
      "idea",
      "milestone",
      "task",
      "artifact",
      "content",
      "campaign",
      "campaign_asset",
    ],
    description: "Title for idea / milestone / task / artifact / content / campaign rows",
    example: "MVP ship",
  },

  // Milestone / task dates
  {
    key: "target_date",
    label: "Target date",
    usedBy: ["milestone"],
    mandatoryFor: ["milestone"],
    description: "ISO date YYYY-MM-DD",
    example: "2026-10-15",
  },
  {
    key: "is_completed",
    label: "Is completed",
    usedBy: ["milestone"],
    mandatoryFor: "never",
    description: "true|false",
    example: "false",
  },
  {
    key: "milestone_title",
    label: "Milestone title",
    usedBy: ["task"],
    mandatoryFor: "never",
    description: "Must match a milestone title in the same project_key block",
    example: "MVP ship",
  },
  {
    key: "priority",
    label: "Priority",
    usedBy: ["task"],
    mandatoryFor: "never",
    description: "low|medium|high",
    example: "high",
  },
  {
    key: "order",
    label: "Order",
    usedBy: ["task", "artifact"],
    mandatoryFor: "never",
    example: "0",
  },
  {
    key: "due_date",
    label: "Due date",
    usedBy: ["task"],
    mandatoryFor: "never",
    example: "2026-10-01",
  },
  {
    key: "estimated_hours",
    label: "Estimated hours",
    usedBy: ["task"],
    mandatoryFor: "never",
    example: "4",
  },

  // Idea scores (optional)
  {
    key: "ai_score",
    label: "AI score",
    usedBy: ["idea"],
    mandatoryFor: "never",
    example: "72",
  },

  // Artifact
  {
    key: "kind",
    label: "Artifact kind",
    usedBy: ["artifact"],
    mandatoryFor: ["artifact"],
    description:
      "short_description|long_description|value_proposition|feature_list|hero_text|tagline|logo|image|video|slideshow|form|markdown|document|google_doc|link|other",
    example: "tagline",
  },
  {
    key: "format",
    label: "Artifact format",
    usedBy: ["artifact"],
    mandatoryFor: "never",
    description: "text|markdown|html|url|image|video|file|json",
    example: "text",
  },
  {
    key: "body",
    label: "Body",
    usedBy: ["artifact", "content", "campaign_asset", "campaign"],
    mandatoryFor: ["campaign_asset"],
    description:
      "Inline text/markdown. Artifacts require body OR url. Campaign assets require body.",
    example: "Ship faster alone",
  },
  {
    key: "url",
    label: "URL",
    usedBy: ["artifact"],
    mandatoryFor: "never",
    description: "External or hosted file URL (artifacts need body or url)",
    example: "https://docs.google.com/document/d/…",
  },
  {
    key: "tags",
    label: "Tags",
    usedBy: ["artifact"],
    mandatoryFor: "never",
    description: "Pipe-separated",
    example: "homepage|ai",
  },

  // SEO
  {
    key: "keyword",
    label: "SEO keyword",
    usedBy: ["seo"],
    mandatoryFor: ["seo"],
    example: "solopreneur command center",
  },
  {
    key: "target_url",
    label: "Target URL",
    usedBy: ["seo"],
    mandatoryFor: "never",
    example: "https://acme.example/blog",
  },
  {
    key: "difficulty",
    label: "Difficulty",
    usedBy: ["seo"],
    mandatoryFor: "never",
    example: "35",
  },
  {
    key: "search_volume",
    label: "Search volume",
    usedBy: ["seo"],
    mandatoryFor: "never",
    example: "1200",
  },
  {
    key: "rank",
    label: "Rank",
    usedBy: ["seo"],
    mandatoryFor: "never",
    example: "12",
  },

  // Content
  {
    key: "type",
    label: "Content type",
    usedBy: ["content"],
    mandatoryFor: "never",
    description: "blog|social|email|video|other",
    example: "blog",
  },
  {
    key: "channel",
    label: "Channel",
    usedBy: ["content", "campaign", "campaign_asset"],
    mandatoryFor: ["campaign"],
    description: "linkedin|x|email|blog|ads|… — required on campaign rows",
    example: "linkedin",
  },
  {
    key: "scheduled_at",
    label: "Scheduled at",
    usedBy: ["content", "campaign"],
    mandatoryFor: "never",
    example: "2026-10-20",
  },
  {
    key: "content_body",
    label: "Content body",
    usedBy: ["content"],
    mandatoryFor: "never",
    description: "Alias for body on content rows",
  },
  {
    key: "hashtags",
    label: "Hashtags",
    usedBy: ["content"],
    mandatoryFor: "never",
    description: "Pipe-separated without requiring #",
    example: "buildinpublic|saas",
  },

  // Campaign
  {
    key: "campaign_type",
    label: "Campaign type",
    usedBy: ["campaign"],
    mandatoryFor: "never",
    description: "launch|feature|content|outreach|ads|retention",
    example: "launch",
  },
  {
    key: "goal",
    label: "Goal",
    usedBy: ["campaign"],
    mandatoryFor: "never",
  },
  {
    key: "audience",
    label: "Audience",
    usedBy: ["campaign"],
    mandatoryFor: "never",
  },
  {
    key: "offer",
    label: "Offer",
    usedBy: ["campaign"],
    mandatoryFor: "never",
  },
  {
    key: "budget",
    label: "Budget",
    usedBy: ["campaign"],
    mandatoryFor: "never",
    example: "500",
  },
  {
    key: "campaign_title",
    label: "Campaign title",
    usedBy: ["campaign_asset"],
    mandatoryFor: ["campaign_asset"],
    description: "Must match a campaign title in the same project_key block",
    example: "Launch week",
  },
  {
    key: "asset_type",
    label: "Asset type",
    usedBy: ["campaign_asset"],
    mandatoryFor: ["campaign_asset"],
    description: "post|thread|email|ad|landing|outreach",
    example: "post",
  },
  {
    key: "day_offset",
    label: "Day offset",
    usedBy: ["campaign_asset"],
    mandatoryFor: "never",
    example: "0",
  },

  // Env (keys only — never import secrets)
  {
    key: "env_key",
    label: "Env key",
    usedBy: ["env"],
    mandatoryFor: ["env"],
    description: "Variable name only. Values are never imported from CSV.",
    example: "DATABASE_URL",
  },
  {
    key: "environment",
    label: "Environment",
    usedBy: ["env"],
    mandatoryFor: "never",
    description: "production|preview|development",
    example: "production",
  },
];

export const PROJECT_IMPORT_MANDATORY_SUMMARY: Record<
  ProjectImportRecordType,
  string[]
> = {
  project: ["project_key", "record_type", "name"],
  idea: ["project_key", "record_type", "title", "description"],
  milestone: ["project_key", "record_type", "title", "target_date"],
  task: ["project_key", "record_type", "title"],
  artifact: ["project_key", "record_type", "title", "kind", "body|url"],
  seo: ["project_key", "record_type", "keyword"],
  content: ["project_key", "record_type", "title"],
  campaign: ["project_key", "record_type", "title", "channel"],
  campaign_asset: [
    "project_key",
    "record_type",
    "title",
    "body",
    "asset_type",
    "campaign_title",
  ],
  env: ["project_key", "record_type", "env_key"],
};

export const MAX_PROJECT_IMPORT_ROWS = 500;
