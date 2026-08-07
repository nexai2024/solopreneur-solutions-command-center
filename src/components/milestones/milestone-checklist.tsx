"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, isPast } from "date-fns";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleMilestoneComplete } from "@/lib/actions/milestones";
import { cn } from "@/lib/utils";
import { HowDoILink } from "@/components/help/how-do-i-link";

export type MilestoneItem = {
  id: string;
  title: string;
  targetDate: string;
  isCompleted: boolean;
};

export function MilestoneChecklist({
  milestones,
  compact = false,
}: {
  milestones: MilestoneItem[];
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
    startTransition(async () => {
      try {
        await toggleMilestoneComplete(id, !current);
        router.refresh();
      } catch {
        toast.error("Failed to update milestone");
      }
    });
  };

  return (
    <ul className={cn("space-y-2", compact && "space-y-1.5")}>
      {milestones.map((milestone) => {
        const overdue =
          !milestone.isCompleted && isPast(new Date(milestone.targetDate));

        return (
          <li key={milestone.id}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleToggle(milestone.id, milestone.isCompleted)}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50",
                compact && "p-2",
                milestone.isCompleted && "opacity-70"
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mt-0.5 animate-spin shrink-0 text-muted-foreground" />
              ) : milestone.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
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
                    "text-xs mt-0.5",
                    overdue ? "text-rose-500" : "text-muted-foreground"
                  )}
                >
                  {format(new Date(milestone.targetDate), "MMM d, yyyy")}
                  {overdue ? " · overdue" : ""}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
