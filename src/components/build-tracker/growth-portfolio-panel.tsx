"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  generateAndSavePortfolio,
  getPortfolioSettings,
  updatePortfolioSettings,
  type PortfolioSettingsDTO,
} from "@/lib/actions/portfolio";
import {
  generateEarlyAccessCopy,
  getEarlyAccessSettings,
  updateEarlyAccessSettings,
  type EarlyAccessSettingsDTO,
} from "@/lib/actions/early-access";

export function GrowthAndPortfolioPanel({ projectId }: { projectId: string }) {
  const [portfolio, setPortfolio] = useState<PortfolioSettingsDTO | null>(null);
  const [early, setEarly] = useState<EarlyAccessSettingsDTO | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, e] = await Promise.all([
          getPortfolioSettings(),
          getEarlyAccessSettings(projectId),
        ]);
        if (!cancelled) {
          setPortfolio(p);
          setEarly(e);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load growth settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading || !portfolio || !early) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h3 className="text-sm font-semibold">Founder portfolio</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-polished overview of all your apps for VCs, sponsors, and partners.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="portfolio-public">Public portfolio</Label>
          <Switch
            id="portfolio-public"
            checked={portfolio.portfolio_public}
            disabled={pending}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                try {
                  const next = await updatePortfolioSettings({
                    portfolioPublic: checked,
                    portfolioSlug:
                      portfolio.portfolio_slug || undefined,
                  });
                  setPortfolio(next);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Update failed"
                  );
                }
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={portfolio.portfolio_slug ?? ""}
            onChange={(e) =>
              setPortfolio((p) =>
                p ? { ...p, portfolio_slug: e.target.value } : p
              )
            }
            placeholder="your-name"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const next = await updatePortfolioSettings({
                    portfolioSlug: portfolio.portfolio_slug || undefined,
                    portfolioPublic: portfolio.portfolio_public,
                    portfolioHeadline: portfolio.portfolio_headline,
                    portfolioBio: portfolio.portfolio_bio,
                  });
                  setPortfolio(next);
                  toast.success("Portfolio settings saved");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Save failed"
                  );
                }
              })
            }
          >
            Save settings
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const next = await generateAndSavePortfolio();
                  setPortfolio(next);
                  toast.success("Portfolio generated with AI");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Generate failed"
                  );
                }
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate portfolio
          </Button>
          {portfolio.public_url && (
            <>
              <Button size="sm" variant="outline" asChild>
                <a href={portfolio.public_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(portfolio.public_url!);
                  toast.success("Portfolio link copied");
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy link
              </Button>
            </>
          )}
        </div>
        {(portfolio.portfolio_headline || portfolio.portfolio_bio) && (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1">
            {portfolio.portfolio_headline && (
              <p className="font-medium">{portfolio.portfolio_headline}</p>
            )}
            {portfolio.portfolio_bio && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {portfolio.portfolio_bio}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h3 className="text-sm font-semibold">Early access landing</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Public waitlist page for this project — emails become leads in Lead Finder.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="early-enabled">Enable early access page</Label>
          <Switch
            id="early-enabled"
            checked={early.enabled}
            disabled={pending}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                try {
                  const next = await updateEarlyAccessSettings(projectId, {
                    enabled: checked,
                    slug: early.slug || undefined,
                  });
                  setEarly(next);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Update failed"
                  );
                }
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={early.slug ?? ""}
            onChange={(e) =>
              setEarly((s) => (s ? { ...s, slug: e.target.value } : s))
            }
            placeholder="acme-copilot"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Headline</Label>
          <Input
            value={early.headline ?? ""}
            onChange={(e) =>
              setEarly((s) => (s ? { ...s, headline: e.target.value } : s))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <Textarea
            value={early.body ?? ""}
            onChange={(e) =>
              setEarly((s) => (s ? { ...s, body: e.target.value } : s))
            }
            rows={3}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const next = await updateEarlyAccessSettings(projectId, {
                    enabled: early.enabled,
                    slug: early.slug || undefined,
                    headline: early.headline,
                    body: early.body,
                  });
                  setEarly(next);
                  toast.success("Early access page saved");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Save failed"
                  );
                }
              })
            }
          >
            Save page
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const next = await generateEarlyAccessCopy(projectId);
                  setEarly(next);
                  toast.success("Early access copy generated");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Generate failed"
                  );
                }
              })
            }
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Generate with AI
          </Button>
          {early.public_url && (
            <>
              <Button size="sm" variant="outline" asChild>
                <a href={early.public_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open page
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(early.public_url!);
                  toast.success("Early access link copied");
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy link
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
