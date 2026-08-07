import { prisma } from "@/lib/prisma";

export async function generateChangelogBetween(
  projectId: string,
  fromSha: string | null,
  toSha: string
): Promise<string> {
  const toCommit = await prisma.repoCommit.findFirst({
    where: { projectId, sha: toSha },
  });
  if (!toCommit) return "";

  const where: { projectId: string; committedAt?: { gt: Date } } = {
    projectId,
  };

  if (fromSha) {
    const fromCommit = await prisma.repoCommit.findFirst({
      where: { projectId, sha: fromSha },
    });
    if (fromCommit) {
      where.committedAt = { gt: fromCommit.committedAt };
    }
  }

  const commits = await prisma.repoCommit.findMany({
    where,
    orderBy: { committedAt: "asc" },
    take: 50,
  });

  const filtered = commits.filter((c) => c.sha !== fromSha);
  if (filtered.length === 0) {
    return `- ${toCommit.message.split("\n")[0]} (${toCommit.authorName})`;
  }

  return filtered
    .map((c) => `- ${c.message.split("\n")[0]} (${c.authorName})`)
    .join("\n");
}

export function formatReleaseChangelog(
  tag: string,
  commits: Array<{ message: string; authorName: string; shortSha: string }>
): string {
  const header = `## ${tag}\n`;
  if (commits.length === 0) return `${header}\n- Initial release`;
  const body = commits
    .map((c) => `- ${c.message.split("\n")[0]} (${c.authorName}, \`${c.shortSha}\`)`)
    .join("\n");
  return `${header}\n${body}`;
}
