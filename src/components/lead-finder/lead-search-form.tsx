'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface LeadSearchFormProps {
  onSearch: (niche: string) => Promise<void>;
  isLoading: boolean;
}

export function LeadSearchForm({ onSearch, isLoading }: LeadSearchFormProps) {
  const [niche, setNiche] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || isLoading) return;
    await onSearch(niche);
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Niche (e.g. 'SaaS for real estate agents')"
          className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--os-cyan)/0.5)] transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !niche.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan)/0.9)] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Mining posts...
            </>
          ) : (
            'Find posts'
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Finds communities, pulls live Reddit/HN posts, then flags relevant users + threads for your niche.
      </p>
    </form>
  );
}
