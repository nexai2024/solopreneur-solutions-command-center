import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { HowDoILink } from "@/components/help/how-do-i-link";

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Milestone Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No milestones yet.{" "}
            <Link href="/dashboard/brainstorm" className="text-primary hover:underline">
              Promote a scored idea
            </Link>{" "}
            to get a 30-day launch roadmap.
          </p>
          <HowDoILink section="build-tracker" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Milestone Progress
        </CardTitle>
        <Link
          href="/dashboard/build-tracker"
          className="text-sm text-primary hover:underline"
        >
          Manage
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">By project</h3>
            {projectProgress.map((project) => (
              <div key={project.projectId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{project.projectName}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {project.completed}/{project.total}
                  </span>
                </div>
                <Progress value={project.percent} className="h-1.5" />
                {project.nextMilestone && (
                  <p className="text-xs text-muted-foreground">
                    Next: {project.nextMilestone.title} ·{" "}
                    {format(new Date(project.nextMilestone.targetDate), "MMM d")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Upcoming deadlines</h3>
            <ul className="space-y-2">
              {upcoming.map((milestone) => (
                <li
                  key={milestone.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{milestone.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {milestone.projectName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(milestone.targetDate), "MMM d")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
