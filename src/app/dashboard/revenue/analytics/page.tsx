import { AnalyticsDashboard } from "@/components/revenue/analytics-dashboard";
import { getRevenueData } from "@/lib/actions/revenue";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RevenueAnalyticsPage() {
  const data = await getRevenueData();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/revenue"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Revenue
        </Link>
        <h1 className="text-2xl font-bold">Revenue Analytics & Forecasting</h1>
        <p className="text-muted-foreground">
          MRR trends, churn analysis, and 6-month revenue projections.
        </p>
      </div>
      <AnalyticsDashboard
        subscriptions={data.subscriptions}
        transactions={data.transactions}
        plans={data.plans.map((p) => ({
          id: p.id,
          name: p.name,
          amount: p.amount,
          currency: p.currency,
          interval: p.interval,
        }))}
      />
    </div>
  );
}
