"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  CalendarPlus,
  CheckCircle2,
  Circle,
  Copy,
  Loader2,
  Megaphone,
  Plus,
  Sparkles,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { cn } from "@/lib/utils";
import {
  createCampaign,
  createLaunchCampaignPack,
  deleteCampaign,
  generateCampaignAssets,
  pushCampaignAssetsToCalendar,
  updateCampaign,
  updateCampaignAsset,
  type CampaignAssetDTO,
  type CampaignDTO,
} from "@/lib/actions/campaigns";

const CAMPAIGN_TYPES = [
  { value: "launch", label: "Product launch" },
  { value: "feature", label: "Feature ship" },
  { value: "content", label: "Content push" },
  { value: "outreach", label: "Outreach / first users" },
  { value: "ads", label: "Paid ads" },
  { value: "retention", label: "Retention / lifecycle" },
] as const;

const CHANNEL_OPTIONS = [
  "product-hunt",
  "hacker-news",
  "reddit",
  "linkedin",
  "twitter",
  "newsletter",
  "indie-hackers",
  "ads",
  "seo",
  "outreach",
];

function assetDayLabel(startsAt: string | null, dayOffset: number) {
  if (!startsAt) return `Day ${dayOffset}`;
  return format(addDays(new Date(startsAt), dayOffset), "MMM d");
}

