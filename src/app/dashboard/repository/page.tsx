import { RepositoryWorkspace } from "@/components/repository/repository-workspace";
import {
  fetchRepoStats,
  getProjectsForRepository,
} from "@/lib/actions/projects";
import { getRepoMonitoringSnapshot } from "@/lib/actions/repo-monitoring";

export const dynamic = "force-dynamic";

export default async function RepositoryPage() {
  const projects = await getProjectsForRepository();

  const withStats = await Promise.all(
    projects.map(async (p) => {
      const repoUrl = p.repoUrl ?? p.githubConnection?.repoUrl ?? null;
      const stats = repoUrl ? await fetchRepoStats(repoUrl) : null;
      const monitoring = p.githubConnection
        ? await getRepoMonitoringSnapshot(p.id)
        : null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        repoUrl,
        githubConnection: p.githubConnection
          ? {
              repoUrl: p.githubConnection.repoUrl,
              provider: p.githubConnection.provider,
              repoFullName: p.githubConnection.repoFullName,
            }
          : null,
        stats,
        monitoring,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repository & CI Monitoring</h1>
        <p className="text-muted-foreground">
          Link GitHub repos, monitor branches, PRs, builds, and releases in real time via webhooks.
        </p>
      </div>
      <RepositoryWorkspace projects={withStats} />
    </div>
  );
}
