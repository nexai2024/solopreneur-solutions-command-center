import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { parseGithubRepoUrl } from "@/lib/github/repo-utils";

export async function getGithubTokenForProject(
  projectId: string
): Promise<string | null> {
  const connection = await prisma.githubConnection.findUnique({
    where: { projectId },
  });

  if (connection?.accessTokenEncrypted) {
    try {
      return decrypt(connection.accessTokenEncrypted);
    } catch {
      // fall through to env token
    }
  }

  return process.env.GITHUB_TOKEN ?? null;
}

export async function getGithubConnectionByFullName(fullName: string) {
  let connection = await prisma.githubConnection.findFirst({
    where: { repoFullName: fullName, provider: "github" },
    include: { project: true },
  });

  if (!connection) {
    connection = await prisma.githubConnection.findFirst({
      where: { repoUrl: { contains: fullName.replace("/", "/") }, provider: "github" },
      include: { project: true },
    });

    if (connection) {
      const parsed = parseGithubRepoUrl(connection.repoUrl);
      if (parsed) {
        await prisma.githubConnection.update({
          where: { id: connection.id },
          data: {
            repoFullName: parsed.fullName,
            repoOwner: parsed.owner,
            repoName: parsed.repo,
          },
        });
        connection = { ...connection, repoFullName: parsed.fullName };
      }
    }
  }

  return connection;
}
