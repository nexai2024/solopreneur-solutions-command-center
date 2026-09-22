import {
  MAX_PROJECT_IMPORT_ROWS,
  PROJECT_IMPORT_FIELDS,
  PROJECT_IMPORT_RECORD_TYPES,
  type ProjectImportRecordType,
} from "@/lib/import/project-csv-schema";
import { isArtifactKind, type ArtifactKind } from "@/lib/project-artifacts";

export type ParsedCsvRow = {
  __line: number;
  [key: string]: string | number;
};

export type ValidatedImportRow = {
  line: number;
  projectKey: string;
  recordType: ProjectImportRecordType;
  cells: Record<string, string>;
};

export type ProjectImportIssue = {
  line: number;
  projectKey?: string;
  message: string;
};

export type ParsedProjectImport = {
  rows: ValidatedImportRow[];
  errors: ProjectImportIssue[];
  warnings: ProjectImportIssue[];
  projectKeys: string[];
};

function cell(row: Record<string, string | number>, ...keys: string[]): string {
  for (const key of keys) {
    const raw = row[key];
    const value = raw == null ? "" : String(raw).trim();
    if (value) return value;
  }
  return "";
}

function parsePipeList(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(value: string, fallback = false): boolean {
  if (!value.trim()) return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  return fallback;
}

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  // Prefer YYYY-MM-DD as UTC noon to avoid TZ day shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return new Date(`${value.trim()}T12:00:00.000Z`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Minimal RFC4180 CSV parser (quoted fields, escaped quotes). */
export function parseCsv(text: string): { headers: string[]; rows: ParsedCsvRow[] } {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]!;
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      field = "";
      // skip fully empty trailing lines
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  const dataRows: ParsedCsvRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i]!;
    const obj: ParsedCsvRow = { __line: i + 1 };
    headers.forEach((header, idx) => {
      if (!header) return;
      obj[header] = (raw[idx] ?? "").trim();
    });
    dataRows.push(obj);
  }

  return { headers, rows: dataRows };
}

function isRecordType(value: string): value is ProjectImportRecordType {
  return (PROJECT_IMPORT_RECORD_TYPES as readonly string[]).includes(value);
}

