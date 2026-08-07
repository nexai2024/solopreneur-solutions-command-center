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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProjectTimeline, ProjectTimelineEvent } from "@/lib/actions/dashboard";
import { HowDoILink } from "@/components/help/how-do-i-link";

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

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border last:hidden" />
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.className}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium leading-snug">{event.title}</p>
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
    </li>
  );
}

function ProjectTimelineCard({ timeline }: { timeline: ProjectTimeline }) {
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{timeline.projectName}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize text-xs">
                {timeline.status}
              </Badge>
              {timeline.idea?.aiScore != null && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Score {timeline.idea.aiScore.toFixed(0)}
                </Badge>
              )}
              {timeline.stats.leadsCount > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {timeline.stats.leadsCount} lead{timeline.stats.leadsCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {timeline.stats.hasRepo && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <GitBranch className="h-3 w-3" />
                  Repo
                </Badge>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/build-tracker"
            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            Open
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Milestones</span>
              <span>
                {timeline.stats.milestonesDone}/{timeline.stats.milestonesTotal}
              </span>
            </div>
            <Progress value={milestonePercent} className="h-1.5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tasks</span>
              <span>
                {timeline.stats.tasksDone}/{timeline.stats.tasksTotal}
              </span>
            </div>
            <Progress value={taskPercent} className="h-1.5" />
          </div>
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
      </CardContent>
    </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Project Journeys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Project Journeys
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Idea → build → leads → launch, per product
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
        </div>
        <Link
          href="/dashboard/build-tracker"
          className="text-sm text-primary hover:underline"
        >
          Build Tracker
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {timelines.map((timeline) => (
          <ProjectTimelineCard key={timeline.projectId} timeline={timeline} />
        ))}
      </div>
    </div>
  );
}
