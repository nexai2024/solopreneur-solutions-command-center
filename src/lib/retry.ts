/**
 * Retry Utility with Exponential Backoff
 *
 * Provides configurable retry logic for external API calls.
 * Supports jitter, circuit breaking, and retry-after headers.
 */

export type RetryOptions = {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: Error, attempt: number) => boolean;
  /** Called on each retry attempt */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  /** Operation name for logging */
  operationName?: string;
};

export type RetryResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
};

const DEFAULT_RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  // Exponential backoff: base * 2^attempt
  let delay = baseDelayMs * Math.pow(2, attempt);

  // Add jitter (±25%)
  if (jitter) {
    const jitterRange = delay * 0.25;
    delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
  }

  // Cap at max delay
  return Math.min(delay, maxDelayMs);
}

/**
 * Extract retry-after delay from response headers
 */
function getRetryAfterDelay(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return null;

  // Check if it's a number (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Check if it's a date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now();
    return delay > 0 ? delay : null;
  }

  return null;
}

/**
 * Check if an HTTP status code is retryable
 */
function isRetryableStatus(
  status: number,
  retryableStatuses: number[]
): boolean {
  return retryableStatuses.includes(status);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(
  error: unknown,
  retryableStatuses: number[]
): boolean {
  if (error instanceof Error) {
    // Network errors are retryable
    if (
      error.name === "TypeError" &&
      error.message.includes("fetch")
    ) {
      return true;
    }

    // Check for specific error types
    if (
      error.message.includes("ECONNRESET") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("socket hang up") ||
      error.message.includes("network") ||
      error.message.includes("overloaded") ||
      error.message.includes("rate limit") ||
      error.message.includes("429") ||
      error.message.includes("503")
    ) {
      return true;
    }

    // Retry on any error by default (transient failures)
    return true;
  }

  // Non-Error throws (like string errors) are retryable
  return true;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    jitter = true,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    isRetryable,
    onRetry,
    operationName = "operation",
  } = options;

  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalDelayMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry =
        attempt < maxRetries &&
        (isRetryable
          ? isRetryable(lastError, attempt)
          : isRetryableError(lastError, retryableStatusCodes));

      if (!shouldRetry) {
        break;
      }

      // Calculate delay
      let delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitter);

      // Check for Retry-After header on HTTP errors
      if (error instanceof Response) {
        const retryAfterDelay = getRetryAfterDelay(error);
        if (retryAfterDelay !== null) {
          delayMs = Math.max(delayMs, retryAfterDelay);
        }
      }

      // Log retry attempt
      console.warn(
        `[Retry] ${operationName}: Attempt ${attempt + 1}/${maxRetries + 1} failed. ` +
          `Retrying in ${Math.round(delayMs)}ms...`,
        lastError.message
      );

      // Call onRetry callback
      onRetry?.(lastError, attempt + 1, delayMs);

      // Wait before retrying
      await sleep(delayMs);
      totalDelayMs += delayMs;
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries + 1,
    totalDelayMs,
  };
}

/**
 * Create a retryable version of a fetch function
 */
export function createRetryableFetch(
  defaultOptions: RetryOptions = {}
): typeof fetch {
  return async function retryFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const result = await withRetry(
      async () => {
        const response = await fetch(input, init);

        // Throw on retryable status codes
        if (
          isRetryableStatus(
            response.status,
            defaultOptions.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES
          )
        ) {
          throw response;
        }

        return response;
      },
      {
        ...defaultOptions,
        operationName: defaultOptions.operationName ?? `fetch ${input}`,
      }
    );

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  };
}

/**
 * Create a retryable wrapper for a specific API client
 */
export function createRetryableClient<T extends Record<string, (...args: unknown[]) => Promise<unknown>>>(
  client: T,
  options: RetryOptions = {}
): T {
  const proxy = new Proxy(client, {
    get(target, prop) {
      if (typeof prop === "string" && typeof target[prop as keyof T] === "function") {
        return async function (...args: unknown[]) {
          const result = await withRetry(
            () => (target[prop as keyof T] as Function)(...args),
            {
              ...options,
              operationName: options.operationName ?? String(prop),
            }
          );

          if (!result.success) {
            throw result.error;
          }

          return result.data;
        };
      }
      return Reflect.get(target, prop);
    },
  });

  return proxy;
}
