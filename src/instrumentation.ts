/** Optional instrumentation hook — add Sentry when @sentry/nextjs supports your Next.js version. */
export async function register() {
  if (process.env.SENTRY_DSN) {
    console.info(
      JSON.stringify({
        level: "info",
        message: "SENTRY_DSN set — install @sentry/nextjs when peer deps support your Next version",
      })
    );
  }
}
