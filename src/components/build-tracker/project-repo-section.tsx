"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GitBranch, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { linkProjectRepository } from "@/lib/actions/projects";
import { RepoMonitoringPanel } from "@/components/repository/repo-monitoring-panel";
import type { RepoMonitoringSnapshot } from "@/lib/actions/repo-monitoring";

export function ProjectRepoSection({
  projectId,
  projectName,
  repoUrl,
  githubConnection,
  monitoring,
}: {
  projectId: string;
  projectName: string;
  repoUrl: string | null;
  githubConnection: {
    repoUrl: string;
    provider: string;
    repoFullName: string | null;
  } | null;
  monitoring: RepoMonitoringSnapshot | null;
}) {
  const [repoInput, setRepoInput] = useState(
    repoUrl ?? githubConnection?.repoUrl ?? ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleLink = () => {
    if (!repoInput.trim()) return;
    startTransition(async () => {
      try {
        await linkProjectRepository(projectId, repoInput, tokenInput || undefined);
        toast.success("Repository linked");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to link repo");
      }
    });
  };

  const linked = !!(repoUrl ?? githubConnection);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            GitHub repository — {projectName}
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
            placeholder="GitHub token (optional)"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <Button onClick={handleLink} disabled={isPending || !repoInput.trim()} size="sm">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {linked ? "Update connection" : "Link repository"}
          </Button>
          {linked && githubConnection?.repoFullName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {githubConnection.repoFullName}
            </p>
          )}
        </CardContent>
      </Card>

      {monitoring && githubConnection?.provider === "github" && (
        <RepoMonitoringPanel projectId={projectId} monitoring={monitoring} />
      )}

      {!linked && (
        <p className="text-sm text-muted-foreground">
          Link a GitHub repo to auto-track commits, PRs, builds, and releases for this
          project. Webhook events sync into the Build Library pipeline above.
        </p>
      )}
    </div>
  );
}
