import { supabase } from './supabase';
import { logProjectEvent } from './build-tracker';

/**
 * Structural logic for GitHub integration.
 * In a real-world scenario, this would involve GitHub OAuth and Webhooks.
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
  payload: any;
  created_at: string;
}

export async function linkGitHubRepo(projectId: string, repoFullName: string) {
  // Update project with repo name
  const { data: project, error } = await supabase
    .from('projects')
    .update({ github_repo: repoFullName })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;

  // Log integration event
  await logProjectEvent({
    project_id: projectId,
    type: 'github_linked',
    description: `Linked to GitHub repository: ${repoFullName}`,
    metadata: { repo: repoFullName }
  });

  return project;
}

export async function fetchRepoDetails(repoFullName: string): Promise<GitHubRepo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Error fetching repo details:', e);
    return null;
  }
}

export async function fetchRecentRepoEvents(repoFullName: string): Promise<GitHubEvent[]> {
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
 * Simulates processing a webhook event from GitHub.
 * This would be called by a Supabase Edge Function in production.
 */
export async function simulateGitHubWebhook(projectId: string, eventType: string, payload: any) {
  let description = `GitHub activity: ${eventType}`;

  if (eventType === 'push') {
    const branch = payload.ref.replace('refs/heads/', '');
    const commitCount = payload.commits?.length || 0;
    description = `Pushed ${commitCount} commit(s) to ${branch}`;
  } else if (eventType === 'issues') {
    description = `Issue ${payload.action}: ${payload.issue.title}`;
  }

  return await logProjectEvent({
    project_id: projectId,
    type: `github_${eventType}`,
    description,
    metadata: payload
  });
}
