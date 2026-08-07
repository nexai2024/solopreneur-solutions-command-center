/**
 * Canonical public origin for absolute links (webhooks, Stripe redirects, etc.).
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_APP_URL — unless it is localhost while NODE_ENV=production
 * 2. VERCEL_PROJECT_PRODUCTION_URL (stable prod host on Vercel)
 * 3. VERCEL_URL (current deployment host)
 * 4. http://localhost:3000 (local only)
 */
export function getAppUrl(): string {
  const explicit = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const inProduction = process.env.NODE_ENV === "production";

  if (explicit && !(inProduction && isLocalhostOrigin(explicit))) {
    return explicit;
  }

  const vercelProduction = normalizeOrigin(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  );
  if (vercelProduction) return vercelProduction;

  const vercelDeployment = normalizeOrigin(process.env.VERCEL_URL);
  if (vercelDeployment) return vercelDeployment;

  return explicit ?? "http://localhost:3000";
}

function normalizeOrigin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const withProtocol = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
