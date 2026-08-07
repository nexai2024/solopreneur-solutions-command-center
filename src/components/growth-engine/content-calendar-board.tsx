"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addDays,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from "date-fns";
import { CalendarDays, Loader2, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addContentItem,
  generateContentForProject,
  getContentItems,
  planCalendarForProject,
  type ContentItemDTO,
} from "@/lib/actions/growth";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { ContentDetailSheet } from "@/components/growth-engine/content-detail-sheet";

function buildMonthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function ContentCalendarBoard({
  projectId,
  items,
  onItemsChange,
}: {
  projectId: string;
  items: ContentItemDTO[];
  onItemsChange: (items: ContentItemDTO[]) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<ContentItemDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => buildMonthGrid(month), [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, ContentItemDTO[]>();
    for (const item of items) {
      if (!item.scheduled_at) continue;
      const key = item.scheduled_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const unscheduled = items.filter((i) => !i.scheduled_at);

  const openItem = (item: ContentItemDTO) => {
    setSelected(item);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Quick add draft..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="max-w-xs"
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !newTitle.trim()) return;
            startTransition(async () => {
              try {
                const created = await addContentItem(projectId, {
                  title: newTitle,
                  type: "blog",
                  channel: "blog",
                });
                onItemsChange([created, ...items]);
                setNewTitle("");
                openItem(created);
              } catch {
                toast.error("Failed to add");
              }
            });
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const n = await generateContentForProject(projectId);
                onItemsChange(await getContentItems(projectId));
                toast.success(`Generated ${n} ideas`);
              } catch {
                toast.error("Generate failed");
              }
            })
          }
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          AI ideas
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const n = await planCalendarForProject(projectId, 2);
                onItemsChange(await getContentItems(projectId));
                toast.success(`Planned ${n} calendar entries`);
              } catch {
                toast.error("Calendar plan failed");
              }
            })
          }
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          Plan 2 weeks
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{format(month, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMonth(startOfMonth(addDays(month, -15)))}
          >
            Prev
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMonth(startOfMonth(addDays(month, 45)))}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-muted-foreground px-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={`min-h-[88px] rounded-lg border p-1.5 ${
                inMonth ? "bg-card" : "bg-muted/20 opacity-60"
              } ${today ? "border-primary" : "border-border"}`}
            >
              <p className="text-[11px] font-medium mb-1 px-0.5">{format(day, "d")}</p>
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className="w-full text-left text-[10px] leading-tight rounded px-1 py-0.5 bg-primary/10 hover:bg-primary/20 truncate"
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{dayItems.length - 3}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Unscheduled drafts ({unscheduled.length})</h4>
          <ul className="space-y-2">
            {unscheduled.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="capitalize">
                        {item.channel ?? item.type}
                      </Badge>
                      <Badge variant="secondary">{item.status}</Badge>
                    </div>
                  </div>
                  {item.content_body && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.content_body}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground space-y-2">
          <Plus className="h-5 w-5 mx-auto mb-2 opacity-50" />
          <p>No content yet. Generate ideas or plan a 2-week calendar.</p>
          <HowDoILink section="growth-engine" className="justify-center" />
        </div>
      )}

      <ContentDetailSheet
        item={selected}
        open={open}
        onOpenChange={setOpen}
        onUpdated={(updated) => {
          onItemsChange(items.map((i) => (i.id === updated.id ? updated : i)));
          setSelected(updated);
        }}
        onDeleted={(id) => {
          onItemsChange(items.filter((i) => i.id !== id));
          setSelected(null);
        }}
        onFanOutCreated={(created) => {
          onItemsChange([...created, ...items]);
        }}
      />
    </div>
  );
}
