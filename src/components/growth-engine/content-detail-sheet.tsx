"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  deleteContentItem,
  fanOutContent,
  generateContentAbVariants,
  rewriteContentWithBrandVoice,
  suggestContentHashtags,
  updateContentItem,
  type ContentItemDTO,
} from "@/lib/actions/growth";

const STATUSES = ["draft", "scheduled", "published"] as const;
const CHANNELS = ["blog", "twitter", "linkedin", "newsletter", "video", "social"];

export function ContentDetailSheet({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onFanOutCreated,
}: {
  item: ContentItemDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (item: ContentItemDTO) => void;
  onDeleted: (id: string) => void;
  onFanOutCreated: (items: ContentItemDTO[]) => void;
}) {
  const [draft, setDraft] = useState<ContentItemDTO | null>(item);
  const [abVariants, setAbVariants] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(item);
    setAbVariants([]);
  }, [item]);

  if (!draft) return null;

  const save = (patch: Parameters<typeof updateContentItem>[1]) => {
    startTransition(async () => {
      try {
        const updated = await updateContentItem(draft.id, patch);
        setDraft(updated);
        onUpdated(updated);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-3 pb-2">
          <SheetTitle className="sr-only">Edit content</SheetTitle>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onBlur={() => {
              if (draft.title.trim() && draft.title !== item?.title) {
                save({ title: draft.title });
              }
            }}
            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={draft.status}
              onValueChange={(status) => {
                setDraft({ ...draft, status: status as ContentItemDTO["status"] });
                save({ status });
              }}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={draft.channel ?? draft.type}
              onValueChange={(channel) => {
                setDraft({ ...draft, channel, type: channel });
                save({ channel, type: channel });
              }}
            >
              <SelectTrigger className="w-[130px] h-8">
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
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label>Schedule date</Label>
            <Input
              type="date"
              value={draft.scheduled_at ? draft.scheduled_at.slice(0, 10) : ""}
              onChange={(e) => {
                const scheduledAt = e.target.value
                  ? `${e.target.value}T12:00:00.000Z`
                  : null;
                setDraft({ ...draft, scheduled_at: scheduledAt });
                save({
                  scheduledAt,
                  status: scheduledAt ? "scheduled" : draft.status,
                });
              }}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              rows={10}
              value={draft.content_body ?? ""}
              onChange={(e) => setDraft({ ...draft, content_body: e.target.value })}
              onBlur={() => save({ contentBody: draft.content_body ?? "" })}
              placeholder="Write the full draft here..."
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Hashtags</Label>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const updated = await suggestContentHashtags(draft.id);
                      setDraft(updated);
                      onUpdated(updated);
                      toast.success("Hashtags suggested");
                    } catch {
                      toast.error("Failed to suggest hashtags");
                    }
                  })
                }
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Suggest
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {draft.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
              {draft.hashtags.length === 0 && (
                <p className="text-xs text-muted-foreground">No hashtags yet</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const created = await fanOutContent(draft.id);
                    onFanOutCreated(created);
                    toast.success(`Created ${created.length} channel variants`);
                  } catch {
                    toast.error("Fan-out failed");
                  }
                })
              }
            >
              <Copy className="h-4 w-4 mr-1" />
              Fan out to channels
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const updated = await rewriteContentWithBrandVoice(draft.id);
                    setDraft(updated);
                    onUpdated(updated);
                    toast.success("Rewritten in brand voice");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Rewrite failed");
                  }
                })
              }
            >
              <Wand2 className="h-4 w-4 mr-1" />
              Brand voice
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const variants = await generateContentAbVariants(draft.id);
                    setAbVariants(variants);
                  } catch {
                    toast.error("A/B variants failed");
                  }
                })
              }
            >
              A/B titles
            </Button>
          </div>

          {abVariants.length > 0 && (
            <div className="space-y-2">
              <Label>Title variants — click to apply</Label>
              {abVariants.map((variant) => (
                <button
                  key={variant}
                  type="button"
                  className="block w-full text-left text-sm rounded-lg border p-2 hover:bg-muted/50"
                  onClick={() => {
                    setDraft({ ...draft, title: variant });
                    save({ title: variant });
                  }}
                >
                  {variant}
                </button>
              ))}
            </div>
          )}

          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Delete this content item?")) return;
              startTransition(async () => {
                try {
                  await deleteContentItem(draft.id);
                  onDeleted(draft.id);
                  onOpenChange(false);
                  toast.success("Deleted");
                } catch {
                  toast.error("Delete failed");
                }
              });
            }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
