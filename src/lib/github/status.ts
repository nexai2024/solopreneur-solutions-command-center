import {
  githubStatusState,
  type BuildStatus,
} from "@/lib/github/repo-utils";

const DEFAULT_CONTEXT = "solopreneur-cc/build";

export async function postGithubCommitStatus(input: {
  token: string;
  owner: string;
  repo: string;
  sha: string;
  status: BuildStatus;
  description?: string;
  targetUrl?: string;
  context?: string;
}): Promise<void> {
  const state = githubStatusState(input.status);
  const context = input.context ?? DEFAULT_CONTEXT;

  const res = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/statuses/${input.sha}`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        state,
        context,
        description:
          input.description ??
          (state === "success"
            ? "Build passed"
            : state === "failure"
              ? "Build failed"
              : "Build in progress"),
        target_url: input.targetUrl,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub status API failed: ${res.status} ${text}`);
  }
}
