import { describe, expect, it } from "vitest";
import {
  buildProjectImportTemplateCsv,
  dryRunProjectImportCsv,
  parseCsv,
  validateProjectImportCsv,
} from "@/lib/import/project-csv";
import { PROJECT_IMPORT_MANDATORY_SUMMARY } from "@/lib/import/project-csv-schema";
import { writeFileSync } from "fs";
import { join } from "path";

describe("project CSV import", () => {
  it("parses and validates the built-in template", () => {
    const csv = buildProjectImportTemplateCsv();
    const { headers } = parseCsv(csv);
    expect(headers).toContain("project_key");
    expect(headers).toContain("record_type");
    expect(headers).toContain("name");

    const result = validateProjectImportCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.projectKeys).toContain("acme-copilot");
    expect(result.rows.some((r) => r.recordType === "project")).toBe(true);
    expect(result.rows.some((r) => r.recordType === "artifact")).toBe(true);
    expect(result.rows.some((r) => r.recordType === "campaign_asset")).toBe(true);
  });

  it("dry-run previews projects and rows without errors on template", () => {
    const preview = dryRunProjectImportCsv(buildProjectImportTemplateCsv());
    expect(preview.ok).toBe(true);
    expect(preview.totals.projects).toBe(1);
    expect(preview.projects[0]?.name).toBe("Acme Copilot");
    expect(preview.totals.artifacts).toBeGreaterThanOrEqual(3);
    expect(preview.rows.length).toBe(preview.totals.rows);
    expect(preview.rows.some((r) => r.recordType === "task")).toBe(true);
  });

  it("dry-run fails closed on invalid CSV", () => {
    const preview = dryRunProjectImportCsv(`project_key,record_type,name
demo,project,
`);
    expect(preview.ok).toBe(false);
    expect(preview.projects).toEqual([]);
    expect(preview.errors.length).toBeGreaterThan(0);
  });

  it("flags missing mandatory project name", () => {
    const csv = `project_key,record_type,name
demo,project,
`;
    const result = validateProjectImportCsv(csv);
    expect(result.errors.some((e) => /require name/i.test(e.message))).toBe(true);
  });

  it("documents mandatory fields per record type", () => {
    expect(PROJECT_IMPORT_MANDATORY_SUMMARY.project).toContain("name");
    expect(PROJECT_IMPORT_MANDATORY_SUMMARY.artifact).toContain("body|url");
    expect(PROJECT_IMPORT_MANDATORY_SUMMARY.env).toContain("env_key");
  });

  it("writes public template file", () => {
    const csv = buildProjectImportTemplateCsv() + "\n";
    const path = join(process.cwd(), "public/templates/projects-import-template.csv");
    writeFileSync(path, csv);
    expect(csv.startsWith("project_key,")).toBe(true);
  });
});
