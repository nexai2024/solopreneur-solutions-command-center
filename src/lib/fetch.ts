type FetchResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

/**
 * Safe fetch wrapper that never throws. Returns a discriminated union of success/error.
 * Handles network errors, non-OK responses, and JSON parse failures gracefully.
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<FetchResult<T>> {
  try {
    const response = await fetch(url, options);

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
      return { ok: false, error: 'Invalid response format', status: response.status };
    }
  } catch (err) {
    // Network error, CORS, DNS failure, etc.
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message, status: 0 };
  }
}

/**
 * Convenience wrappers for common HTTP methods.
 */
export function fetchGet<T>(url: string) {
  return safeFetch<T>(url);
}

export function fetchPost<T>(url: string, body?: unknown) {
  return safeFetch<T>(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function fetchPut<T>(url: string, body?: unknown) {
  return safeFetch<T>(url, {
    method: 'PUT',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function fetchPatch<T>(url: string, body?: unknown) {
  return safeFetch<T>(url, {
    method: 'PATCH',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function fetchDelete<T>(url: string) {
  return safeFetch<T>(url, { method: 'DELETE' });
}
