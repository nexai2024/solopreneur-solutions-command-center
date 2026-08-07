import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Users, Kanban, DollarSign, Target } from "lucide-react";
import { getDashboardStats, getProjectTimelines } from "@/lib/actions/dashboard";
import { MilestoneOverview } from "@/components/dashboard/milestone-overview";
import { ProjectTimelineFeed } from "@/components/dashboard/project-timeline-feed";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { HowDoILink } from "@/components/help/how-do-i-link";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const [stats, timelines] = await Promise.all([
    getDashboardStats(),
    getProjectTimelines(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">
          Operational summary across your products and pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scored Ideas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scoredIdeas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.projectCount} active project{stats.projectCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Kanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTasks}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.milestones.completed}/{stats.milestones.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.milestones.percent}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pipelineLeads}</div>
            <p className="text-xs text-muted-foreground">Excluding lost leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">This calendar month</p>
          </CardContent>
        </Card>
      </div>

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Ideas</CardTitle>
            <Link
              href="/dashboard/brainstorm"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentIdeas.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No ideas yet.{" "}
                  <Link href="/dashboard/brainstorm" className="text-primary hover:underline">
                    Add your first idea
                  </Link>{" "}
                  to run AI scoring.
                </p>
                <HowDoILink section="command-center" />
              </div>
            ) : (
              <ul className="space-y-3">
                {stats.recentIdeas.map((idea) => (
                  <li
                    key={idea.id}
                    className="flex items-center justify-between gap-4 text-sm"
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
