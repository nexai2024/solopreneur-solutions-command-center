import { withRetry, type RetryOptions } from "./retry";

type FetchResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

type SafeFetchOptions = RequestInit & {
  /** Retry options - set to false to disable retry */
  retry?: Partial<RetryOptions> | false;
};

/**
 * Safe fetch wrapper that never throws. Returns a discriminated union of success/error.
 * Handles network errors, non-OK responses, and JSON parse failures gracefully.
 * Includes automatic retry with exponential backoff for transient failures.
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: SafeFetchOptions
): Promise<FetchResult<T>> {
  const { retry: retryOptions, ...fetchOptions } = options ?? {};

  const executeFetch = async (): Promise<FetchResult<T>> => {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`;
        try {
          const body = await response.json();
          if (body.error) errorMessage = body.error;
        } catch {
          // Response wasn't JSON - use default message
        }
        return { ok: false, error: errorMessage, status: response.status };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { ok: true, data: null as T, status: 204 };
      }

      try {
        const data = await response.json();
        return { ok: true, data: data as T, status: response.status };
      } catch {
        return { ok: false, error: "Invalid response format", status: response.status };
      }
    } catch (err) {
      // Network error, CORS, DNS failure, etc.
      const message = err instanceof Error ? err.message : "Network error";
      return { ok: false, error: message, status: 0 };
    }
  };

  // If retry is explicitly disabled, run without retry
  if (retryOptions === false) {
    return executeFetch();
  }

  // Run with retry
  const result = await withRetry(async () => {
    const fetchResult = await executeFetch();

    // If the fetch itself failed with a retryable status, throw to trigger retry
    if (!fetchResult.ok && fetchResult.status >= 500) {
      // Use type assertion to access error property
      const errorMsg = (fetchResult as { ok: false; error: string }).error;
      throw new Error(errorMsg);
    }

    return fetchResult;
  }, {
    maxRetries: 3,
    baseDelayMs: 1000,
    jitter: true,
    operationName: `fetch ${url}`,
    ...retryOptions,
  });

  // If retry failed, return the error
  if (!result.success) {
    return {
      ok: false,
      error: result.error?.message ?? "Request failed after retries",
      status: 0,
    };
  }

  return result.data!;
}

/**
 * Convenience wrappers for common HTTP methods with retry.
 */
export function fetchGet<T>(url: string, retry?: Partial<RetryOptions> | false) {
  return safeFetch<T>(url, { retry });
}

export function fetchPost<T>(url: string, body?: unknown, retry?: Partial<RetryOptions> | false) {
  return safeFetch<T>(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    retry,
  });
}

export function fetchPut<T>(url: string, body?: unknown, retry?: Partial<RetryOptions> | false) {
  return safeFetch<T>(url, {
    method: "PUT",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    retry,
  });
}

export function fetchPatch<T>(url: string, body?: unknown, retry?: Partial<RetryOptions> | false) {
  return safeFetch<T>(url, {
    method: "PATCH",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    retry,
  });
}

export function fetchDelete<T>(url: string, retry?: Partial<RetryOptions> | false) {
  return safeFetch<T>(url, { method: "DELETE", retry });
}

/**
 * Fetch with retry that throws on error (for use in try/catch blocks)
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  retryOptions?: Partial<RetryOptions>
): Promise<T> {
  const result = await withRetry(
    async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`;
        try {
          const body = await response.json();
          if (body.error) errorMessage = body.error;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return null as T;
      }

      return response.json() as Promise<T>;
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      jitter: true,
      operationName: `fetch ${url}`,
      ...retryOptions,
    }
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}
