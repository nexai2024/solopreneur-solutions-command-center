"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBrandVoice, type BrandVoiceDTO } from "@/lib/actions/growth";

export function BrandVoicePanel({
  projectId,
  initial,
}: {
  projectId: string;
  initial: BrandVoiceDTO;
}) {
  const [tone, setTone] = useState(initial.tone.join(", "));
  const [avoid, setAvoid] = useState(initial.avoid.join(", "));
  const [audience, setAudience] = useState(initial.audience ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await updateBrandVoice(projectId, {
          tone: tone
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          avoid: avoid
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          audience: audience.trim() || null,
        });
        toast.success("Brand voice saved");
      } catch {
        toast.error("Failed to save brand voice");
      }
    });
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Brand voice</h4>
        <p className="text-xs text-muted-foreground">
          Used for rewrites, fan-out, and coach context.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Tone keywords</Label>
          <Input
            placeholder="clear, honest, practical"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Avoid</Label>
          <Input
            placeholder="hype, revolutionize, synergy"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Audience</Label>
        <Input
          placeholder="solopreneurs shipping B2B tools"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={isPending}
        />
      </div>
      <Button size="sm" onClick={save} disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-1" />
        )}
        Save voice
      </Button>
    </div>
  );
}
