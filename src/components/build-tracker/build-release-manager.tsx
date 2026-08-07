"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BUILD_PLATFORMS,
  ARTIFACT_TYPES,
  pipelineLabel,
} from "@/lib/build-rbac";
import type { BuildReleaseDTO } from "@/lib/actions/build-library";
import {
  createBuildRelease,
  deleteBuildRelease,
  updateBuildRelease,
  addBuildArtifact,
} from "@/lib/actions/build-library";

function formatBytes(bytes: string | null): string {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function qrCodeUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}`;
}

export function BuildReleaseManager({
  projectId,
  projectName,
  builds: initialBuilds,
  canUpload,
  canDelete,
  metrics,
}: {
  projectId: string;
  projectName: string;
  builds: BuildReleaseDTO[];
  canUpload: boolean;
  canDelete: boolean;
  metrics: {
    totalBuilds: number;
    successRate: number | null;
    failedCount: number;
    avgBuildTimeSec: number | null;
    recentVelocity: number;
  };
}) {
  const [builds, setBuilds] = useState(initialBuilds);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBuilds[0]?.id ?? null
  );
  const [isPending, startTransition] = useTransition();

  const selected = builds.find((b) => b.id === selectedId) ?? builds[0];

  const [form, setForm] = useState({
    appName: projectName,
    platform: "web",
    version: "v1.0.0",
    environment: "Dev",
    branch: "",
    commitSha: "",
    commitUrl: "",
    releaseNotes: "",
    testingInstructions: "",
    knownIssues: "",
    previewUrl: "",
    artifactName: "",
    artifactType: "url",
    artifactUrl: "",
    artifactSize: "",
  });

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const created = await createBuildRelease({
          projectId,
          appName: form.appName,
          platform: form.platform as "ios" | "android" | "web",
          version: form.version,
          environment: form.environment,
          branch: form.branch || undefined,
          commitSha: form.commitSha || undefined,
          commitUrl: form.commitUrl || undefined,
          releaseNotes: form.releaseNotes || undefined,
          testingInstructions: form.testingInstructions || undefined,
          knownIssues: form.knownIssues || undefined,
          previewUrl: form.previewUrl || undefined,
          artifacts: form.artifactUrl
            ? [
                {
                  name: form.artifactName || "Build artifact",
                  artifactType: form.artifactType as "apk" | "aab" | "ipa" | "zip" | "url",
                  downloadUrl: form.artifactUrl,
                  sizeBytes: form.artifactSize
                    ? parseInt(form.artifactSize, 10)
                    : undefined,
                },
              ]
            : undefined,
        });
        setBuilds((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setCreateOpen(false);
        toast.success("Build created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create build");
      }
    });
  };

  const handleSaveNotes = () => {
    if (!selected) return;
    startTransition(async () => {
      try {
        const updated = await updateBuildRelease(selected.id, {
          releaseNotes: form.releaseNotes,
          testingInstructions: form.testingInstructions,
          knownIssues: form.knownIssues,
        });
        setBuilds((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        toast.success("Notes saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this build?")) return;
    startTransition(async () => {
      try {
        await deleteBuildRelease(id);
        setBuilds((prev) => prev.filter((b) => b.id !== id));
        if (selectedId === id) setSelectedId(builds[0]?.id ?? null);
        toast.success("Build deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  };

  const handleAddArtifact = () => {
    if (!selected || !form.artifactUrl) return;
    startTransition(async () => {
      try {
        const updated = await addBuildArtifact(selected.id, {
          name: form.artifactName || "Artifact",
          artifactType: form.artifactType as "apk" | "aab" | "ipa" | "zip" | "url",
          downloadUrl: form.artifactUrl,
          sizeBytes: form.artifactSize ? parseInt(form.artifactSize, 10) : undefined,
        });
        setBuilds((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        toast.success("Artifact added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add artifact");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{metrics.totalBuilds}</p>
            <p className="text-xs text-muted-foreground">Total builds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              {metrics.successRate != null ? `${metrics.successRate}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              {metrics.avgBuildTimeSec != null ? `${metrics.avgBuildTimeSec}s` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Avg build time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{metrics.recentVelocity}</p>
            <p className="text-xs text-muted-foreground">Builds this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Build library</h3>
        {canUpload && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New build
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {builds.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No builds yet.</p>
              <HowDoILink section="build-tracker" />
            </div>
          ) : (
            builds.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedId(b.id);
                  setForm((f) => ({
                    ...f,
                    releaseNotes: b.releaseNotes ?? "",
                    testingInstructions: b.testingInstructions ?? "",
                    knownIssues: b.knownIssues ?? "",
                  }));
                }}
                className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                  selected?.id === b.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="font-semibold truncate">
                  {b.version} (#{b.buildNumber})
                </p>
                <p className="text-muted-foreground capitalize">
                  {b.platform} · {pipelineLabel(b.pipelineStatus)}
                </p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {b.environment}
                </Badge>
              </button>
            ))
          )}
        </div>

        {selected && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {selected.appName} {selected.version}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Build #{selected.buildNumber} · {selected.platform} ·{" "}
                    {selected.environment} · {pipelineLabel(selected.pipelineStatus)}
                  </p>
                </div>
                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(selected.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.commitSha && (
                <p className="text-xs">
                  Commit:{" "}
                  <a
                    href={selected.commitUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[hsl(var(--os-cyan))] hover:underline"
                  >
                    {selected.commitSha.slice(0, 7)}
                  </a>
                </p>
              )}

              {selected.sizeDeltaPercent != null && (
                <p
                  className={`text-xs ${
                    selected.sizeDeltaPercent > 10
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  }`}
                >
                  Artifact size change: {selected.sizeDeltaPercent > 0 ? "+" : ""}
                  {selected.sizeDeltaPercent}% vs previous build
                  {selected.sizeDeltaPercent > 15 ? " ⚠ bloat alert" : ""}
                </p>
              )}

              {selected.testTotalCount != null && (
                <p className="text-xs">
                  Tests: {selected.testPassRate?.toFixed(0)}% pass (
                  {selected.testFailedCount} failed of {selected.testTotalCount})
                </p>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium">Release notes</label>
                <Textarea
                  value={form.releaseNotes}
                  onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
                  rows={3}
                  disabled={!canUpload}
                  className="text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Testing instructions</label>
                <Textarea
                  value={form.testingInstructions}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, testingInstructions: e.target.value }))
                  }
                  rows={2}
                  disabled={!canUpload}
                  className="text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Known issues</label>
                <Textarea
                  value={form.knownIssues}
                  onChange={(e) => setForm((f) => ({ ...f, knownIssues: e.target.value }))}
                  rows={2}
                  disabled={!canUpload}
                  className="text-xs"
                />
              </div>
              {canUpload && (
                <Button size="sm" onClick={handleSaveNotes} disabled={isPending}>
                  Save notes
                </Button>
              )}

              <div className="border-t pt-4 space-y-2">
                <p className="text-xs font-semibold">Artifacts</p>
                {selected.artifacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No artifacts attached.</p>
                ) : (
                  selected.artifacts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 text-xs border rounded-md p-2"
                    >
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-muted-foreground uppercase">{a.artifactType}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatBytes(a.sizeBytes)}
                        </span>
                        <a href={a.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))
                )}

                {(selected.previewUrl ||
                  selected.artifacts.some((a) =>
                    ["apk", "aab", "ipa"].includes(a.artifactType)
                  )) && (
                  <div className="flex items-start gap-4 pt-2">
                    <div>
                      <p className="text-[10px] font-medium flex items-center gap-1 mb-2">
                        <QrCode className="h-3 w-3" /> Scan to install
                      </p>
                      <img
                        src={qrCodeUrl(
                          selected.previewUrl ??
                            selected.artifacts.find((a) =>
                              ["apk", "aab", "ipa", "url"].includes(a.artifactType)
                            )?.downloadUrl ??
                            ""
                        )}
                        alt="QR install"
                        className="rounded border w-[120px] h-[120px]"
                      />
                    </div>
                  </div>
                )}

                {canUpload && (
                  <div className="grid gap-2 sm:grid-cols-2 pt-2">
                    <Input
                      placeholder="Artifact name"
                      value={form.artifactName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, artifactName: e.target.value }))
                      }
                      className="text-xs"
                    />
                    <Select
                      value={form.artifactType}
                      onValueChange={(v) => setForm((f) => ({ ...f, artifactType: v }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARTIFACT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Download / deploy URL"
                      value={form.artifactUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, artifactUrl: e.target.value }))
                      }
                      className="text-xs sm:col-span-2"
                    />
                    <Button size="sm" variant="secondary" onClick={handleAddArtifact}>
                      Add artifact
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New build</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input
              placeholder="App name"
              value={form.appName}
              onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={form.platform}
                onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  {BUILD_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Version (v1.2.0)"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
            </div>
            <Select
              value={form.environment}
              onValueChange={(v) => setForm((f) => ({ ...f, environment: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                {["Dev", "Staging", "UAT", "Production"].map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Branch (optional)"
              value={form.branch}
              onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
            />
            <Input
              placeholder="Commit SHA (optional)"
              value={form.commitSha}
              onChange={(e) => setForm((f) => ({ ...f, commitSha: e.target.value }))}
            />
            <Input
              placeholder="Commit URL (optional)"
              value={form.commitUrl}
              onChange={(e) => setForm((f) => ({ ...f, commitUrl: e.target.value }))}
            />
            <Textarea
              placeholder="Release notes"
              value={form.releaseNotes}
              onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
              rows={3}
            />
            <Input
              placeholder="Preview / deploy URL (optional)"
              value={form.previewUrl}
              onChange={(e) => setForm((f) => ({ ...f, previewUrl: e.target.value }))}
            />
            <Input
              placeholder="Artifact URL (APK, IPA, ZIP...)"
              value={form.artifactUrl}
              onChange={(e) => setForm((f) => ({ ...f, artifactUrl: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !form.version}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create build"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
