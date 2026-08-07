'use client';

import { RevenueSubscription } from '@/lib/revenue';
import { Badge } from '@/components/ui/badge';

interface SubscriptionTableProps {
  subscriptions: RevenueSubscription[];
}

export function SubscriptionTable({ subscriptions }: SubscriptionTableProps) {
  return (
    <div className="bg-secondary/10 rounded-xl border border-border overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/20 text-muted-foreground font-medium uppercase text-[10px] tracking-widest">
          <tr>
            <th className="px-6 py-4">Customer</th>
            <th className="px-6 py-4">Plan</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Period</th>
            <th className="px-6 py-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {subscriptions.length > 0 ? (
            subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-secondary/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{sub.customer?.name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{sub.customer?.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-foreground">{sub.plan?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: sub.plan?.currency || 'USD' }).format(sub.plan?.amount || 0)} / {sub.plan?.interval}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={sub.status === 'active' ? 'default' : 'secondary'}
                    className={sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}
                  >
                    {sub.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(sub.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                No subscriptions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
