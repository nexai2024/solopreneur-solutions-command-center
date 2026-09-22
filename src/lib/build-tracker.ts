// This file contains legacy Supabase helpers that have been deprecated.
// All functionality has been migrated to Prisma-based server actions.
// This file is kept for reference during migration only.

/**
 * Legacy project type - use @/lib/actions/projects instead
 * @deprecated
 */
export interface Project {
  id: string;
  user_id?: string;
  name: string;
  description: string | null;
  status: string;
  github_repo?: string | null;
}

/**
 * @deprecated Use getProjectsForUser server action from @/lib/actions/dashboard
 * This legacy Supabase helper has been replaced with Prisma-based implementation.
 */
export async function fetchProjects(_userId: string): Promise<Project[]> {
  // Deprecated: Use @/lib/actions/dashboard.getProjectsForUser instead
  const { getProjectsForUser } = await import("@/lib/actions/dashboard");
  const projects = await getProjectsForUser();
  return projects.map((p) => ({
    id: p.id,
    user_id: p.userId,
    name: p.name,
    description: p.description,
    status: p.status,
    github_repo: p.repoUrl ?? null,
  }));
}

/**
 * @deprecated Use server actions for project events
 * This legacy Supabase helper has been replaced with Prisma-based implementation.
 */
export async function logProjectEvent(_event: {
  project_id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  // Deprecated: Project events are now handled via Prisma
  console.warn("logProjectEvent is deprecated. Use server actions instead.");
  return null;
}
