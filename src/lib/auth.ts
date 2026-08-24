import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "./prisma";

export type DbUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: string;
};

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Resolve the DB user for the current Clerk session.
 * Safe under concurrent calls (e.g. Promise.all of multiple server actions/queries)
 * that would otherwise race on user.create and hit unique(clerkId).
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!email) return null;

    const existingByClerk = await prisma.user.findUnique({
      where: { clerkId },
    });
    if (existingByClerk) {
      return existingByClerk;
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      try {
        return await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { clerkId },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return await prisma.user.findUnique({ where: { clerkId } });
        }
        throw error;
      }
    }

    const name =
      clerkUser?.fullName ||
      clerkUser?.firstName ||
      email.split("@")[0];

    try {
      return await prisma.user.create({
        data: { clerkId, email, name },
      });
    } catch (error) {
      // Parallel dashboard loaders both tried to create the same user.
      if (isUniqueConstraintError(error)) {
        return (
          (await prisma.user.findUnique({ where: { clerkId } })) ??
          (await prisma.user.findUnique({ where: { email } }))
        );
      }
      throw error;
    }
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<DbUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
