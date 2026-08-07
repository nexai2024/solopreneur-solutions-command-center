"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HowDoILink } from "@/components/help/how-do-i-link";
import {
  createGrowthCampaign,
  deleteGrowthCampaign,
  updateGrowthCampaign,
  type GrowthCampaignDTO,
} from "@/lib/actions/growth";

const CHANNELS = [
  "product-hunt",
  "linkedin",
  "twitter",
  "newsletter",
  "reddit",
  "ads",
  "seo",
  "other",
];

export function CampaignsPanel({
  projectId,
  campaigns,
  onChange,
}: {
  projectId: string;
  campaigns: GrowthCampaignDTO[];
  onChange: (campaigns: GrowthCampaignDTO[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("linkedin");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const create = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        const created = await createGrowthCampaign(projectId, {
          title,
          channel,
          content,
        });
        onChange([created, ...campaigns]);
        setTitle("");
        setContent("");
        toast.success("Campaign created");
      } catch {
        toast.error("Failed to create campaign");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Campaigns</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Track launch and growth campaigns tied to this project.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Campaign name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-sm"
            disabled={isPending}
          />
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={create} disabled={isPending || !title.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add
          </Button>
        </div>
        <Textarea
          placeholder="Notes, offer, creative brief..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          disabled={isPending}
        />
      </div>

      <ul className="space-y-2">
        {campaigns.map((c) => (
          <li key={c.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{c.title}</p>
                <Badge variant="outline" className="capitalize">
                  {c.channel}
                </Badge>
                <Select
                  value={c.status}
                  onValueChange={(status) =>
                    startTransition(async () => {
                      await updateGrowthCampaign(c.id, { status });
                      onChange(
                        campaigns.map((x) => (x.id === c.id ? { ...x, status } : x))
                      );
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-[110px]">
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
              </div>
              {c.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.content}</p>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteGrowthCampaign(c.id);
                  onChange(campaigns.filter((x) => x.id !== c.id));
                  toast.success("Deleted");
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {campaigns.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No campaigns yet for this project.
            </p>
            <HowDoILink section="growth-engine" />
          </div>
        )}
      </ul>
    </div>
  );
}
