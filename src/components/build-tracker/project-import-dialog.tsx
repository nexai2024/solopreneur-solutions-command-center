"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  importProjectsFromCsv,
  type ProjectImportResult,
} from "@/lib/actions/project-import";
import {
  dryRunProjectImportCsv,
  type ProjectImportDryRun,
} from "@/lib/import/project-csv";
import { PROJECT_IMPORT_MANDATORY_SUMMARY } from "@/lib/import/project-csv-schema";

export function ProjectImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<ProjectImportDryRun | null>(null);
  const [result, setResult] = useState<ProjectImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const mandatoryPreview = useMemo(
    () =>
      Object.entries(PROJECT_IMPORT_MANDATORY_SUMMARY).map(([type, fields]) => ({
        type,
        fields: fields.join(", "),
      })),
    []
  );

  const resetPreview = () => {
    setDryRun(null);
    setResult(null);
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    resetPreview();
  };

  const runPreview = () => {
    if (!csvText.trim()) {
      toast.error("Paste CSV or choose a file first");
      return;
    }
    const preview = dryRunProjectImportCsv(csvText);
    setDryRun(preview);
    setResult(null);
    if (!preview.ok) {
      toast.error(`Preview found ${preview.errors.length} error(s)`);
      return;
    }
    toast.success(
      `Dry run OK · ${preview.totals.projects} project(s), ${preview.totals.rows} row(s)`
    );
  };

  const runImport = () => {
    if (!csvText.trim()) {
      toast.error("Paste CSV or choose a file first");
      return;
    }
    if (!dryRun?.ok) {
      toast.error("Run Preview first and fix any errors before importing");
      return;
    }
    startTransition(async () => {
      try {
        const res = await importProjectsFromCsv(csvText);
        setResult(res);
        if (!res.ok) {
          toast.error(`Import failed · ${res.errors.length} error(s)`);
          return;
        }
        toast.success(
          `Imported ${res.projectsCreated} project(s) · ${res.counts.artifacts} artifacts · ${res.counts.tasks} tasks`
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1" />
        Import CSV
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            resetPreview();
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import projects from CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Use one row per record. Share a <code>project_key</code> across rows and set{" "}
              <code>record_type</code> to seed project profile, ideas, milestones, tasks,
              artifacts, SEO, content, campaigns, and env key names. Preview is a dry run —
              nothing is saved until you confirm Import.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" asChild>
                <a href="/templates/projects-import-template.csv" download>
                  <Download className="h-4 w-4 mr-1" />
                  Download template
                </a>
              </Button>
              <label className="inline-flex">
                <Button size="sm" variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    Choose file
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {fileName && (
                <Badge variant="secondary" className="self-center">
                  {fileName}
                </Badge>
              )}
            </div>

            <details className="rounded-lg border px-3 py-2">
              <summary className="cursor-pointer font-medium">
                Mandatory fields by record type
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {mandatoryPreview.map((row) => (
                  <li key={row.type}>
                    <span className="font-mono text-foreground">{row.type}</span>:{" "}
                    {row.fields}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Env rows import key names only — secret values are never read from CSV.
              </p>
            </details>

            <Textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                resetPreview();
              }}
              placeholder="Paste CSV here…"
              rows={8}
              className="font-mono text-xs"
            />

            {dryRun && (
              <div className="space-y-3">
                <div
                  className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${
                    dryRun.ok
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  {dryRun.ok ? (
                    <>
                      <p className="font-medium">
                        Dry run — nothing written yet
                      </p>
                      <p>
                        Would create {dryRun.totals.projects} project(s) from{" "}
                        {dryRun.totals.rows} row(s): ideas {dryRun.totals.ideas} ·
                        milestones {dryRun.totals.milestones} · tasks{" "}
                        {dryRun.totals.tasks} · artifacts {dryRun.totals.artifacts} ·
                        seo {dryRun.totals.seo} · content {dryRun.totals.content} ·
                        campaigns {dryRun.totals.campaigns} · assets{" "}
                        {dryRun.totals.campaignAssets} · env keys{" "}
                        {dryRun.totals.envKeys}
                      </p>
                    </>
                  ) : (
                    <p className="font-medium">Fix these errors before importing</p>
                  )}
                  {dryRun.errors.slice(0, 12).map((e, i) => (
                    <p key={`e-${i}`} className="text-destructive">
                      Line {e.line}
                      {e.projectKey ? ` (${e.projectKey})` : ""}: {e.message}
                    </p>
                  ))}
                  {dryRun.warnings.slice(0, 6).map((w, i) => (
                    <p key={`w-${i}`} className="text-amber-700 dark:text-amber-400">
                      Line {w.line}
                      {w.projectKey ? ` (${w.projectKey})` : ""}: {w.message}
                    </p>
                  ))}
                </div>

                {dryRun.ok && dryRun.projects.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/40 text-xs font-medium">
                      Projects that would be created
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Key</th>
                            <th className="px-3 py-2 font-medium">Name</th>
                            <th className="px-3 py-2 font-medium">Rows</th>
                            <th className="px-3 py-2 font-medium">Breakdown</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dryRun.projects.map((p) => (
                            <tr key={p.projectKey} className="border-b last:border-0">
                              <td className="px-3 py-2 font-mono">{p.projectKey}</td>
                              <td className="px-3 py-2">
                                {p.name}
                                {p.synthesized && (
                                  <Badge variant="outline" className="ml-2 text-[10px]">
                                    synthesized
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2">{p.rowCount}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {[
                                  p.counts.ideas && `${p.counts.ideas} ideas`,
                                  p.counts.milestones &&
                                    `${p.counts.milestones} milestones`,
                                  p.counts.tasks && `${p.counts.tasks} tasks`,
                                  p.counts.artifacts &&
                                    `${p.counts.artifacts} artifacts`,
                                  p.counts.seo && `${p.counts.seo} seo`,
                                  p.counts.content && `${p.counts.content} content`,
                                  p.counts.campaigns &&
                                    `${p.counts.campaigns} campaigns`,
                                  p.counts.campaignAssets &&
                                    `${p.counts.campaignAssets} assets`,
                                  p.counts.envKeys && `${p.counts.envKeys} env`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "project only"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {dryRun.ok && dryRun.rows.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/40 text-xs font-medium">
                      Rows that would be created ({dryRun.rows.length})
                    </div>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Line</th>
                            <th className="px-3 py-2 font-medium">Project</th>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium">Label</th>
                            <th className="px-3 py-2 font-medium">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dryRun.rows.map((r) => (
                            <tr
                              key={`${r.projectKey}-${r.line}-${r.recordType}`}
                              className="border-b last:border-0"
                            >
                              <td className="px-3 py-1.5 text-muted-foreground">
                                {r.line}
                              </td>
                              <td className="px-3 py-1.5 font-mono">{r.projectKey}</td>
                              <td className="px-3 py-1.5">
                                <Badge variant="secondary" className="text-[10px]">
                                  {r.recordType}
                                </Badge>
                              </td>
                              <td className="px-3 py-1.5 max-w-[10rem] truncate">
                                {r.label}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground max-w-[14rem] truncate">
                                {r.detail}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div
                className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${
                  result.ok
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                {result.ok ? (
                  <>
                    <p className="font-medium">
                      Created {result.projectsCreated} project(s)
                    </p>
                    <p>
                      ideas {result.counts.ideas} · milestones {result.counts.milestones} ·
                      tasks {result.counts.tasks} · artifacts {result.counts.artifacts} ·
                      seo {result.counts.seo} · content {result.counts.content} · campaigns{" "}
                      {result.counts.campaigns} · assets {result.counts.campaignAssets} ·
                      env keys {result.counts.envKeys}
                    </p>
                  </>
                ) : (
                  <p className="font-medium">Import failed — fix and re-preview</p>
                )}
                {result.errors.slice(0, 12).map((e, i) => (
                  <p key={`re-${i}`} className="text-destructive">
                    Line {e.line}
                    {e.projectKey ? ` (${e.projectKey})` : ""}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              variant="secondary"
              disabled={!csvText.trim()}
              onClick={runPreview}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              disabled={pending || !dryRun?.ok}
              onClick={runImport}
              title={
                dryRun?.ok
                  ? "Commit this import to the database"
                  : "Run Preview successfully first"
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
