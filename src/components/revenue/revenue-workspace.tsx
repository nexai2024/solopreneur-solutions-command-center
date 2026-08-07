"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RevenueOverview } from "@/components/revenue/RevenueOverview";
import { SubscriptionTable } from "@/components/revenue/SubscriptionTable";
import { TransactionList } from "@/components/revenue/TransactionList";
import { CampaignSummary } from "@/components/revenue/CampaignSummary";
import { Button } from "@/components/ui/button";
import {
  createSampleRevenueData,
  createStripeCheckoutSession,
  type MarketingCampaignDTO,
  type RevenueSubscriptionDTO,
  type RevenueTransactionDTO,
} from "@/lib/actions/revenue";
import { HowDoILink } from "@/components/help/how-do-i-link";

export function RevenueWorkspace({
  stats,
  subscriptions,
  transactions,
  campaigns,
  plans,
}: {
  stats: { mrr: number; totalRevenue: number; activeSubscriptions: number };
  subscriptions: RevenueSubscriptionDTO[];
  transactions: RevenueTransactionDTO[];
  campaigns: MarketingCampaignDTO[];
  plans: Array<{ id: string; name: string; amount: number; currency: string; interval: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSeed = () => {
    startTransition(async () => {
      try {
        const result = await createSampleRevenueData();
        if (result.created) {
          toast.success("Sample revenue data created");
          window.location.reload();
        } else {
          toast.info("Revenue data already exists");
        }
      } catch {
        toast.error("Failed to create sample data");
      }
    });
  };

  const handleCheckout = (planId: string) => {
    startTransition(async () => {
      try {
        const { url } = await createStripeCheckoutSession(planId);
        if (url) window.location.href = url;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Checkout failed");
      }
    });
  };

  const isEmpty =
    subscriptions.length === 0 &&
    transactions.length === 0 &&
    campaigns.length === 0;

  return (
    <div className="space-y-8">
      {isEmpty && (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No revenue data yet. Seed sample data or connect Stripe to track MRR.
          </p>
          <HowDoILink section="revenue" className="justify-center" />
          <Button onClick={handleSeed} disabled={isPending}>
            Load sample data
          </Button>
        </div>
      )}

      <RevenueOverview stats={stats} />

      {plans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleCheckout(plan.id)}
            >
              Subscribe to {plan.name} (${plan.amount}/{plan.interval})
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-4">Subscriptions</h2>
          <SubscriptionTable subscriptions={subscriptions} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Transactions</h2>
          <TransactionList transactions={transactions} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Marketing Campaigns</h2>
        <CampaignSummary campaigns={campaigns} />
      </div>
    </div>
  );
}
