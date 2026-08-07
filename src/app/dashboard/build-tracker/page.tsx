import Link from "next/link";
import { getProjectsWithTasks } from "@/lib/actions/tasks";
import { getBuildReleasesForProject, getBuildMetrics } from "@/lib/actions/build-library";
import { getRepoMonitoringSnapshot } from "@/lib/actions/repo-monitoring";
import { getProjectProfile } from "@/lib/actions/project-profile";
import { requireAuth } from "@/lib/auth";
import { getUserRole, type UserRole } from "@/lib/build-rbac";
import { BuildTracker } from "@/components/build-tracker/build-tracker";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BuildTrackerPage() {
  const user = await requireAuth();
  const userRole = getUserRole(user) as UserRole;
  const projects = await getProjectsWithTasks();

  const boardProjects = await Promise.all(
    projects.map(async (project) => {
      const [builds, buildMetrics, monitoring, profile] = await Promise.all([
        getBuildReleasesForProject(project.id),
        getBuildMetrics(project.id),
        project.githubConnection
          ? getRepoMonitoringSnapshot(project.id)
          : Promise.resolve(null),
        getProjectProfile(project.id),
      ]);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        repoUrl: project.repoUrl,
        githubConnection: project.githubConnection
          ? {
              repoUrl: project.githubConnection.repoUrl,
              provider: project.githubConnection.provider,
              repoFullName: project.githubConnection.repoFullName,
            }
          : null,
        ideas: project.ideas,
        leads: project.leads,
        builds,
        buildMetrics,
        monitoring,
        profile,
        milestones: project.milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          targetDate: milestone.targetDate.toISOString(),
          isCompleted: milestone.isCompleted,
        })),
        tasks: project.tasks,
        _count: project._count,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Build Tracker</h1>
        <p className="text-muted-foreground">
          Tasks, milestones, build library, GitHub CI, Vercel deployments, env vars,
          tech stack, and project notes — all in one place per project.
        </p>
      </div>

      {boardProjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-4">
            <p>
              No projects yet.{" "}
              <Link href="/dashboard/brainstorm" className="text-primary hover:underline">
                Score an idea and promote it
              </Link>
              , or create one manually below.
            </p>
            <div className="flex justify-center">
              <BuildTracker projects={[]} userRole={userRole} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <BuildTracker projects={boardProjects} userRole={userRole} />
      )}
    </div>
  );
}
