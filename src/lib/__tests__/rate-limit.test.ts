import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  getRateLimitUsage,
  _resetRateLimitsForTests,
  AI_RATE_LIMIT,
} from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    _resetRateLimitsForTests();
  });

  it("allows requests under the limit", () => {
    const config = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit("user:1", config).allowed).toBe(true);
    expect(checkRateLimit("user:1", config).allowed).toBe(true);
    expect(checkRateLimit("user:1", config).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const config = { limit: 2, windowMs: 60_000 };
    checkRateLimit("user:2", config);
    checkRateLimit("user:2", config);
    const blocked = checkRateLimit("user:2", config);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed && "retryAfterMs" in blocked) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("uses separate buckets per key", () => {
    const config = { limit: 1, windowMs: 60_000 };
    checkRateLimit("a", config);
    expect(checkRateLimit("a", config).allowed).toBe(false);
    expect(checkRateLimit("b", config).allowed).toBe(true);
  });

  it("reads usage without incrementing", () => {
    const config = { limit: 5, windowMs: 60_000 };
    checkRateLimit("peek:user", config);
    checkRateLimit("peek:user", config);
    const usage = getRateLimitUsage("peek:user", config);
    expect(usage.used).toBe(2);
    expect(usage.remaining).toBe(3);
    expect(usage.limit).toBe(5);
  });

  it("exports AI rate limit config", () => {
    expect(AI_RATE_LIMIT.limit).toBeGreaterThan(0);
    expect(AI_RATE_LIMIT.windowMs).toBe(3_600_000);
  });
});
