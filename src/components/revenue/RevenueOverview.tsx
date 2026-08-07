'use client';

import { TrendingUp, Users, CreditCard, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface RevenueOverviewProps {
  stats: {
    mrr: number;
    totalRevenue: number;
    activeSubscriptions: number;
  };
}

export function RevenueOverview({ stats }: RevenueOverviewProps) {
  const cards = [
    {
      title: 'Monthly Recurring Revenue',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.mrr),
      icon: <TrendingUp className="w-4 h-4 text-[hsl(var(--os-cyan))]" />,
      description: 'Active subscription revenue',
    },
    {
      title: 'Total Revenue',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRevenue),
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
      description: 'All-time processed payments',
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions.toString(),
      icon: <Users className="w-4 h-4 text-blue-500" />,
      description: 'Paying customers',
    },
    {
      title: 'Average Revenue Per User',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        stats.activeSubscriptions > 0 ? stats.mrr / stats.activeSubscriptions : 0
      ),
      icon: <CreditCard className="w-4 h-4 text-purple-500" />,
      description: 'Based on current MRR',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="p-6 bg-secondary/20 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-secondary">
              {card.icon}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{card.value}</h3>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
