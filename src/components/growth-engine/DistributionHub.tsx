'use client';

import { ExternalLink, CheckCircle2, MessageSquare, Twitter, Globe, Share2 } from 'lucide-react';

const CHANNELS = [
  {
    name: 'Reddit',
    description: 'Post in relevant subreddits (r/sideproject, r/indiehackers).',
    icon: <MessageSquare className="w-4 h-4 text-orange-500" />,
    link: 'https://reddit.com',
  },
  {
    name: 'Product Hunt',
    description: 'Launch and engage with the community.',
    icon: <Globe className="w-4 h-4 text-orange-600" />,
    link: 'https://producthunt.com',
  },
  {
    name: 'Twitter / X',
    description: 'Build in public and share updates.',
    icon: <Twitter className="w-4 h-4 text-sky-500" />,
    link: 'https://twitter.com',
  },
  {
    name: 'Indie Hackers',
    description: 'Share milestones and get feedback.',
    icon: <Share2 className="w-4 h-4 text-blue-500" />,
    link: 'https://indiehackers.com',
  },
];

export function DistributionHub() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Distribution Hub</h3>
        <p className="text-sm text-muted-foreground">Manage your reach across different channels.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map((channel) => (
          <div key={channel.name} className="p-4 bg-card border border-border rounded-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
              {channel.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-foreground">{channel.name}</h4>
                <a
                  href={channel.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[hsl(var(--os-cyan))] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {channel.description}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button className="text-[10px] uppercase tracking-wider font-bold text-[hsl(var(--os-cyan))] bg-[hsl(var(--os-cyan)/0.1)] px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[hsl(var(--os-cyan)/0.05)] border border-[hsl(var(--os-cyan)/0.1)] rounded-xl">
        <h4 className="text-sm font-semibold text-foreground mb-2">Distribution Checklist</h4>
        <div className="space-y-2">
          {[
            'Optimize landing page for target keywords',
            'Submit to niche directories',
            'Answer 3 relevant questions on Quora/Reddit',
            'Share project milestone on social media',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-[hsl(var(--os-cyan))] rounded-full opacity-0" />
              </div>
              <span className="text-xs text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
