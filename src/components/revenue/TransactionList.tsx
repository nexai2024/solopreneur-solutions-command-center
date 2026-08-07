'use client';

import { RevenueTransaction } from '@/lib/revenue';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface TransactionListProps {
  transactions: RevenueTransaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="space-y-4">
      {transactions.length > 0 ? (
        transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-4 bg-secondary/10 border border-border rounded-xl hover:bg-secondary/20 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                tx.type === 'payment' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
              }`}>
                {tx.type === 'payment' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {tx.customer?.email || 'Unknown Customer'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {tx.type} • {new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${tx.type === 'payment' ? 'text-foreground' : 'text-orange-500'}`}>
                {tx.type === 'payment' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency }).format(tx.amount)}
              </p>
              <Badge variant="outline" className="mt-1 text-[10px] uppercase h-5">
                {tx.status}
              </Badge>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 bg-secondary/5 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
        </div>
      )}
    </div>
  );
}
