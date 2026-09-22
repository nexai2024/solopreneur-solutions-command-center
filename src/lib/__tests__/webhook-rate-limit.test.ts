import { describe, expect, it, beforeEach } from "vitest";
import { rateLimitWebhook, getClientIp, WEBHOOK_RATE_LIMIT } from "@/lib/webhook-rate-limit";
import { _resetRateLimitsForTests } from "@/lib/rate-limit";

describe("webhook-rate-limit", () => {
  beforeEach(() => {
    // Reset rate limits before each test
    _resetRateLimitsForTests();
  });

  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });
      expect(getClientIp(request)).toBe("192.168.1.1");
    });

    it("extracts IP from x-real-ip header", () => {
      const request = new Request("http://example.com", {
        headers: {
          "x-real-ip": "192.168.1.1",
        },
      });
      expect(getClientIp(request)).toBe("192.168.1.1");
    });

    it("returns null when no IP headers present", () => {
      const request = new Request("http://example.com");
      expect(getClientIp(request)).toBeNull();
    });

    it("takes first IP from x-forwarded-for chain", () => {
      const request = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
      });
      expect(getClientIp(request)).toBe("203.0.113.195");
    });
  });

  describe("rateLimitWebhook", () => {
    it("allows request when rate limit not exceeded", () => {
      const request = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const result = rateLimitWebhook(getClientIp(request), "github");
      expect(result).toBeNull();
    });

    it("blocks request when rate limit exceeded", () => {
      const ip = "192.168.1.1";
      const request = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": ip,
        },
      });

      // Exhaust the rate limit (default 100 per minute)
      const config = WEBHOOK_RATE_LIMIT.github;
      for (let i = 0; i < config.limit; i++) {
        rateLimitWebhook(ip, "github");
      }

      // Next request should be rate limited
      const result = rateLimitWebhook(getClientIp(request), "github");
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
      expect(result?.error).toContain("Rate limit exceeded");
    });

    it("has different limits for different webhook types", () => {
      const githubConfig = WEBHOOK_RATE_LIMIT.github;
      const stripeConfig = WEBHOOK_RATE_LIMIT.stripe;

      expect(githubConfig.limit).toBe(100);
      expect(stripeConfig.limit).toBe(50);
      expect(githubConfig.limit).toBeGreaterThan(stripeConfig.limit);
    });

    it("allows requests without IP (e.g., health checks)", () => {
      const result = rateLimitWebhook(null, "github");
      expect(result).toBeNull();
    });
  });
});
