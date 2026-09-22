import { checkRateLimit } from "./rate-limit";

/**
 * Webhook-specific rate limiting configuration
 * Webhooks should have stricter limits than general API endpoints
 * since they can be triggered by external events
 */
export const WEBHOOK_RATE_LIMIT = {
  github: {
    limit: Number(process.env.GITHUB_WEBHOOK_RATE_LIMIT ?? 100),
    windowMs: 60 * 1000, // 100 requests per minute
  },
  stripe: {
    limit: Number(process.env.STRIPE_WEBHOOK_RATE_LIMIT ?? 50),
    windowMs: 60 * 1000, // 50 requests per minute
  },
  ci: {
    limit: Number(process.env.CI_WEBHOOK_RATE_LIMIT ?? 30),
    windowMs: 60 * 1000, // 30 requests per minute
  },
  clerk: {
    limit: Number(process.env.CLERK_WEBHOOK_RATE_LIMIT ?? 30),
    windowMs: 60 * 1000, // 30 requests per minute
  },
};

/**
 * Rate limit a webhook request based on IP address
 * Returns a response if rate limited, null if allowed
 */
export function rateLimitWebhook(
  ip: string | null,
  webhookType: keyof typeof WEBHOOK_RATE_LIMIT
): { error: string; status: number } | null {
  if (!ip) {
    // Allow requests without IP (e.g., health checks, internal calls)
    return null;
  }

  const config = WEBHOOK_RATE_LIMIT[webhookType];
  const result = checkRateLimit(`webhook:${webhookType}:${ip}`, config);

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(
      ("retryAfterMs" in result ? result.retryAfterMs : 60000) / 1000
    );
    return {
      error: `Rate limit exceeded. Please retry after ${retryAfterSeconds} seconds.`,
      status: 429,
    };
  }

  return null;
}

/**
 * Get client IP from request headers, handling common proxy setups
 */
export function getClientIp(request: Request): string | null {
  // Check for forwarded IP (behind proxy/CDN)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(",")[0].trim();
  }

  // Check for X-Real-IP (common with nginx)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback: can't determine IP
  return null;
}
