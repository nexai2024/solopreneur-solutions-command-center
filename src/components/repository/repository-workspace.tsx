"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, GitBranch, Link2, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { linkProjectRepository } from "@/lib/actions/projects";
import { RepoMonitoringPanel } from "@/components/repository/repo-monitoring-panel";
import type { RepoMonitoringSnapshot } from "@/lib/actions/repo-monitoring";
import { HowDoILink } from "@/components/help/how-do-i-link";

type RepoProject = {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  githubConnection: {
    repoUrl: string;
    provider: string;
    repoFullName: string | null;
  } | null;
  stats: {
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
  } | null;
  monitoring: RepoMonitoringSnapshot | null;
};

export function RepositoryWorkspace({
  projects,
  initialProjectId,
}: {
  projects: RepoProject[];
  initialProjectId?: string;
}) {
  const router = useRouter();
  const resolvedInitial =
    (initialProjectId &&
      projects.some((p) => p.id === initialProjectId) &&
      initialProjectId) ||
    projects[0]?.id ||
    "";
  const [selectedId, setSelectedId] = useState(resolvedInitial);
  const initialProject = projects.find((p) => p.id === resolvedInitial);
  const [repoInput, setRepoInput] = useState(
    initialProject?.repoUrl ?? initialProject?.githubConnection?.repoUrl ?? ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialProjectId && projects.some((p) => p.id === initialProjectId)) {
      setSelectedId(initialProjectId);
      const project = projects.find((p) => p.id === initialProjectId);
      setRepoInput(
        project?.repoUrl ?? project?.githubConnection?.repoUrl ?? ""
      );
    }
  }, [initialProjectId, projects]);

  const selectProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setSelectedId(projectId);
    setRepoInput(project?.repoUrl ?? project?.githubConnection?.repoUrl ?? "");
    router.replace(`/dashboard/repository?projectId=${projectId}`, {
      scroll: false,
    });
  };

  const selected = projects.find((p) => p.id === selectedId);

  const handleLink = () => {
    if (!selected || !repoInput.trim()) return;
    startTransition(async () => {
      try {
        await linkProjectRepository(
          selected.id,
          repoInput,
          tokenInput || undefined
        );
        toast.success("Repository linked");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to link repo");
      }
    });
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No projects yet. Promote an idea to link a repository.
        </p>
        <HowDoILink section="repository" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={p.id === selectedId ? "default" : "outline"}
            onClick={() => selectProject(p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {selected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                Link repository
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="https://github.com/user/repo"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
              />
              <Input
                type="password"
                placeholder="GitHub token (optional — uses GITHUB_TOKEN env if omitted)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <Button onClick={handleLink} disabled={isPending || !repoInput.trim()}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save connection
              </Button>
            </CardContent>
          </Card>

          {selected.stats ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5" />
                      {selected.stats.full_name}
                    </CardTitle>
                    {selected.stats.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selected.stats.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={selected.stats.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" /> {selected.stats.stargazers_count} stars
                  </span>
                  <span>{selected.stats.forks_count} forks</span>
                  <span>{selected.stats.open_issues_count} open issues</span>
                  {selected.stats.language && (
                    <Badge variant="secondary">{selected.stats.language}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : selected.repoUrl ? (
            <p className="text-sm text-muted-foreground">
              Repository linked. Set GITHUB_TOKEN in .env for live stats, or provide a token above.
            </p>
          ) : null}

          {selected.monitoring && selected.githubConnection?.provider === "github" && (
            <RepoMonitoringPanel
              projectId={selected.id}
              monitoring={selected.monitoring}
            />
          )}
        </>
      )}
    </div>
  );
}
