"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  GitBranch,
  Lightbulb,
  Megaphone,
  Rocket,
  Target,
  CheckSquare,
  Users,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ProjectTimeline, ProjectTimelineEvent } from "@/lib/actions/dashboard";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { CollapsibleWidget } from "@/components/dashboard/collapsible-widget";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const EVENT_ICONS: Record<
  ProjectTimelineEvent["type"],
  { icon: typeof Lightbulb; className: string }
> = {
  idea: { icon: Lightbulb, className: "text-amber-500 bg-amber-500/10" },
  promote: { icon: Rocket, className: "text-emerald-500 bg-emerald-500/10" },
  milestone: { icon: Target, className: "text-blue-500 bg-blue-500/10" },
  lead: { icon: Users, className: "text-purple-500 bg-purple-500/10" },
  task: { icon: CheckSquare, className: "text-cyan-500 bg-cyan-500/10" },
  repo: { icon: GitBranch, className: "text-orange-500 bg-orange-500/10" },
  campaign: { icon: Megaphone, className: "text-pink-500 bg-pink-500/10" },
};

function TimelineEventRow({ event }: { event: ProjectTimelineEvent }) {
  const config = EVENT_ICONS[event.type];
  const Icon = config.icon;
  const date = new Date(event.timestamp);
  const isFuture = date.getTime() > Date.now();

  const body = (
    <>
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.className}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium leading-snug flex items-start gap-1">
          <span className="flex-1">{event.title}</span>
          {event.href ? (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : null}
        </p>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {event.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {isFuture
            ? `Due ${format(date, "MMM d, yyyy")}`
            : formatDistanceToNow(date, { addSuffix: true })}
        </p>
      </div>
    </>
  );

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border last:hidden" />
      {event.href ? (
        <Link
          href={event.href}
          className="group relative z-10 flex gap-3 min-w-0 flex-1 rounded-md -mx-1 px-1 py-0.5 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </Link>
      ) : (
        <div className="relative z-10 flex gap-3 min-w-0 flex-1">{body}</div>
      )}
    </li>
  );
}