function CampaignAssetCard({
  asset,
  startsAt,
  onUpdate,
}: {
  asset: CampaignAssetDTO;
  startsAt: string | null;
  onUpdate: (asset: CampaignAssetDTO) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(asset.body);
  const [isPending, startTransition] = useTransition();

  const copy = async () => {
    await navigator.clipboard.writeText(asset.body);
    startTransition(async () => {
      const updated = await updateCampaignAsset(asset.id, { status: "copied" });
      onUpdate(updated);
      toast.success("Copied — paste into the channel");
    });
  };

  const markPublished = () => {
    startTransition(async () => {
      const updated = await updateCampaignAsset(asset.id, {
        status: "published",
      });
      onUpdate(updated);
      toast.success("Marked published");
    });
  };

  const saveBody = () => {
    startTransition(async () => {
      const updated = await updateCampaignAsset(asset.id, { body });
      onUpdate(updated);
      setEditing(false);
      toast.success("Asset saved");
    });
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{asset.title}</p>
            <Badge variant="outline" className="capitalize text-[10px]">
              {asset.channel}
            </Badge>
            <Badge variant="secondary" className="capitalize text-[10px]">
              {asset.asset_type}
            </Badge>
            <Badge
              variant={asset.status === "published" ? "default" : "outline"}
              className="capitalize text-[10px]"
            >
              {asset.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {assetDayLabel(startsAt, asset.day_offset)} · day {asset.day_offset}
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={copy} disabled={isPending}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
          {asset.status !== "published" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={markPublished}
              disabled={isPending}
            >
              Published
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
          <Button size="sm" onClick={saveBody} disabled={isPending}>
            Save
          </Button>
        </div>
      ) : (
        <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/40 rounded-md p-2 max-h-40 overflow-auto">
          {asset.body}
        </pre>
      )}
    </div>
  );
}

function CampaignDetail({
  campaign,
  onBack,
  onChange,
}: {
  campaign: CampaignDTO;
  onBack: () => void;
  onChange: (c: CampaignDTO) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const checklistDone = campaign.checklist.filter((c) => c.done).length;
  const checklistTotal = campaign.checklist.length;
  const checklistPct =
    checklistTotal > 0
      ? Math.round((checklistDone / checklistTotal) * 100)
      : 0;

  const byDay = useMemo(() => {
    const map = new Map<number, CampaignAssetDTO[]>();
    for (const asset of campaign.assets) {
      const list = map.get(asset.day_offset) ?? [];
      list.push(asset);
      map.set(asset.day_offset, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [campaign.assets]);

  const generate = () => {
    startTransition(async () => {
      try {
        const updated = await generateCampaignAssets(campaign.id);
        onChange(updated);
        toast.success(
          `Generated ${updated.assets.length} channel-native assets`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Generation failed");
      }
    });
  };

  const pushCalendar = () => {
    startTransition(async () => {
      try {
        const { created } = await pushCampaignAssetsToCalendar(campaign.id);
        toast.success(`Added ${created} drafts to content calendar`);
      } catch {
        toast.error("Failed to push to calendar");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button size="sm" variant="ghost" className="-ml-2 mb-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            All campaigns
          </Button>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {campaign.title}
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="capitalize">
              {campaign.campaign_type}
            </Badge>
            <Select
              value={campaign.status}
              onValueChange={(status) =>
                startTransition(async () => {
                  const updated = await updateCampaign(campaign.id, { status });
                  onChange(updated);
                })
              }
            >
              <SelectTrigger className="h-7 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["draft", "active", "paused", "completed"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {campaign.channels.map((ch) => (
              <Badge key={ch} variant="secondary" className="text-[10px]">
                {ch}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={generate} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {campaign.assets.length ? "Regenerate pack" : "Generate AI pack"}
          </Button>
          {campaign.assets.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={pushCalendar}
              disabled={isPending}
            >
              <CalendarPlus className="h-4 w-4 mr-1" />
              Push to calendar
            </Button>
          )}
        </div>
      </div>

      {/* Positioning */}
      {campaign.positioning && (
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Positioning
          </p>
          <p className="text-base font-medium">{campaign.positioning.tagline}</p>
          <p className="text-sm text-muted-foreground">
            {campaign.positioning.oneLiner}
          </p>
          {campaign.positioning.angles.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {campaign.positioning.angles.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Brief */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground mb-1">Goal</p>
          <p className="text-sm">{campaign.goal || "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground mb-1">Audience</p>
          <p className="text-sm">{campaign.audience || "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground mb-1">Offer</p>
          <p className="text-sm">{campaign.offer || "—"}</p>
        </div>
      </div>

      {/* Checklist */}
      {campaign.checklist.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Launch checklist</h4>
            <span className="text-xs text-muted-foreground">
              {checklistDone}/{checklistTotal}
            </span>
          </div>
          <Progress value={checklistPct} className="h-1.5" />
          <ul className="space-y-1.5">
            {campaign.checklist.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  onClick={() =>
                    startTransition(async () => {
                      const checklist = campaign.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: !c.done } : c
                      );
                      const updated = await updateCampaign(campaign.id, {
                        checklist,
                      });
                      onChange(updated);
                    })
                  }
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={cn(item.done && "line-through text-muted-foreground")}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics */}
      <div className="rounded-xl border p-4 space-y-3">
        <h4 className="text-sm font-semibold">Performance</h4>
        <p className="text-xs text-muted-foreground">
          Log results manually — matches how most solopreneur tools track until
          ads APIs are connected.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ["impressions", "Impressions"],
              ["clicks", "Clicks"],
              ["signups", "Signups"],
              ["conversions", "Conversions"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input
                type="number"
                min={0}
                defaultValue={campaign.metrics[key]}
                className="h-8 mt-1"
                onBlur={(e) => {
                  const value = Number(e.target.value) || 0;
                  if (value === campaign.metrics[key]) return;
                  startTransition(async () => {
                    const updated = await updateCampaign(campaign.id, {
                      metrics: { [key]: value },
                    });
                    onChange(updated);
                  });
                }}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Budget ($)</label>
            <Input
              type="number"
              min={0}
              defaultValue={campaign.budget}
              className="h-8 mt-1"
              onBlur={(e) => {
                const budget = Number(e.target.value) || 0;
                if (budget === campaign.budget) return;
                startTransition(async () => {
                  onChange(await updateCampaign(campaign.id, { budget }));
                });
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Spent ($)</label>
            <Input
              type="number"
              min={0}
              defaultValue={campaign.spent}
              className="h-8 mt-1"
              onBlur={(e) => {
                const spent = Number(e.target.value) || 0;
                if (spent === campaign.spent) return;
                startTransition(async () => {
                  onChange(await updateCampaign(campaign.id, { spent }));
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Timeline assets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            Sequence ({campaign.asset_stats.total} assets ·{" "}
            {campaign.asset_stats.published} published)
          </h4>
        </div>
        {campaign.assets.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No assets yet. Generate a RocketSeq-style pack: PH, HN, Reddit,
              LinkedIn, X, email, ads, and outreach — sequenced over ~14 days.
            </p>
            <Button onClick={generate} disabled={isPending}>
              <Sparkles className="h-4 w-4 mr-1" />
              Generate campaign pack
            </Button>
          </div>
        ) : (
          byDay.map(([day, assets]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {assetDayLabel(campaign.starts_at, day)} · Day {day}
              </p>
              {assets.map((asset) => (
                <CampaignAssetCard
                  key={asset.id}
                  asset={asset}
                  startsAt={campaign.starts_at}
                  onUpdate={(updated) =>
                    onChange({
                      ...campaign,
                      assets: campaign.assets.map((a) =>
                        a.id === updated.id ? updated : a
                      ),
                    })
                  }
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CampaignsPanel({
  projectId,
  campaigns,
  onChange,
}: {
  projectId: string;
  campaigns: CampaignDTO[];
  onChange: (campaigns: CampaignDTO[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [campaignType, setCampaignType] = useState("launch");
  const [goal, setGoal] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        onBack={() => setSelectedId(null)}
        onChange={(updated) => {
          onChange(campaigns.map((c) => (c.id === updated.id ? updated : c)));
        }}
      />
    );
  }

  const createBlank = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        const created = await createCampaign(projectId, {
          title,
          campaignType: campaignType as
            | "launch"
            | "feature"
            | "content"
            | "outreach"
            | "ads"
            | "retention",
          goal: goal || undefined,
          channels: CHANNEL_OPTIONS.slice(0, 6),
        });
        onChange([created, ...campaigns]);
        setTitle("");
        setGoal("");
        setSelectedId(created.id);
        toast.success("Campaign created — generate the AI pack next");
      } catch {
        toast.error("Failed to create campaign");
      }
    });
  };

  const createWithPack = () => {
    startTransition(async () => {
      try {
        const created = await createLaunchCampaignPack(projectId, {
          title: title.trim() || undefined,
        });
        onChange([created, ...campaigns]);
        setTitle("");
        setSelectedId(created.id);
        toast.success(
          `Launch pack ready — ${created.assets.length} assets across ${created.channels.length} channels`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Pack generation failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Campaigns</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-channel launch packs with day-by-day copy, checklists, and
          performance tracking — built to match indie GTM tools like RocketSeq
          and StartKitz.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Campaign name (optional for AI pack)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-sm"
            disabled={isPending}
          />
          <Select value={campaignType} onValueChange={setCampaignType}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder="Goal / offer (optional) — e.g. 50 waitlist signups from PH + Reddit"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          disabled={isPending}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={createWithPack} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate full launch pack
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={createBlank}
            disabled={isPending || !title.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Blank campaign
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {campaigns.map((c) => {
          const done = c.checklist.filter((x) => x.done).length;
          const total = c.checklist.length;
          return (
            <li key={c.id}>
              <div className="rounded-lg border p-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                <button
                  type="button"
                  className="text-left flex-1 min-w-0"
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{c.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {c.campaign_type}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.asset_stats.total} assets · {c.asset_stats.published}{" "}
                    published
                    {total > 0 ? ` · checklist ${done}/${total}` : ""}
                    {c.budget > 0
                      ? ` · $${c.spent}/$${c.budget}`
                      : ""}
                  </p>
                  {c.goal && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {c.goal}
                    </p>
                  )}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteCampaign(c.id);
                      onChange(campaigns.filter((x) => x.id !== c.id));
                      toast.success("Deleted");
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
        {campaigns.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Generate a full launch pack to get PH, HN,
              Reddit, LinkedIn, email, ads, and outreach in one click.
            </p>
            <HowDoILink section="growth-engine" />
          </div>
        )}
      </ul>
    </div>
  );
}