export function validateProjectImportCsv(text: string): ParsedProjectImport {
  const errors: ProjectImportIssue[] = [];
  const warnings: ProjectImportIssue[] = [];
  const { headers, rows } = parseCsv(text);

  if (headers.length === 0) {
    return {
      rows: [],
      errors: [{ line: 0, message: "CSV is empty" }],
      warnings: [],
      projectKeys: [],
    };
  }

  if (!headers.includes("project_key") || !headers.includes("record_type")) {
    errors.push({
      line: 1,
      message: "CSV must include project_key and record_type columns",
    });
  }

  if (rows.length > MAX_PROJECT_IMPORT_ROWS) {
    errors.push({
      line: 0,
      message: `Too many rows (max ${MAX_PROJECT_IMPORT_ROWS})`,
    });
  }

  const validated: ValidatedImportRow[] = [];
  const projectKeys = new Set<string>();
  const projectNames = new Map<string, string>();
  const milestoneTitles = new Map<string, Set<string>>();
  const campaignTitles = new Map<string, Set<string>>();

  for (const row of rows) {
    if (errors.length > 40) break;

    const projectKey = cell(row, "project_key").toLowerCase();
    const recordTypeRaw = cell(row, "record_type").toLowerCase();
    const line = row.__line;

    if (!projectKey) {
      errors.push({ line, message: "project_key is required" });
      continue;
    }
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(projectKey)) {
      errors.push({
        line,
        projectKey,
        message:
          "project_key must be 1–64 chars: letters, numbers, hyphen, underscore",
      });
      continue;
    }
    if (!isRecordType(recordTypeRaw)) {
      errors.push({
        line,
        projectKey,
        message: `Unknown record_type "${recordTypeRaw}"`,
      });
      continue;
    }

    projectKeys.add(projectKey);
    const cells: Record<string, string> = {};
    for (const field of PROJECT_IMPORT_FIELDS) {
      cells[field.key] = cell(row, field.key);
    }
    // aliases
    if (!cells.description) cells.description = cell(row, "description");
    if (!cells.body) cells.body = cell(row, "body", "content_body", "description");
    if (!cells.title) cells.title = cell(row, "title", "name");
    if (!cells.name) cells.name = cell(row, "name", "title");

    const issue = (message: string) => {
      errors.push({ line, projectKey, message });
    };

    switch (recordTypeRaw) {
      case "project": {
        if (!cells.name) issue("project rows require name");
        else projectNames.set(projectKey, cells.name);
        break;
      }
      case "idea": {
        if (!cells.title) issue("idea rows require title");
        if (!cells.description) issue("idea rows require description");
        break;
      }
      case "milestone": {
        if (!cells.title) issue("milestone rows require title");
        if (!cells.target_date) issue("milestone rows require target_date (YYYY-MM-DD)");
        else if (!parseDate(cells.target_date)) {
          issue(`Invalid target_date "${cells.target_date}"`);
        }
        if (cells.title) {
          const set = milestoneTitles.get(projectKey) ?? new Set();
          set.add(cells.title.toLowerCase());
          milestoneTitles.set(projectKey, set);
        }
        break;
      }
      case "task": {
        if (!cells.title) issue("task rows require title");
        if (cells.due_date && !parseDate(cells.due_date)) {
          issue(`Invalid due_date "${cells.due_date}"`);
        }
        break;
      }
      case "artifact": {
        if (!cells.title) issue("artifact rows require title");
        if (!cells.kind) issue("artifact rows require kind");
        else if (!isArtifactKind(cells.kind)) {
          warnings.push({
            line,
            projectKey,
            message: `Unknown artifact kind "${cells.kind}" — will store as other`,
          });
        }
        if (!cells.body && !cells.url) {
          issue("artifact rows require body or url");
        }
        break;
      }
      case "seo": {
        if (!cells.keyword) issue("seo rows require keyword");
        break;
      }
      case "content": {
        if (!cells.title) issue("content rows require title");
        break;
      }
      case "campaign": {
        if (!cells.title) issue("campaign rows require title");
        if (!cells.channel) issue("campaign rows require channel");
        if (cells.title) {
          const set = campaignTitles.get(projectKey) ?? new Set();
          set.add(cells.title.toLowerCase());
          campaignTitles.set(projectKey, set);
        }
        break;
      }
      case "campaign_asset": {
        if (!cells.title) issue("campaign_asset rows require title");
        if (!cells.body) issue("campaign_asset rows require body");
        if (!cells.asset_type) issue("campaign_asset rows require asset_type");
        if (!cells.campaign_title) {
          issue("campaign_asset rows require campaign_title");
        }
        break;
      }
      case "env": {
        if (!cells.env_key) issue("env rows require env_key");
        if (cell(row, "env_value", "value")) {
          warnings.push({
            line,
            projectKey,
            message:
              "Env values are ignored for safety — only env_key / environment are imported",
          });
        }
        break;
      }
    }

    validated.push({
      line,
      projectKey,
      recordType: recordTypeRaw,
      cells,
    });
  }

  // Second pass: referential checks within file
  for (const row of validated) {
    if (row.recordType === "task" && row.cells.milestone_title) {
      const titles = milestoneTitles.get(row.projectKey);
      if (!titles?.has(row.cells.milestone_title.toLowerCase())) {
        // May still resolve if milestone is created with title — warn only if no milestone rows
        if (!titles || titles.size === 0) {
          warnings.push({
            line: row.line,
            projectKey: row.projectKey,
            message: `milestone_title "${row.cells.milestone_title}" has no milestone row in this file`,
          });
        } else if (!titles.has(row.cells.milestone_title.toLowerCase())) {
          errors.push({
            line: row.line,
            projectKey: row.projectKey,
            message: `milestone_title "${row.cells.milestone_title}" does not match a milestone in this file`,
          });
        }
      }
    }
    if (row.recordType === "campaign_asset" && row.cells.campaign_title) {
      const titles = campaignTitles.get(row.projectKey);
      if (!titles?.has(row.cells.campaign_title.toLowerCase())) {
        errors.push({
          line: row.line,
          projectKey: row.projectKey,
          message: `campaign_title "${row.cells.campaign_title}" does not match a campaign in this file`,
        });
      }
    }
  }

  // Ensure each project_key has a project row (or we can synthesize from name on first child)
  for (const key of projectKeys) {
    const hasProject = validated.some(
      (r) => r.projectKey === key && r.recordType === "project"
    );
    if (!hasProject) {
      const first = validated.find((r) => r.projectKey === key);
      const fallbackName = first?.cells.title || first?.cells.name || key;
      warnings.push({
        line: first?.line ?? 0,
        projectKey: key,
        message: `No project row for "${key}" — will synthesize project named "${fallbackName}"`,
      });
    }
  }

  return {
    rows: errors.length ? validated : validated,
    errors,
    warnings,
    projectKeys: [...projectKeys],
  };
}

