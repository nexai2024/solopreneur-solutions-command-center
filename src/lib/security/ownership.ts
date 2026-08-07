import { prisma } from "@/lib/prisma";
import type { DbUser } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

/** Assert the authenticated user owns a project. */
export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new NotFoundError("Project");
  return project;
}

/** Assert projectId belongs to user when provided (nullable OK). */
export async function assertOptionalProjectOwner(
  projectId: string | null | undefined,
  userId: string
) {
  if (!projectId) return null;
  return assertProjectOwner(projectId, userId);
}

/** Assert the user owns a lead row. */
export async function assertLeadOwner(leadId: string, userId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

/** Assert the user owns a brainstorm session. */
export async function assertBrainstormSessionOwner(sessionId: string, userId: string) {
  const session = await prisma.brainstormSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new NotFoundError("Brainstorm session");
  return session;
}

/** Scope every Prisma query/mutation to the authenticated user. */
export function scopeToUser(user: DbUser) {
  return { userId: user.id } as const;
}
