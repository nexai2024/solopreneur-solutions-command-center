import { describe, expect, it, vi } from "vitest";
import { withRetry } from "@/lib/retry";

describe("withRetry", () => {
  it("returns success on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toBe("success");
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toBe("success");
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("fails after max retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent failure"));

    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("persistent failure");
    expect(result.attempts).toBe(3); // Initial + 2 retries
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onRetry callback", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");
    const onRetry = vi.fn();

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      onRetry,
    });

    expect(result.success).toBe(true);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.any(Error),
      1,
      expect.any(Number)
    );
  });

  it("returns total delay time", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
      jitter: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalDelayMs).toBeGreaterThanOrEqual(100);
  });

  it("stops retrying on success", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, { maxRetries: 5, baseDelayMs: 10 });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("handles non-Error throws", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce("string error")
      .mockResolvedValue("success");

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toBe("success");
  });

  it("respects operationName for logging", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      operationName: "test-operation",
    });

    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0]?.[0] as string;
    expect(logCall).toContain("test-operation");

    consoleSpy.mockRestore();
  });
});
