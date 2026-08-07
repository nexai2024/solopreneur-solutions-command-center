export type Project = {
  id: string;
  user_id?: string;
  name: string;
  description: string | null;
  status: string;
  github_repo?: string | null;
};

/** @deprecated Legacy Supabase helper — use getProjectsForUser server action instead */
export async function fetchProjects(_userId: string): Promise<Project[]> {
  return [];
}

/** @deprecated Legacy Supabase helper — use Prisma project actions instead */
export async function logProjectEvent(_event: {
  project_id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  return null;
}
