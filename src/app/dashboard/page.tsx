import { getDashboardStats, getProjectTimelines } from "@/lib/actions/dashboard";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, timelines] = await Promise.all([
    getDashboardStats(),
    getProjectTimelines(),
  ]);

  return <DashboardWorkspace stats={stats} timelines={timelines} />;
}
