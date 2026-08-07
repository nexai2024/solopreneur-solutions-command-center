import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { getCurrentUser } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with consistent error handling, logging, and auth.
 */
export function withErrorHandler(
  handler: RouteHandler,
  options?: { route?: string }
): RouteHandler {
  return async (req, context) => {
    const route = options?.route || req.nextUrl.pathname;
    const method = req.method;

    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ApiError) {
        logger.warn("API client error", { route, method }, error);
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      logger.error("Unhandled API error", { route, method }, error);
      return NextResponse.json(
        { error: "An unexpected error occurred. Please try again." },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to require authentication in API routes. Throws ApiError if not authenticated.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError("Unauthorized", 401);
  }
  return user;
}

/**
 * Consistent JSON success response.
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Consistent JSON error response.
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
