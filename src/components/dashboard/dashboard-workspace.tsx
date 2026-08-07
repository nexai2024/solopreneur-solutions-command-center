"use client";

import Link from "next/link";
import {
  Lightbulb,
  Users,
  Kanban,
  DollarSign,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { CollapsibleWidget } from "@/components/dashboard/collapsible-widget";
import { MilestoneOverview } from "@/components/dashboard/milestone-overview";
import { ProjectTimelineFeed } from "@/components/dashboard/project-timeline-feed";
import type { ProjectTimeline } from "@/lib/actions/dashboard";
import { cn } from "@/lib/utils";

type DashboardStats = Awaited<
  ReturnType<typeof import("@/lib/actions/dashboard").getDashboardStats>
>;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatLinkCard({
  href,
  title,
  value,
  hint,
  icon: Icon,
}: {
  href: string;
  title: string;
  value: string | number;
  hint: string;
  icon: typeof Lightbulb;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        "p-4 block transition-colors hover:bg-accent/40 hover:border-primary/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        {hint}
        <ArrowUpRight className="h-3 w-3 opacity-60" />
      </p>
    </Link>
  );
}

export function DashboardWorkspace({
  stats,
  timelines,
}: {
  stats: DashboardStats;
  timelines: ProjectTimeline[];
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">
          Operational summary across your products and pipeline. Click any metric
          or row to jump into the work.
        </p>
      </div>

      <CollapsibleWidget
        id="at-a-glance"
        title="At a glance"
        collapsedSummary={`${stats.scoredIdeas} ideas · ${stats.activeTasks} tasks · ${stats.pipelineLeads} leads · ${formatCurrency(stats.monthlyRevenue)} MRR`}
        contentClassName="space-y-0"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatLinkCard
            href="/dashboard/brainstorm"
            title="Scored Ideas"
            value={stats.scoredIdeas}
            hint={`${stats.projectCount} active project${stats.projectCount !== 1 ? "s" : ""}`}
            icon={Lightbulb}
          />
          <StatLinkCard
            href="/dashboard/build-tracker?tab=tasks"
            title="Active Tasks"
            value={stats.activeTasks}
            hint="Open Build Tracker"
            icon={Kanban}
          />
          <StatLinkCard
            href="/dashboard/build-tracker?tab=tasks"
            title="Milestones"
            value={`${stats.milestones.completed}/${stats.milestones.total}`}
            hint={`${stats.milestones.percent}% complete`}
            icon={Target}
          />
          <StatLinkCard
            href="/dashboard/lead-finder"
            title="Pipeline Leads"
            value={stats.pipelineLeads}
            hint="Excluding lost leads"
            icon={Users}
          />
          <StatLinkCard
            href="/dashboard/revenue"
            title="Monthly Revenue"
            value={formatCurrency(stats.monthlyRevenue)}
            hint="This calendar month"
            icon={DollarSign}
          />
        </div>
      </CollapsibleWidget>

      <ProjectTimelineFeed
        timelines={timelines}
        monthlyRevenue={stats.monthlyRevenue}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <MilestoneOverview
          total={stats.milestones.total}
          completed={stats.milestones.completed}
          percent={stats.milestones.percent}
          projectProgress={stats.milestones.projectProgress}
          upcoming={stats.milestones.upcoming}
        />

        <CollapsibleWidget
          id="recent-ideas"
          title="Recent Ideas"
          actions={
            <Link
              href="/dashboard/brainstorm"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          }
          collapsedSummary={
            stats.recentIdeas.length === 0
              ? "No ideas yet"
              : `${stats.recentIdeas.length} recent · top: ${stats.recentIdeas[0]?.title ?? ""}`
          }
        >
          {stats.recentIdeas.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No ideas yet.{" "}
                <Link
                  href="/dashboard/brainstorm"
                  className="text-primary hover:underline"
                >
                  Add your first idea
                </Link>{" "}
                to run AI scoring.
              </p>
              <HowDoILink section="command-center" />
            </div>
          ) : (
            <ul className="space-y-2">
              {stats.recentIdeas.map((idea) => (
                <li key={idea.id}>
                  <Link
                    href="/dashboard/brainstorm"
                    className="flex items-center justify-between gap-4 text-sm rounded-md px-2 py-2 -mx-2 hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-medium truncate">{idea.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {idea.aiScore != null && (
                        <span className="text-muted-foreground">
                          {idea.aiScore.toFixed(1)}
                        </span>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {idea.status}
                      </Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleWidget>
      </div>
    </div>
  );
}
