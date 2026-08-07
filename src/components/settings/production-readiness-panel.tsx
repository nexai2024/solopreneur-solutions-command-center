"use client";

import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  RefreshCw,
  Loader2,
  Webhook,
  Database,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProductionReadinessDTO } from "@/lib/actions/production-readiness";

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

function overallBadge(status: ProductionReadinessDTO["health"]["status"]) {
  if (status === "healthy") {
    return <Badge className="bg-emerald-600/90">Production ready</Badge>;
  }
  if (status === "degraded") {
    return <Badge variant="secondary" className="text-amber-600 border-amber-500/30">Degraded</Badge>;
  }
  return <Badge variant="destructive">Unhealthy</Badge>;
}

const CHECK_LABELS: Record<string, string> = {
  database: "Database",
  clerk: "Clerk auth",
  clerkWebhook: "Clerk webhook",
  stripe: "Stripe",
  stripeWebhook: "Stripe webhook",
  encryption: "Encryption key",
  openai: "OpenAI",
  githubWebhook: "GitHub webhook",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(Math.abs(diff) / 60_000);
  if (mins < 1) return diff >= 0 ? "just now" : "soon";
  if (mins < 60) return diff >= 0 ? `${mins}m ago` : `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  return diff >= 0 ? `${hours}h ago` : `in ${hours}h`;
}

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function ProductionReadinessPanel({
  data,
  onRefresh,
  isRefreshing,
}: {
  data: ProductionReadinessDTO;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const { health, migration, webhooks, plan } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Production readiness
        </CardTitle>
        <div className="flex items-center gap-2">
          {overallBadge(health.status)}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh readiness status"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health checks */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Database className="h-3.5 w-3.5" />
            System health
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {Object.entries(health.checks).map(([key, status]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{CHECK_LABELS[key] ?? key}</span>
                <div className="flex items-center gap-1.5 capitalize text-xs">
                  <StatusIcon status={status} />
                  {status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Migration */}
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Database migration</h3>
          {migration.name ? (
            <p className="text-sm">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{migration.name}</code>
              {migration.appliedAt && (
                <span className="text-muted-foreground text-xs ml-2">
                  applied {formatRelativeTime(migration.appliedAt)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No migration history — run <code className="text-xs">npm run db:migrate:deploy</code> in
              production.
            </p>
          )}
        </div>

        {/* Webhooks */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Webhook className="h-3.5 w-3.5" />
            Last webhooks received
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Stripe</p>
              {webhooks.stripe ? (
                <>
                  <p className="font-medium">{webhooks.stripe.eventType}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(webhooks.stripe.receivedAt)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">None yet</p>
              )}
            </div>
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground mb-1">GitHub (your projects)</p>
              {webhooks.github ? (
                <>
                  <p className="font-medium">{webhooks.github.eventType}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(webhooks.github.receivedAt)} · {webhooks.github.status}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">None yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Plan usage */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Plan usage
            <Badge variant="outline" className="capitalize ml-1">
              {plan.tier}
            </Badge>
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>AI calls this hour</span>
              <span className="text-muted-foreground">
                {plan.ai.remaining} remaining · {plan.ai.used}/{plan.ai.limit} used
              </span>
            </div>
            <Progress value={usagePercent(plan.ai.used, plan.ai.limit)} className="h-2" />
            {plan.ai.resetsAt && (
              <p className="text-xs text-muted-foreground">
                Resets {formatRelativeTime(plan.ai.resetsAt)}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Leads</span>
                <span className="text-muted-foreground">
                  {plan.leads.used}/{plan.leads.limit}
                </span>
              </div>
              <Progress value={usagePercent(plan.leads.used, plan.leads.limit)} className="h-1.5" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Projects</span>
                <span className="text-muted-foreground">
                  {plan.projects.used}/{plan.projects.limit}
                </span>
              </div>
              <Progress
                value={usagePercent(plan.projects.used, plan.projects.limit)}
                className="h-1.5"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Checked {formatRelativeTime(health.timestamp)}. AI usage is tracked per server instance in
          dev; use Redis for accurate limits in multi-instance production.
        </p>
      </CardContent>
    </Card>
  );
}
