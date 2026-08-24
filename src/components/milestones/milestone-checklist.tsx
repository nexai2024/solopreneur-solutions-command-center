"use client";

import { useEffect, useState, useTransition } from "react";
import { format, isPast } from "date-fns";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleMilestoneComplete } from "@/lib/actions/milestones";
import { cn } from "@/lib/utils";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { Progress } from "@/components/ui/progress";

export type MilestoneItem = {
  id: string;
  title: string;
  targetDate: string;
  isCompleted: boolean;
  /** Linked tasks that unlock this milestone */
  taskTotal?: number;
  taskDone?: number;
};

export function MilestoneChecklist({
  milestones: initialMilestones,
  compact = false,
  onMilestoneChange,
}: {
  milestones: MilestoneItem[];
  compact?: boolean;
  /** Optimistic parent sync (Build Tracker / Overview) */
  onMilestoneChange?: (
    milestoneId: string,
    patch: Partial<MilestoneItem>
  ) => void;
}) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  if (milestones.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No milestones yet — promote an idea to auto-generate a 30-day launch plan.
        </p>
        <HowDoILink section="build-tracker" />
      </div>
    );
  }

  const handleToggle = (id: string, current: boolean) => {
    const next = !current;
    const currentItem = milestones.find((m) => m.id === id);
    setPendingId(id);
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              isCompleted: next,
              taskDone: next ? (m.taskTotal ?? m.taskDone) : m.taskDone,
            }
          : m
      )
    );
    onMilestoneChange?.(id, {
      isCompleted: next,
      ...(next && currentItem?.taskTotal != null
        ? { taskDone: currentItem.taskTotal }
        : {}),
    });

    startTransition(async () => {
      try {
        await toggleMilestoneComplete(id, next);
      } catch {
        setMilestones((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isCompleted: current } : m))
        );
        onMilestoneChange?.(id, { isCompleted: current });
        toast.error("Failed to update milestone");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <ul className={cn("space-y-2", compact && "space-y-1.5")}>
      {milestones.map((milestone) => {
        const overdue =
          !milestone.isCompleted && isPast(new Date(milestone.targetDate));
        const total = milestone.taskTotal ?? 0;
        const done = milestone.taskDone ?? 0;
        const pct =
          total > 0
            ? Math.round((done / total) * 100)
            : milestone.isCompleted
              ? 100
              : 0;

        return (
          <li key={milestone.id}>
            <button
              type="button"
              disabled={pendingId === milestone.id}
              onClick={() => handleToggle(milestone.id, milestone.isCompleted)}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50",
                compact && "p-2",
                milestone.isCompleted && "opacity-70"
              )}
            >
              {pendingId === milestone.id ? (
                <Loader2 className="h-4 w-4 mt-0.5 animate-spin shrink-0 text-muted-foreground" />
              ) : milestone.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    milestone.isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {milestone.title}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    overdue ? "text-rose-500" : "text-muted-foreground"
                  )}
                >
                  {format(new Date(milestone.targetDate), "MMM d, yyyy")}
                  {overdue ? " · overdue" : ""}
                  {total > 0 ? ` · ${done}/${total} tasks` : ""}
                </p>
                {total > 0 && <Progress value={pct} className="h-1" />}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
