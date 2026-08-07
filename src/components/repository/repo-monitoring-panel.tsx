"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Tag,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RepoMonitoringSnapshot } from "@/lib/actions/repo-monitoring";
import {
  syncProjectPullRequests,
  retryFailedWebhookDelivery,
} from "@/lib/actions/repo-monitoring";

function statusIcon(status: string) {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-rose-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const variant =
    status === "passed"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

function envBadge(env: string) {
  const colors: Record<string, string> = {
    Dev: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Staging: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    UAT: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    Production: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors[env] ?? "bg-secondary text-muted-foreground"}`}
    >
      {env}
    </span>
  );
}

export function RepoMonitoringPanel({
  projectId,
  monitoring,
}: {
  projectId: string;
  monitoring: RepoMonitoringSnapshot;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(monitoring.webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncPrs = () => {
    startTransition(async () => {
      try {
        const result = await syncProjectPullRequests(projectId);
        toast.success(`Synced ${result.synced} pull requests`);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sync failed");
      }
    });
  };

  const handleRetry = (deliveryId: string) => {
    startTransition(async () => {
      try {
        await retryFailedWebhookDelivery(projectId, deliveryId);
        toast.success("Webhook reprocessed");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Retry failed");
      }
    });
  };

  const health = monitoring.branchHealth;

  return (
    <div className="space-y-6">
      {/* Branch health + webhook setup */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branch health (main)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="flex items-center gap-3">
                {statusIcon(health.status)}
                <div>
                  <p className="text-sm font-medium capitalize">{health.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {health.environment} ·{" "}
                    <code className="text-[10px]">{health.commitSha?.slice(0, 7)}</code>
                  </p>
                  {health.buildBreakerName && health.status === "failed" && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Broken by {health.buildBreakerName}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No builds yet. Configure the webhook below and push to main.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Webhook endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <code className="text-[11px] bg-muted px-2 py-1 rounded flex-1 truncate">
                {monitoring.webhookUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyWebhook}>
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : ""}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Subscribe to: push, pull_request, create, workflow_run. Set{" "}
              <code className="text-[10px]">GITHUB_WEBHOOK_SECRET</code> in .env.
            </p>
            {(monitoring.webhookStats.failed > 0 ||
              monitoring.webhookStats.pending > 0) && (
              <p className="text-xs text-amber-600">
                {monitoring.webhookStats.pending} pending ·{" "}
                {monitoring.webhookStats.failed} failed
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Environment routing legend */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-2">Branch → environment routing</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span>
              <code>main</code> → {envBadge("Staging")}
            </span>
            <span>
              <code>release/*</code> → {envBadge("UAT")}
            </span>
            <span>
              feature branches → {envBadge("Dev")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pull requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitPullRequest className="h-4 w-4" />
            Open pull requests
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleSyncPrs} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sync from GitHub
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {monitoring.pullRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open PRs tracked yet.</p>
          ) : (
            monitoring.pullRequests.map((pr) => (
              <div
                key={pr.id}
                className="border rounded-lg p-3 space-y-2 bg-card/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={pr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline flex items-center gap-1"
                    >
                      #{pr.number} {pr.title}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pr.headBranch} → {pr.baseBranch} · @{pr.authorLogin}
                    </p>
                  </div>
                  {statusBadge(pr.buildStatus)}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <Badge variant="outline">{pr.approvalsCount} approvals</Badge>
                  {pr.changesRequested > 0 && (
                    <Badge variant="destructive">
                      {pr.changesRequested} changes requested
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {pr.commentsCount + pr.reviewCommentsCount} comments
                  </Badge>
                  {pr.mergeReady && (
                    <Badge className="bg-emerald-600">Merge ready</Badge>
                  )}
                </div>
                {pr.previewUrl && (
                  <a
                    href={pr.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--os-cyan))] hover:underline inline-flex items-center gap-1"
                  >
                    Preview build <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Builds + releases */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent builds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {monitoring.recentBuilds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No builds recorded.</p>
            ) : (
              monitoring.recentBuilds.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-2 text-xs border-b border-border/50 pb-2 last:border-0"
                >
                  {statusIcon(b.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {envBadge(b.environment)}
                      <code>{b.shortSha}</code>
                      <span className="text-muted-foreground">{b.branch}</span>
                    </div>
                    {b.buildBreakerName && (
                      <p className="text-rose-500 mt-0.5">⚠ {b.buildBreakerName}</p>
                    )}
                    {b.changelog && (
                      <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                        {b.changelog}
                      </pre>
                    )}
                  </div>
                  {b.htmlUrl && (
                    <a href={b.htmlUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Releases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {monitoring.releases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Push a tag like <code>v1.2.0</code> to auto-create a release entry.
              </p>
            ) : (
              monitoring.releases.map((r) => (
                <div key={r.id} className="border-b border-border/50 pb-2 last:border-0">
                  <a
                    href={r.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    {r.tag}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {r.changelog && (
                    <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                      {r.changelog}
                    </pre>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            Commit traceability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {monitoring.recentCommits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commits tracked yet.</p>
          ) : (
            monitoring.recentCommits.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2 text-xs border-b border-border/50 pb-2 last:border-0"
              >
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[hsl(var(--os-cyan))] hover:underline shrink-0"
                >
                  {c.shortSha}
                </a>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{c.message.split("\n")[0]}</p>
                  <p className="text-muted-foreground">
                    {c.authorName} · {c.branch}{" "}
                    {c.environment ? envBadge(c.environment) : null}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Failed webhooks retry */}
      {monitoring.webhookStats.recentFailed.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">
              Failed webhook deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monitoring.webhookStats.recentFailed.map((d) => (
              <div
                key={d.deliveryId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-medium">{d.eventType}</span>
                  <span className="text-muted-foreground ml-2">{d.errorMessage}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRetry(d.deliveryId)}
                  disabled={isPending}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