function ProjectTimelineCard({ timeline }: { timeline: ProjectTimeline }) {
  const storageKey = `soloos:dashboard-journey:${timeline.projectId}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "0") setOpen(false);
      if (stored === "1") setOpen(true);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const milestonePercent =
    timeline.stats.milestonesTotal > 0
      ? Math.round(
          (timeline.stats.milestonesDone / timeline.stats.milestonesTotal) * 100
        )
      : 0;
  const taskPercent =
    timeline.stats.tasksTotal > 0
      ? Math.round((timeline.stats.tasksDone / timeline.stats.tasksTotal) * 100)
      : 0;

  const displayEvents = timeline.events.slice(0, 8);
  const buildHref = `/dashboard/build-tracker?projectId=${timeline.projectId}&tab=tasks`;
  const growthHref = `/dashboard/growth-engine?projectId=${timeline.projectId}&tab=coach`;
  const growthCampaignsHref = `/dashboard/growth-engine?projectId=${timeline.projectId}&tab=campaigns`;
  const growthPlaybooksHref = `/dashboard/growth-engine?projectId=${timeline.projectId}&tab=playbooks`;
  const leadsHref = `/dashboard/lead-finder`;
  const repoHref = `/dashboard/repository?projectId=${timeline.projectId}`;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-1 min-w-0 flex-1">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 -ml-1"
                  aria-label={open ? "Collapse journey" : "Expand journey"}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      open ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <div className="min-w-0">
                <Link
                  href={buildHref}
                  className="text-base font-semibold truncate block hover:text-primary transition-colors"
                >
                  {timeline.projectName}
                </Link>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {timeline.status}
                  </Badge>
                  {timeline.idea?.aiScore != null && (
                    <Link href="/dashboard/brainstorm">
                      <Badge variant="secondary" className="text-xs gap-1 hover:bg-secondary/80">
                        <Lightbulb className="h-3 w-3" />
                        Score {timeline.idea.aiScore.toFixed(0)}
                      </Badge>
                    </Link>
                  )}
                  {timeline.stats.leadsCount > 0 && (
                    <Link href={leadsHref}>
                      <Badge variant="secondary" className="text-xs gap-1 hover:bg-secondary/80">
                        <Users className="h-3 w-3" />
                        {timeline.stats.leadsCount} lead
                        {timeline.stats.leadsCount !== 1 ? "s" : ""}
                      </Badge>
                    </Link>
                  )}
                  {timeline.stats.hasRepo && (
                    <Link href={repoHref}>
                      <Badge variant="secondary" className="text-xs gap-1 hover:bg-secondary/80">
                        <GitBranch className="h-3 w-3" />
                        Repo
                      </Badge>
                    </Link>
                  )}
                  {timeline.stats.campaignCount > 0 && (
                    <Link href={growthCampaignsHref}>
                      <Badge variant="secondary" className="text-xs gap-1 hover:bg-secondary/80">
                        <Megaphone className="h-3 w-3" />
                        {timeline.stats.campaignCount} campaign
                        {timeline.stats.campaignCount !== 1 ? "s" : ""}
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <Link
              href={buildHref}
              className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              Open
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {!open && (
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            {timeline.stats.tasksDone}/{timeline.stats.tasksTotal} tasks ·{" "}
            {timeline.stats.milestonesDone}/{timeline.stats.milestonesTotal}{" "}
            milestones
          </div>
        )}

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={buildHref}
                className="space-y-1.5 rounded-md p-2 -m-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Milestones</span>
                  <span>
                    {timeline.stats.milestonesDone}/{timeline.stats.milestonesTotal}
                  </span>
                </div>
                <Progress value={milestonePercent} className="h-1.5" />
              </Link>
              <Link
                href={buildHref}
                className="space-y-1.5 rounded-md p-2 -m-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tasks</span>
                  <span>
                    {timeline.stats.tasksDone}/{timeline.stats.tasksTotal}
                  </span>
                </div>
                <Progress value={taskPercent} className="h-1.5" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={buildHref}>Tasks</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={growthHref}>Coach</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={growthCampaignsHref}>Campaigns</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={growthPlaybooksHref}>Playbooks</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={leadsHref}>Leads</Link>
              </Button>
              {timeline.stats.hasRepo && (
                <Button asChild size="sm" variant="outline">
                  <Link href={repoHref}>Repo</Link>
                </Button>
              )}
            </div>

            {displayEvents.length > 0 ? (
              <ul className="pt-2">
                {displayEvents.map((event) => (
                  <TimelineEventRow key={event.id} event={event} />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            )}

            <p className="text-[10px] text-muted-foreground border-t pt-3">
              Started {format(new Date(timeline.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function ProjectTimelineFeed({
  timelines,
  monthlyRevenue,
}: {
  timelines: ProjectTimeline[];
  monthlyRevenue: number;
}) {
  if (timelines.length === 0) {
    return (
      <CollapsibleWidget
        id="project-journeys"
        title={
          <span className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Project Journeys
          </span>
        }
        collapsedSummary="No projects yet"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No projects yet. Promote an idea from{" "}
            <Link href="/dashboard/brainstorm" className="text-primary hover:underline">
              Brainstorm
            </Link>{" "}
            or a lead from{" "}
            <Link href="/dashboard/lead-finder" className="text-primary hover:underline">
              Lead Finder
            </Link>{" "}
            to see your full journey here.
          </p>
          <HowDoILink section="command-center" />
        </div>
      </CollapsibleWidget>
    );
  }

  return (
    <CollapsibleWidget
      id="project-journeys"
      title={
        <span className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Project Journeys
        </span>
      }
      actions={
        <Link
          href="/dashboard/build-tracker"
          className="text-sm text-primary hover:underline"
        >
          Build Tracker
        </Link>
      }
      collapsedSummary={`${timelines.length} project${timelines.length !== 1 ? "s" : ""}${
        monthlyRevenue > 0
          ? ` · ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(monthlyRevenue)} MRR`
          : ""
      }`}
      contentClassName="space-y-4"
    >
      <p className="text-sm text-muted-foreground -mt-1">
        Idea → build → leads → launch, per product. Click events, badges, or
        shortcuts to jump in.
        {monthlyRevenue > 0 && (
          <span>
            {" "}
            ·{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(monthlyRevenue)}{" "}
            MRR this month
          </span>
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {timelines.map((timeline) => (
          <ProjectTimelineCard key={timeline.projectId} timeline={timeline} />
        ))}
      </div>
    </CollapsibleWidget>
  );
}
