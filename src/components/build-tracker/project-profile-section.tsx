"use client";

import { useState, useTransition, type ComponentType } from "react";
import { toast } from "sonner";
import {
  Cloud,
  ExternalLink,
  Globe,
  Key,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectProfileDTO } from "@/lib/actions/project-profile";
import {
  updateProjectProfile,
  upsertProjectEnvVar,
  deleteProjectEnvVar,
} from "@/lib/actions/project-profile";
import {
  linkVercelProject,
  listAvailableVercelProjects,
  syncVercelProjectData,
  unlinkVercelProject,
} from "@/lib/actions/vercel";

const HOSTING_PROVIDERS = [
  { value: "vercel", label: "Vercel" },
  { value: "netlify", label: "Netlify" },
  { value: "railway", label: "Railway" },
  { value: "aws", label: "AWS" },
  { value: "self", label: "Self-hosted" },
  { value: "other", label: "Other" },
];

function TagEditor({
  label,
  icon: Icon,
  tags,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const value = input.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              className="hover:text-destructive"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={disabled}>
          Add
        </Button>
      </div>
    </div>
  );
}

function deploymentStatusBadge(status: string) {
  if (status === "ready") return <Badge className="bg-emerald-600/90">Ready</Badge>;
  if (status === "building") return <Badge variant="secondary">Building</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function ProjectProfileSection({
  projectId,
  projectName,
  profile: initialProfile,
}: {
  projectId: string;
  projectName: string;
  profile: ProjectProfileDTO;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [currentVersion, setCurrentVersion] = useState(profile.currentVersion ?? "");
  const [productionUrl, setProductionUrl] = useState(profile.productionUrl ?? "");
  const [hostingProvider, setHostingProvider] = useState(profile.hostingProvider ?? "");
  const [techStack, setTechStack] = useState(profile.techStack);
  const [toolsUsed, setToolsUsed] = useState(profile.toolsUsed);
  const [devNotes, setDevNotes] = useState(profile.devNotes ?? "");
  const [aiNotes, setAiNotes] = useState(profile.aiNotes ?? "");

  const [vercelToken, setVercelToken] = useState("");
  const [vercelTeamId, setVercelTeamId] = useState("");
  const [vercelProjects, setVercelProjects] = useState<
    Array<{ id: string; name: string; framework: string | null; repo: string | null }>
  >([]);
  const [selectedVercelProject, setSelectedVercelProject] = useState("");

  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [envEnvironment, setEnvEnvironment] = useState("production");
  const [envSecret, setEnvSecret] = useState(true);

  const [isPending, startTransition] = useTransition();

  const saveProfile = () => {
    startTransition(async () => {
      try {
        await updateProjectProfile(projectId, {
          currentVersion,
          productionUrl,
          hostingProvider,
          techStack,
          toolsUsed,
          devNotes,
          aiNotes,
        });
        setProfile((p) => ({
          ...p,
          currentVersion: currentVersion || null,
          productionUrl: productionUrl || null,
          hostingProvider: hostingProvider || null,
          techStack,
          toolsUsed,
          devNotes: devNotes || null,
          aiNotes: aiNotes || null,
        }));
        toast.success("Project profile saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save profile");
      }
    });
  };

  const loadVercelProjects = () => {
    if (!vercelToken.trim()) {
      toast.error("Enter a Vercel access token first");
      return;
    }
    startTransition(async () => {
      try {
        const projects = await listAvailableVercelProjects(
          vercelToken,
          vercelTeamId || undefined
        );
        setVercelProjects(projects);
        if (projects.length === 0) toast.info("No Vercel projects found for this token");
        else toast.success(`Found ${projects.length} Vercel project(s)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load Vercel projects");
      }
    });
  };

  const handleLinkVercel = () => {
    if (!selectedVercelProject) {
      toast.error("Select a Vercel project");
      return;
    }
    startTransition(async () => {
      try {
        await linkVercelProject(projectId, {
          accessToken: vercelToken,
          vercelProjectId: selectedVercelProject,
          vercelTeamId: vercelTeamId || undefined,
        });
        toast.success("Vercel linked and synced");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to link Vercel");
      }
    });
  };

  const handleSyncVercel = () => {
    startTransition(async () => {
      try {
        const result = await syncVercelProjectData(projectId);
        toast.success(
          `Synced ${result.deploymentsSynced} deployments, ${result.envVarsSynced} env vars`
        );
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sync failed");
      }
    });
  };

  const handleUnlinkVercel = () => {
    startTransition(async () => {
      try {
        await unlinkVercelProject(projectId);
        toast.success("Vercel disconnected");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to unlink");
      }
    });
  };

  const handleAddEnvVar = () => {
    if (!envKey.trim()) return;
    startTransition(async () => {
      try {
        await upsertProjectEnvVar(projectId, {
          key: envKey,
          value: envValue,
          environment: envEnvironment,
          isSecret: envSecret,
        });
        toast.success("Env var saved");
        setEnvKey("");
        setEnvValue("");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save env var");
      }
    });
  };

  const handleDeleteEnvVar = (id: string) => {
    startTransition(async () => {
      try {
        await deleteProjectEnvVar(projectId, id);
        toast.success("Env var deleted");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Current version</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. 1.2.0"
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              disabled={isPending}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              Production URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://myapp.vercel.app"
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              disabled={isPending}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Cloud className="h-3.5 w-3.5" />
              Hosting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={hostingProvider || "none"} onValueChange={(v) => setHostingProvider(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {HOSTING_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Vercel connection — {projectName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.vercelConnection ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{profile.vercelConnection.vercelProjectName}</Badge>
                {profile.vercelConnection.framework && (
                  <Badge variant="outline">{profile.vercelConnection.framework}</Badge>
                )}
                {profile.vercelConnection.productionDomain && (
                  <a
                    href={`https://${profile.vercelConnection.productionDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-xs"
                  >
                    {profile.vercelConnection.productionDomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.vercelConnection.lastSyncedAt && (
                  <span className="text-xs text-muted-foreground">
                    Last synced {new Date(profile.vercelConnection.lastSyncedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleSyncVercel} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Sync deployments & env
                </Button>
                <Button size="sm" variant="outline" onClick={handleUnlinkVercel} disabled={isPending}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Link a Vercel project to auto-import deployments, production URL, framework, and
                environment variables. Create a token at vercel.com/account/tokens.
              </p>
              <Input
                type="password"
                placeholder="Vercel access token"
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
              />
              <Input
                placeholder="Team ID (optional, for team projects)"
                value={vercelTeamId}
                onChange={(e) => setVercelTeamId(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={loadVercelProjects} disabled={isPending}>
                  Load projects
                </Button>
                {vercelProjects.length > 0 && (
                  <>
                    <Select value={selectedVercelProject} onValueChange={setSelectedVercelProject}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {vercelProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.framework ? ` (${p.framework})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleLinkVercel} disabled={isPending}>
                      Link & sync
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {profile.deployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Deployed</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.deployments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.environment}</TableCell>
                    <TableCell>{deploymentStatusBadge(d.status)}</TableCell>
                    <TableCell className="text-xs">{d.branch ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {d.commitSha?.slice(0, 7) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.deployedAt ? new Date(d.deployedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4" />
            Environment variables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.envVars.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.envVars.map((env) => (
                  <TableRow key={env.id}>
                    <TableCell className="font-mono text-xs">{env.key}</TableCell>
                    <TableCell>{env.environment}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {env.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {env.isSecret ? "••••••••" : (env.displayValue ?? "—")}
                    </TableCell>
                    <TableCell>
                      {env.source === "manual" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive h-7"
                          onClick={() => handleDeleteEnvVar(env.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No env vars tracked yet.</p>
          )}

          <div className="grid gap-2 sm:grid-cols-4 border-t pt-4">
            <Input
              placeholder="KEY"
              value={envKey}
              onChange={(e) => setEnvKey(e.target.value)}
              disabled={isPending}
            />
            <Input
              placeholder="Value"
              type={envSecret ? "password" : "text"}
              value={envValue}
              onChange={(e) => setEnvValue(e.target.value)}
              disabled={isPending}
            />
            <Select value={envEnvironment} onValueChange={setEnvEnvironment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddEnvVar} disabled={isPending || !envKey.trim()} size="sm">
              Add variable
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TagEditor
          label="Tech stack"
          icon={Layers}
          tags={techStack}
          onChange={setTechStack}
          placeholder="Next.js, PostgreSQL, Tailwind..."
          disabled={isPending}
        />
        <TagEditor
          label="Tools used"
          icon={Wrench}
          tags={toolsUsed}
          onChange={setToolsUsed}
          placeholder="Vercel, Clerk, Prisma..."
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Dev notes</label>
          <Textarea
            placeholder="Architecture decisions, setup steps, known quirks..."
            value={devNotes}
            onChange={(e) => setDevNotes(e.target.value)}
            rows={8}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI notes
          </label>
          <Textarea
            placeholder="AI-generated insights, task summaries, recommendations..."
            value={aiNotes}
            onChange={(e) => setAiNotes(e.target.value)}
            rows={8}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save project profile
        </Button>
      </div>
    </div>
  );
}
