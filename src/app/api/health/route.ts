import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await runHealthChecks();

  if (health.checks.database === "error") {
    logger.error("Health check DB failed", { route: "/api/health" });
  }

  return NextResponse.json(health, {
    status: health.status === "unhealthy" ? 503 : 200,
  });
}
