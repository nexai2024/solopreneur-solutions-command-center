"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Target } from "lucide-react";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { CollapsibleWidget } from "@/components/dashboard/collapsible-widget";

type ProjectProgress = {
  projectId: string;
  projectName: string;
  total: number;
  completed: number;
  percent: number;
  nextMilestone: {
    id: string;
    title: string;
    targetDate: string;
  } | null;
};

type UpcomingMilestone = {
  id: string;
  title: string;
  targetDate: string;
  projectName: string;
  projectId: string;
};

function projectTasksHref(projectId: string) {
  return `/dashboard/build-tracker?projectId=${projectId}&tab=tasks`;
}

export function MilestoneOverview({
  total,
  completed,
  percent,
  projectProgress,
  upcoming,
}: {
  total: number;
  completed: number;
  percent: number;
  projectProgress: ProjectProgress[];
  upcoming: UpcomingMilestone[];
}) {
  if (total === 0) {
    return (
      <CollapsibleWidget
        id="milestone-progress"
        title={
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Milestone Progress
          </span>
        }
        collapsedSummary="No milestones yet"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No milestones yet.{" "}
            <Link href="/dashboard/brainstorm" className="text-primary hover:underline">
              Promote a scored idea
            </Link>{" "}
            to get a 30-day launch roadmap.
          </p>
          <HowDoILink section="build-tracker" />
        </div>
      </CollapsibleWidget>
    );
  }

  const nextDeadline = upcoming[0];

  return (
    <CollapsibleWidget
      id="milestone-progress"
      title={
        <span className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Milestone Progress
        </span>
      }
      actions={
        <Link
          href="/dashboard/build-tracker?tab=tasks"
          className="text-sm text-primary hover:underline"
        >
          Manage
        </Link>
      }
      collapsedSummary={
        nextDeadline
          ? `${completed}/${total} done · Next: ${nextDeadline.title} (${format(new Date(nextDeadline.targetDate), "MMM d")})`
          : `${completed}/${total} complete (${percent}%)`
      }
      contentClassName="space-y-6"
    >
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Overall completion</span>
          <span className="font-medium">
            {completed}/{total} ({percent}%)
          </span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      {projectProgress.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">By project</h3>
          {projectProgress.map((project) => (
            <Link
              key={project.projectId}
              href={projectTasksHref(project.projectId)}
              className="block space-y-2 rounded-md px-2 py-2 -mx-2 hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="font-medium truncate">{project.projectName}</span>
                <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                  {project.completed}/{project.total}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <Progress value={project.percent} className="h-1.5" />
              {project.nextMilestone && (
                <p className="text-xs text-muted-foreground">
                  Next: {project.nextMilestone.title} ·{" "}
                  {format(new Date(project.nextMilestone.targetDate), "MMM d")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Upcoming deadlines</h3>
          <ul className="space-y-1">
            {upcoming.map((milestone) => (
              <li key={milestone.id}>
                <Link
                  href={projectTasksHref(milestone.projectId)}
                  className="flex items-center justify-between gap-4 text-sm rounded-md px-2 py-2 -mx-2 hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{milestone.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {milestone.projectName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    {format(new Date(milestone.targetDate), "MMM d")}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CollapsibleWidget>
  );
}
