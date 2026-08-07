"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, Rocket, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  generateOrRefreshWeeklyPlan,
  toggleGrowthAction,
  type GrowthPlanDTO,
} from "@/lib/actions/growth";
import { HowDoILink } from "@/components/help/how-do-i-link";

const EFFORT_CLASS: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  high: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export function GrowthCoachPanel({
  projectId,
  plan,
  launchMode,
  onPlanChange,
}: {
  projectId: string;
  plan: GrowthPlanDTO | null;
  launchMode?: boolean;
  onPlanChange: (plan: GrowthPlanDTO) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      try {
        const next = await generateOrRefreshWeeklyPlan(projectId, {
          launchMode,
        });
        onPlanChange(next);
        toast.success(launchMode ? "Launch week plan ready" : "Weekly plan updated");
      } catch {
        toast.error("Failed to generate plan");
      }
    });
  };

  const toggle = (actionId: string, done: boolean) => {
    if (!plan) return;
    startTransition(async () => {
      try {
        const next = await toggleGrowthAction(plan.id, actionId, done);
        onPlanChange(next);
      } catch {
        toast.error("Failed to update action");
      }
    });
  };

  const doneCount = plan?.actions.filter((a) => a.done).length ?? 0;
  const total = plan?.actions.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {launchMode ? <Rocket className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            {launchMode ? "Launch week coach" : "This week's growth plan"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Concrete actions for non-marketers — approve, execute, check off.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={refresh} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          {plan ? "Regenerate" : "Generate plan"}
        </Button>
      </div>

      {!plan ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No plan yet. Generate a focused 5-action week from your project context.
          </p>
          <HowDoILink section="growth-engine" className="justify-center" />
          <Button onClick={refresh} disabled={isPending}>
            <Sparkles className="h-4 w-4 mr-1" />
            Create this week&apos;s plan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Strategy
              </p>
              <Badge variant="outline">
                {doneCount}/{total} done
              </Badge>
            </div>
            <p className="text-sm leading-relaxed">{plan.summary}</p>
          </div>

          <ul className="space-y-2">
            {plan.actions.map((action) => (
              <li
                key={action.id}
                className={`rounded-lg border p-3 transition-colors ${
                  action.done ? "bg-muted/40 opacity-80" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="mt-0.5 text-muted-foreground hover:text-foreground"
                    disabled={isPending}
                    onClick={() => toggle(action.id, !action.done)}
                    aria-label={action.done ? "Mark incomplete" : "Mark done"}
                  >
                    {action.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          action.done ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {action.title}
                      </p>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {action.channel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${EFFORT_CLASS[action.effort] ?? ""}`}
                      >
                        {action.effort}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{action.why}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
