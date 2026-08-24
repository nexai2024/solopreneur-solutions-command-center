/**
 * Canonical form for lead URLs so the same post isn't stored twice
 * (trailing slash, hash, whitespace variants).
 */
export function normalizeLeadUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    const fallback = trimmed.replace(/\/+$/, "");
    return fallback || null;
  }
}
