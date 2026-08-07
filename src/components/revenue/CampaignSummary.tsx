'use client';

import { MarketingCampaign } from '@/lib/revenue';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ExternalLink } from 'lucide-react';

interface CampaignSummaryProps {
  campaigns: MarketingCampaign[];
}

export function CampaignSummary({ campaigns }: CampaignSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {campaigns.length > 0 ? (
        campaigns.map((campaign) => (
          <div key={campaign.id} className="p-5 bg-secondary/10 border border-border rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Megaphone className="w-4 h-4 text-[hsl(var(--os-cyan))]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{campaign.name}</h4>
                  <p className="text-xs text-muted-foreground uppercase tracking-tight">{campaign.platform || 'General'}</p>
                </div>
              </div>
              <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                {campaign.status}
              </Badge>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Budget</p>
                <p className="text-lg font-bold text-foreground">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(campaign.budget)}
                </p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--os-cyan))] hover:underline">
                View Details
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full py-12 text-center bg-secondary/5 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No marketing campaigns created yet.</p>
        </div>
      )}
    </div>
  );
}
