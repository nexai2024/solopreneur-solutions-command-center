export type DeployEnvironment = "Dev" | "Staging" | "UAT" | "Production";

export function parseGithubRepoUrl(repoUrl: string): {
  owner: string;
  repo: string;
  fullName: string;
} | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  return { owner, repo, fullName: `${owner}/${repo}` };
}

/** main → Staging, release/* → UAT, everything else → Dev */
export function resolveEnvironment(branch: string): DeployEnvironment {
  if (branch === "main" || branch === "master") return "Staging";
  if (branch.startsWith("release/") || branch.startsWith("release-")) return "UAT";
  if (branch.startsWith("v") && /^\d/.test(branch.slice(1))) return "Production";
  return "Dev";
}

export function isReleaseTag(ref: string): boolean {
  return ref.startsWith("refs/tags/v");
}

export function tagFromRef(ref: string): string {
  return ref.replace("refs/tags/", "");
}

export function branchFromRef(ref: string): string {
  return ref.replace("refs/heads/", "");
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function commitUrl(fullName: string, sha: string): string {
  return `https://github.com/${fullName}/commit/${sha}`;
}

export function diffUrl(fullName: string, baseSha: string, headSha: string): string {
  return `https://github.com/${fullName}/compare/${baseSha}...${headSha}`;
}

export function prPreviewUrl(
  fullName: string,
  prNumber: number,
  headBranch: string
): string {
  const template =
    process.env.PREVIEW_URL_TEMPLATE ??
    "https://{repo}-git-{branch}-{owner}.vercel.app";

  const [owner, repo] = fullName.split("/");
  const safeBranch = headBranch.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 40);

  return template
    .replace("{owner}", owner)
    .replace("{repo}", repo)
    .replace("{pr}", String(prNumber))
    .replace("{branch}", safeBranch);
}

export type BuildStatus = "pending" | "building" | "passed" | "failed";

export function githubStatusState(
  status: BuildStatus
): "pending" | "success" | "failure" | "error" {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "failure";
    case "building":
    case "pending":
    default:
      return "pending";
  }
}
