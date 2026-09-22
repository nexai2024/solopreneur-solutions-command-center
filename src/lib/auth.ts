import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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

function resolveClerkEmail(
  clerkUser: Awaited<ReturnType<typeof currentUser>>
): string | null {
  if (!clerkUser) return null;
  return (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses.find((e) => e.emailAddress)?.emailAddress ??
    null
  );
}

/**
 * Resolve the DB user for the current Clerk session.
 * Returns null only when there is no Clerk session.
 * DB / sync failures are thrown (not masked as Unauthorized).
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const clerkUser = await currentUser();
  const email = resolveClerkEmail(clerkUser);
  if (!email) {
    throw new Error(
      "Your Clerk account has no email address. Add one in account settings, then refresh."
    );
  }

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
        const raced = await prisma.user.findUnique({ where: { clerkId } });
        if (raced) return raced;
      }
      throw error;
    }
  }

  const name =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    email.split("@")[0] ||
    "User";

  try {
    return await prisma.user.create({
      data: { clerkId, email, name },
    });
  } catch (error) {
    // Parallel dashboard loaders both tried to create the same user.
    if (isUniqueConstraintError(error)) {
      const raced =
        (await prisma.user.findUnique({ where: { clerkId } })) ??
        (await prisma.user.findUnique({ where: { email } }));
      if (raced) return raced;
    }
    throw error;
  }
}

/**
 * Require a signed-in DB user. Redirects home (modal sign-in) when there is no session.
 * Re-throws account/DB sync errors so they are not misreported as Unauthorized.
 */
export async function requireAuth(): Promise<DbUser> {
  const session = await auth();
  if (!session.userId) {
    // App uses Clerk modal on `/` rather than a dedicated /sign-in route
    redirect("/");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}
