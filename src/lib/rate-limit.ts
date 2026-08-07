type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfterMs: number };

/** In-memory sliding-window rate limiter (per-process; use Redis in multi-instance prod). */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (bucket.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterMs: bucket.resetAt - now,
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: config.limit - bucket.count, resetAt: bucket.resetAt };
}

/** Read current usage without incrementing the counter. */
export function getRateLimitUsage(
  key: string,
  config: RateLimitConfig
): { used: number; remaining: number; limit: number; resetAt: string | null } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    return {
      used: 0,
      remaining: config.limit,
      limit: config.limit,
      resetAt: null,
    };
  }

  return {
    used: bucket.count,
    remaining: Math.max(0, config.limit - bucket.count),
    limit: config.limit,
    resetAt: new Date(bucket.resetAt).toISOString(),
  };
}

export function assertRateLimit(key: string, config: RateLimitConfig): void {
  const result = checkRateLimit(key, config);
  if (!result.allowed) {
    const seconds = Math.ceil(
      ("retryAfterMs" in result ? result.retryAfterMs : 1000) / 1000
    );
    throw new Error(`Rate limit exceeded. Try again in ${seconds}s.`);
  }
}

/** Standard AI endpoint limits per user */
export const AI_RATE_LIMIT: RateLimitConfig = {
  limit: Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 30),
  windowMs: 60 * 60 * 1000,
};

export function assertAiRateLimit(userId: string): void {
  assertRateLimit(`ai:${userId}`, AI_RATE_LIMIT);
}

/** Reset buckets — test helper only */
export function _resetRateLimitsForTests(): void {
  buckets.clear();
}
