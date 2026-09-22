// This file contains legacy GitHub integration code that has been deprecated.
// All functionality has been migrated to the new webhook-based system.
// This file is kept for reference during migration only.

/**
 * @deprecated Use the new GitHub webhook system in src/app/api/github/webhook/route.ts
 * and src/lib/github/webhook-processor.ts instead.
 *
 * The new system provides:
 * - Real webhook processing with signature verification
 * - Build tracking and CI integration
 * - Pull request synchronization
 * - Changelog generation
 */
export interface GitHubRepo {
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

export interface GitHubEvent {
  id: string;
  type: 'PushEvent' | 'IssuesEvent' | 'PullRequestEvent';
  actor: {
    login: string;
    avatar_url: string;
  };
  payload: unknown;
  created_at: string;
}

/**
 * @deprecated Use linkProjectRepository from @/lib/actions/projects instead
 */
export async function linkGitHubRepo(
  projectId: string,
  repoFullName: string
): Promise<GitHubRepo | null> {
  console.warn("linkGitHubRepo is deprecated. Use linkProjectRepository from @/lib/actions/projects");
  const { linkProjectRepository } = await import("@/lib/actions/projects");
  await linkProjectRepository(projectId, `https://github.com/${repoFullName}`);
  return fetchRepoDetails(repoFullName);
}

/**
 * Fetch repository details from GitHub API
 */
export async function fetchRepoDetails(repoFullName: string): Promise<GitHubRepo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      full_name: data.full_name,
      description: data.description ?? "",
      html_url: data.html_url,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      open_issues_count: data.open_issues_count,
    };
  } catch (e) {
    console.error('Error fetching repo details:', e);
    return null;
  }
}

/**
 * @deprecated Use the webhook-based event tracking instead
 */
export async function fetchRecentRepoEvents(
  repoFullName: string
): Promise<GitHubEvent[]> {
  console.warn("fetchRecentRepoEvents is deprecated.");
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/events?per_page=10`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Error fetching repo events:', e);
    return [];
  }
}

/**
 * @deprecated This simulation function is no longer needed.
 * Use the real webhook processor instead.
 */
export async function simulateGitHubWebhook(
  projectId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  console.warn("simulateGitHubWebhook is deprecated. Use the real webhook processor.");
}