export function buildProjectImportTemplateCsv(): string {
  const headers = PROJECT_IMPORT_FIELDS.map((f) => f.key);
  const sampleRows: string[][] = [
    // project
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "project",
        name: "Acme Copilot",
        description: "AI writing assistant for solopreneurs",
        status: "planning",
        repo_url: "https://github.com/acme/copilot",
        production_url: "https://acme.example",
        hosting_provider: "Vercel",
        current_version: "0.1.0",
        tech_stack: "Next.js|Prisma|Clerk",
        tools_used: "Cursor|Figma",
        brand_tone: "confident|clear",
        brand_avoid: "hype|jargon",
        brand_audience: "Indie founders shipping alone",
        dev_notes: "MVP focuses on weekly digest",
        ai_notes: "Merged from brainstorm session",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "idea",
        title: "Waitlist launch",
        description: "Collect emails before public launch",
        status: "promoted",
        ai_score: "78",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "milestone",
        title: "MVP ship",
        target_date: "2026-10-15",
        is_completed: "false",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "task",
        title: "Wire Stripe checkout",
        description: "Checkout + webhook for subscriptions",
        status: "todo",
        milestone_title: "MVP ship",
        priority: "high",
        order: "1",
        estimated_hours: "6",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "artifact",
        title: "Homepage tagline",
        kind: "tagline",
        format: "text",
        body: "Ship faster alone",
        tags: "homepage|ai",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "artifact",
        title: "Short description",
        kind: "short_description",
        format: "text",
        body: "Acme Copilot drafts your weekly founder updates in minutes.",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "artifact",
        title: "Value proposition",
        kind: "value_proposition",
        format: "text",
        body: "For solopreneurs who juggle product and marketing — stay consistent without a content team.",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "artifact",
        title: "Feature list",
        kind: "feature_list",
        format: "markdown",
        body: "- AI draft from notes\n- Brand voice presets\n- One-click publish checklist",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "seo",
        keyword: "solopreneur writing assistant",
        target_url: "https://acme.example",
        difficulty: "40",
        search_volume: "900",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "content",
        title: "Why we built Acme",
        type: "blog",
        channel: "blog",
        status: "draft",
        body: "Outline: problem, solution, waitlist CTA",
        hashtags: "buildinpublic|saas",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "campaign",
        title: "Launch week",
        channel: "x",
        campaign_type: "launch",
        status: "draft",
        goal: "200 waitlist signups",
        audience: "Indie hackers on X",
        offer: "Early access",
        budget: "0",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "campaign_asset",
        title: "Day-0 tweet",
        campaign_title: "Launch week",
        channel: "x",
        asset_type: "post",
        body: "Shipping Acme Copilot — AI drafts for founders who ship alone. Join the waitlist.",
        day_offset: "0",
        status: "draft",
      };
      return map[h] ?? "";
    }),
    headers.map((h) => {
      const map: Record<string, string> = {
        project_key: "acme-copilot",
        record_type: "env",
        env_key: "OPENAI_API_KEY",
        environment: "production",
      };
      return map[h] ?? "";
    }),
  ];

  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  return [
    headers.join(","),
    ...sampleRows.map((cols) => cols.map(escape).join(",")),
  ].join("\n");
}

export type ProjectImportCountBucket = {
  ideas: number;
  milestones: number;
  tasks: number;
  artifacts: number;
  seo: number;
  content: number;
  campaigns: number;
  campaignAssets: number;
  envKeys: number;
};

export type ProjectImportPreviewRow = {
  line: number;
  projectKey: string;
  recordType: ProjectImportRecordType;
  label: string;
  detail: string;
};

export type ProjectImportPreviewProject = {
  projectKey: string;
  name: string;
  synthesized: boolean;
  rowCount: number;
  counts: ProjectImportCountBucket;
};

export type ProjectImportDryRun = {
  ok: boolean;
  errors: ProjectImportIssue[];
  warnings: ProjectImportIssue[];
  projects: ProjectImportPreviewProject[];
  rows: ProjectImportPreviewRow[];
  totals: ProjectImportCountBucket & { projects: number; rows: number };
};

