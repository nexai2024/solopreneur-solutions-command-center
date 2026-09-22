"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProjectArtifact,
  deleteProjectArtifact,
  generateAndSaveProjectArtifacts,
  updateProjectArtifact,
  type ProjectArtifactDTO,
} from "@/lib/actions/project-artifacts";
import {
  ARTIFACT_CATEGORIES,
  ARTIFACT_KIND_META,
  ARTIFACT_KINDS,
  artifactClipboardValue,
  artifactPreviewText,
  defaultFormatForKind,
  type ArtifactCategory,
  type ArtifactKind,
} from "@/lib/project-artifacts";

function kindIcon(kind: ArtifactKind) {
  const cat = ARTIFACT_KIND_META[kind].category;
  if (cat === "brand" || kind === "image" || kind === "logo") return ImageIcon;
  if (kind === "video" || kind === "slideshow") return Video;
  if (kind === "link" || kind === "google_doc" || kind === "form") return Link2;
  return FileText;
}

function formatBytes(n: number | null): string | null {
  if (n == null || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectArtifactsPanel({
  projectId,
  initialArtifacts,
}: {
  projectId: string;
  initialArtifacts: ProjectArtifactDTO[];
}) {
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [category, setCategory] = useState<ArtifactCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<ProjectArtifactDTO | null>(null);
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artifacts.filter((a) => {
      const meta = ARTIFACT_KIND_META[a.kind];
      if (category !== "all" && meta.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.kind.includes(q) ||
        (a.body?.toLowerCase().includes(q) ?? false) ||
        (a.url?.toLowerCase().includes(q) ?? false) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [artifacts, category, query]);

  const copyArtifact = async (artifact: ProjectArtifactDTO) => {
    const value = artifactClipboardValue(artifact);
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied — paste anywhere");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleDelete = (artifact: ProjectArtifactDTO) => {
    startTransition(async () => {
      try {
        await deleteProjectArtifact(artifact.id);
        setArtifacts((prev) => prev.filter((a) => a.id !== artifact.id));
        if (viewing?.id === artifact.id) setViewing(null);
        toast.success("Artifact deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  };

  const handleGenerateAi = () => {
    setGenerating(true);
    startTransition(async () => {
      try {
        const result = await generateAndSaveProjectArtifacts(projectId);
        setArtifacts((prev) => {
          const byId = new Map(prev.map((a) => [a.id, a]));
          for (const a of result.artifacts) byId.set(a.id, a);
          return [...byId.values()].sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
        toast.success(
          `Saved messaging pack · ${result.createdCount} new, ${result.updatedCount} updated`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "AI generate failed");
      } finally {
        setGenerating(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Project artifacts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Save descriptions, logos, features, docs, and links so messaging stays
            consistent — copy anytime for landing pages, ads, or outreach.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={generating || pending}
            onClick={handleGenerateAi}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate with AI
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add artifact
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ARTIFACT_CATEGORIES.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={category === c.id ? "default" : "outline"}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </Button>
        ))}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artifacts…"
          className="h-8 w-full sm:w-56 sm:ml-auto"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {artifacts.length === 0
            ? "No artifacts yet. Click Generate with AI to save short description, value prop, and features — or paste/upload manually."
            : "No artifacts match this filter."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((artifact) => {
            const Icon = kindIcon(artifact.kind);
            const meta = ARTIFACT_KIND_META[artifact.kind];
            return (
              <div
                key={artifact.id}
                className="group rounded-xl border bg-card p-3 flex flex-col gap-2 hover:border-primary/40 transition-colors"
              >
                <button
                  type="button"
                  className="text-left space-y-2 flex-1"
                  onClick={() => setViewing(artifact)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-md border bg-muted/40 p-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{artifact.title}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {artifact.format}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {(artifact.format === "image" || artifact.kind === "logo") &&
                  artifact.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artifact.url}
                      alt={artifact.title}
                      className="h-24 w-full object-contain rounded-md border bg-muted/20"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {artifactPreviewText(artifact)}
                    </p>
                  )}
                </button>
                <div className="flex items-center gap-1 pt-1 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => copyArtifact(artifact)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                  {artifact.url && (
                    <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                      <a href={artifact.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Open
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 ml-auto text-destructive"
                    disabled={pending}
                    onClick={() => handleDelete(artifact)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddArtifactDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(artifact) => {
          setArtifacts((prev) => [artifact, ...prev]);
          setAddOpen(false);
          setViewing(artifact);
        }}
      />

      <ArtifactViewer
        artifact={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onCopy={() => viewing && copyArtifact(viewing)}
        onSaved={(updated) => {
          setArtifacts((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a))
          );
          setViewing(updated);
        }}
        onDelete={() => viewing && handleDelete(viewing)}
        pending={pending}
      />
    </div>
  );
}

function AddArtifactDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (artifact: ProjectArtifactDTO) => void;
}) {
  const [kind, setKind] = useState<ArtifactKind>("short_description");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"text" | "url" | "file">("text");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setKind("short_description");
    setTitle("");
    setBody("");
    setUrl("");
    setMode("text");
  };

  const submitTextOrUrl = async () => {
    setSaving(true);
    try {
      const format =
        mode === "url" ? "url" : defaultFormatForKind(kind);
      const artifact = await createProjectArtifact({
        projectId,
        title: title.trim() || ARTIFACT_KIND_META[kind].label,
        kind,
        format,
        body: mode === "text" ? body : null,
        url: mode === "url" ? url : url.trim() || null,
      });
      toast.success("Artifact saved");
      reset();
      onCreated(artifact);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submitFile = async (file: File) => {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("title", title.trim() || file.name);
      const res = await fetch(`/api/projects/${projectId}/artifacts/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      toast.success("File uploaded");
      reset();
      onCreated(data as ProjectArtifactDTO);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add project artifact</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Type</label>
            <Select
              value={kind}
              onValueChange={(v) => {
                const next = v as ArtifactKind;
                setKind(next);
                const fmt = defaultFormatForKind(next);
                if (fmt === "url" || fmt === "image" || fmt === "video" || fmt === "file") {
                  setMode(fmt === "file" || fmt === "image" || fmt === "video" ? "file" : "url");
                } else {
                  setMode("text");
                }
                if (!title.trim()) setTitle(ARTIFACT_KIND_META[next].label);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARTIFACT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ARTIFACT_KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Homepage hero · App Store short desc"
            />
          </div>

          <div className="flex gap-1 rounded-lg border p-1">
            {(
              [
                ["text", "Paste text"],
                ["url", "Link / URL"],
                ["file", "Upload file"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={mode === id ? "secondary" : "ghost"}
                className="flex-1 h-8"
                onClick={() => setMode(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          {mode === "text" && (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste AI-generated copy, feature bullets, markdown…"
              rows={8}
              className="font-mono text-sm"
            />
          )}

          {mode === "url" && (
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/… or image / video URL"
            />
          )}

          {mode === "file" && (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
              <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Images, PDFs, docs up to 8 MB (needs Vercel Blob token). Or switch to
                Link / URL.
              </p>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.md,.txt,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void submitFile(file);
                }}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode !== "file" && (
            <Button
              disabled={saving || (!body.trim() && !url.trim() && mode === "text") || (mode === "url" && !url.trim())}
              onClick={() => void submitTextOrUrl()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArtifactViewer({
  artifact,
  onOpenChange,
  onCopy,
  onSaved,
  onDelete,
  pending,
}: {
  artifact: ProjectArtifactDTO | null;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onSaved: (artifact: ProjectArtifactDTO) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const open = !!artifact;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setEditing(false);
          setTitle("");
          setBody("");
          setUrl("");
        }
        onOpenChange(next);
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {artifact && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{artifact.title}</SheetTitle>
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge variant="secondary">
                  {ARTIFACT_KIND_META[artifact.kind].label}
                </Badge>
                <Badge variant="outline">{artifact.format}</Badge>
                {formatBytes(artifact.size_bytes) && (
                  <Badge variant="outline">{formatBytes(artifact.size_bytes)}</Badge>
                )}
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={onCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                {artifact.url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={artifact.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open link
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(true);
                    setTitle(artifact.title);
                    setBody(artifact.body ?? "");
                    setUrl(artifact.url ?? "");
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive ml-auto"
                  disabled={pending}
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="URL (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const updated = await updateProjectArtifact(artifact.id, {
                            title,
                            body,
                            url,
                          });
                          toast.success("Saved");
                          setEditing(false);
                          onSaved(updated);
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Save failed"
                          );
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {(artifact.format === "image" || artifact.kind === "logo") &&
                    artifact.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artifact.url}
                        alt={artifact.title}
                        className="w-full max-h-64 object-contain rounded-lg border bg-muted/20"
                      />
                    )}
                  {artifact.body ? (
                    <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 text-sm font-mono">
                      {artifact.body}
                    </pre>
                  ) : artifact.url ? (
                    <a
                      href={artifact.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary break-all hover:underline"
                    >
                      {artifact.url}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No content</p>
                  )}
                  {artifact.file_name && (
                    <p className="text-xs text-muted-foreground">
                      File: {artifact.file_name}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
