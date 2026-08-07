import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>>; user: AuthenticatedUser }
) => Promise<NextResponse<T>>;

/**
 * Higher-order function that wraps an API handler with authentication
 * Returns 401 if user is not authenticated
 */
export function withAuth<T>(handler: ApiHandler<T>) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse<T | { error: string }>> => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ) as NextResponse<{ error: string }>;
      }

      return handler(req, { ...context, user });
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      ) as NextResponse<{ error: string }>;
    }
  };
}

/**
 * Helper to check if user owns a resource
 */
export function checkOwnership(
  resourceUserId: string | null | undefined,
  currentUserId: string
): boolean {
  return resourceUserId === currentUserId;
}

/**
 * Returns 403 Forbidden response
 */
export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Returns 404 Not Found response
 */
export function notFoundResponse(resource: string = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

/**
 * Returns 400 Bad Request response
 */
export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Returns 500 Internal Server Error response
 */
export function serverErrorResponse(message: string = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