function emptyCounts(): ProjectImportCountBucket {
  return {
    ideas: 0,
    milestones: 0,
    tasks: 0,
    artifacts: 0,
    seo: 0,
    content: 0,
    campaigns: 0,
    campaignAssets: 0,
    envKeys: 0,
  };
}

function bumpCount(
  counts: ProjectImportCountBucket,
  recordType: ProjectImportRecordType
) {
  switch (recordType) {
    case "idea":
      counts.ideas += 1;
      break;
    case "milestone":
      counts.milestones += 1;
      break;
    case "task":
      counts.tasks += 1;
      break;
    case "artifact":
      counts.artifacts += 1;
      break;
    case "seo":
      counts.seo += 1;
      break;
    case "content":
      counts.content += 1;
      break;
    case "campaign":
      counts.campaigns += 1;
      break;
    case "campaign_asset":
      counts.campaignAssets += 1;
      break;
    case "env":
      counts.envKeys += 1;
      break;
    default:
      break;
  }
}

function rowLabel(row: ValidatedImportRow): { label: string; detail: string } {
  const c = row.cells;
  switch (row.recordType) {
    case "project":
      return {
        label: c.name || row.projectKey,
        detail: c.status || "planning",
      };
    case "idea":
      return { label: c.title, detail: (c.description || "").slice(0, 80) };
    case "milestone":
      return { label: c.title, detail: c.target_date };
    case "task":
      return {
        label: c.title,
        detail: [c.priority, c.milestone_title].filter(Boolean).join(" · "),
      };
    case "artifact":
      return { label: c.title, detail: c.kind };
    case "seo":
      return { label: c.keyword, detail: c.target_url };
    case "content":
      return { label: c.title, detail: [c.type, c.channel].filter(Boolean).join(" · ") };
    case "campaign":
      return { label: c.title, detail: c.channel };
    case "campaign_asset":
      return {
        label: c.title,
        detail: [c.campaign_title, c.asset_type].filter(Boolean).join(" · "),
      };
    case "env":
      return {
        label: c.env_key,
        detail: c.environment || "production",
      };
    default:
      return { label: row.recordType, detail: "" };
  }
}

/**
 * Dry-run: validate CSV and summarize projects/rows that would be created.
 * Does not write to the database.
 */
export function dryRunProjectImportCsv(text: string): ProjectImportDryRun {
  const parsed = validateProjectImportCsv(text);
  const totals = { ...emptyCounts(), projects: 0, rows: 0 };
  const projects: ProjectImportPreviewProject[] = [];
  const previewRows: ProjectImportPreviewRow[] = [];

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      errors: parsed.errors,
      warnings: parsed.warnings,
      projects: [],
      rows: [],
      totals,
    };
  }

  const byKey = new Map<string, ValidatedImportRow[]>();
  for (const row of parsed.rows) {
    const list = byKey.get(row.projectKey) ?? [];
    list.push(row);
    byKey.set(row.projectKey, list);
  }

  for (const [projectKey, rows] of byKey) {
    const projectRow = rows.find((r) => r.recordType === "project");
    const first = rows[0]!;
    const synthesized = !projectRow;
    const name =
      projectRow?.cells.name?.trim() ||
      first.cells.name?.trim() ||
      first.cells.title?.trim() ||
      projectKey;

    const counts = emptyCounts();
    for (const row of rows) {
      if (row.recordType !== "project") bumpCount(counts, row.recordType);
      const { label, detail } = rowLabel(row);
      previewRows.push({
        line: row.line,
        projectKey,
        recordType: row.recordType,
        label,
        detail,
      });
    }

    projects.push({
      projectKey,
      name,
      synthesized,
      rowCount: rows.length,
      counts,
    });

    totals.projects += 1;
    totals.rows += rows.length;
    totals.ideas += counts.ideas;
    totals.milestones += counts.milestones;
    totals.tasks += counts.tasks;
    totals.artifacts += counts.artifacts;
    totals.seo += counts.seo;
    totals.content += counts.content;
    totals.campaigns += counts.campaigns;
    totals.campaignAssets += counts.campaignAssets;
    totals.envKeys += counts.envKeys;
  }

  return {
    ok: true,
    errors: [],
    warnings: parsed.warnings,
    projects,
    rows: previewRows,
    totals,
  };
}

export {
  parsePipeList,
  parseBool,
  parseDate,
  parseNumber,
  cell,
};
