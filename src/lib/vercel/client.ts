const VERCEL_API = "https://api.vercel.com";

export type VercelProjectSummary = {
  id: string;
  name: string;
  framework: string | null;
  link?: { type?: string; repo?: string } | null;
  latestDeployments?: Array<{ url?: string; readyState?: string }>;
};

export type VercelDeployment = {
  uid: string;
  url: string;
  name: string;
  state: string;
  readyState?: string;
  target: string | null;
  meta?: Record<string, string>;
  gitSource?: {
    ref?: string;
    sha?: string;
    commitMessage?: string;
  };
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  creator?: { username?: string };
};

export type VercelEnvVar = {
  id: string;
  key: string;
  value: string;
  type: "plain" | "encrypted" | "secret" | "system";
  target: Array<"production" | "preview" | "development">;
};

function teamQuery(teamId?: string | null): string {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

async function vercelFetch<T>(
  path: string,
  token: string,
  options?: { teamId?: string | null; searchParams?: Record<string, string> }
): Promise<T> {
  const url = new URL(`${VERCEL_API}${path}`);
  if (options?.teamId) {
    url.searchParams.set("teamId", options.teamId);
  }
  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API error (${res.status}): ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

export async function listVercelProjects(
  token: string,
  teamId?: string | null
): Promise<VercelProjectSummary[]> {
  const data = await vercelFetch<{ projects: VercelProjectSummary[] }>(
    "/v9/projects",
    token,
    { teamId, searchParams: { limit: "50" } }
  );
  return data.projects ?? [];
}

export async function getVercelProject(
  token: string,
  projectIdOrName: string,
  teamId?: string | null
): Promise<VercelProjectSummary & { targets?: { production?: { alias?: string[] } } }> {
  return vercelFetch(
    `/v9/projects/${encodeURIComponent(projectIdOrName)}${teamQuery(teamId)}`,
    token
  );
}

export async function listVercelDeployments(
  token: string,
  vercelProjectId: string,
  teamId?: string | null,
  limit = 20
): Promise<VercelDeployment[]> {
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>(
    "/v6/deployments",
    token,
    {
      teamId,
      searchParams: {
        projectId: vercelProjectId,
        limit: String(limit),
      },
    }
  );
  return data.deployments ?? [];
}

export async function listVercelEnvVars(
  token: string,
  vercelProjectId: string,
  teamId?: string | null
): Promise<VercelEnvVar[]> {
  const data = await vercelFetch<{ envs: VercelEnvVar[] }>(
    `/v9/projects/${encodeURIComponent(vercelProjectId)}/env${teamQuery(teamId)}`,
    token
  );
  return data.envs ?? [];
}

export function mapDeploymentEnvironment(target: string | null): string {
  if (target === "production") return "Production";
  if (target === "staging") return "Staging";
  return "Preview";
}

export function mapDeploymentStatus(state: string, readyState?: string): string {
  const value = readyState ?? state;
  if (value === "READY") return "ready";
  if (value === "ERROR" || value === "CANCELED") return "error";
  if (value === "BUILDING" || value === "INITIALIZING" || value === "QUEUED") {
    return "building";
  }
  return value.toLowerCase();
}
