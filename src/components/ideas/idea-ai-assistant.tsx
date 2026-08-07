"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  generateIdeaSuggestions,
  createIdeasFromSuggestions,
  enhanceIdeaDraft,
} from "@/lib/actions/ideas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wand2, Plus } from "lucide-react";

type Suggestion = {
  title: string;
  description: string;
  targetUser: string;
  monetization: string;
};

interface IdeaAIAssistantProps {
  onIdeasCreated?: (ideas: Array<{ id: string; title: string; description: string }>) => void;
  draftTitle?: string;
  draftDescription?: string;
  onEnhanceDraft?: (title: string, description: string) => void;
}

export function IdeaAIAssistant({
  onIdeasCreated,
  draftTitle = "",
  draftDescription = "",
  onEnhanceDraft,
}: IdeaAIAssistantProps) {
  const [niche, setNiche] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!niche.trim()) {
      toast.error("Enter a niche or topic");
      return;
    }
    startTransition(async () => {
      try {
        const ideas = await generateIdeaSuggestions(niche.trim(), 5);
        setSuggestions(ideas);
        setSelected(new Set(ideas.map((_, i) => i)));
        toast.success(`Generated ${ideas.length} ideas`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Generation failed");
      }
    });
  };

  const handleEnhanceDraft = () => {
    if (!draftTitle.trim()) {
      toast.error("Enter a title to enhance");
      return;
    }
    startTransition(async () => {
      try {
        const enhanced = await enhanceIdeaDraft(draftTitle, draftDescription);
        onEnhanceDraft?.(enhanced.title, enhanced.description);
        toast.success("Description enhanced");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Enhancement failed");
      }
    });
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAddSelected = () => {
    const toAdd = suggestions.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) {
      toast.error("Select at least one idea");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createIdeasFromSuggestions(
          toAdd.map((s) => ({ title: s.title, description: s.description }))
        );
        onIdeasCreated?.(created);
        setSuggestions([]);
        setSelected(new Set());
        toast.success(`Added ${created.length} ideas`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add ideas");
      }
    });
  };

  return (
    <Card className="border-dashed border-[hsl(var(--os-cyan)/0.3)] bg-[hsl(var(--os-cyan)/0.02)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-[hsl(var(--os-cyan))]" />
          AI Idea Assistant
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Generate ideas from a niche, or enhance your draft before scoring.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Your niche (e.g. freelance designers, local gyms, indie hackers)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            disabled={isPending}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={isPending || !niche.trim()} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Generate
              </>
            )}
          </Button>
        </div>

        {onEnhanceDraft && draftTitle.trim() && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnhanceDraft}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Wand2 className="h-3 w-3 mr-1" />
            )}
            Enhance current draft with AI
          </Button>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {suggestions.length} suggestions — click to select
              </p>
              <Button size="sm" onClick={handleAddSelected} disabled={isPending || selected.size === 0}>
                <Plus className="h-3 w-3 mr-1" />
                Add {selected.size} selected
              </Button>
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleSelect(i)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected.has(i)
                    ? "border-[hsl(var(--os-cyan)/0.5)] bg-[hsl(var(--os-cyan)/0.05)]"
                    : "border-border/50 bg-background/50 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{s.title}</span>
                  {selected.has(i) && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {s.targetUser}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {s.monetization}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
