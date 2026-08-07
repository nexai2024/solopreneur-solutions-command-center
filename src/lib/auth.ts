import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export type DbUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: string;
};

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
      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId },
      });
    }

    const name =
      clerkUser?.fullName ||
      clerkUser?.firstName ||
      email.split("@")[0];

    return prisma.user.create({
      data: { clerkId, email, name },
    });
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
