import { RevenueWorkspace } from "@/components/revenue/revenue-workspace";
import { getRevenueData } from "@/lib/actions/revenue";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const data = await getRevenueData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue & Analytics</h1>
        <p className="text-muted-foreground">
          Track recurring subscriptions, transactions, and marketing spend.
        </p>
      </div>
      <RevenueWorkspace
        stats={data.stats}
        subscriptions={data.subscriptions}
        transactions={data.transactions}
        campaigns={data.campaigns}
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
