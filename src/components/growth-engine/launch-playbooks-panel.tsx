"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  Rocket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  activateLaunchPlaybook,
  togglePlaybookStep,
  type LaunchPlaybookDTO,
} from "@/lib/actions/growth";

export function LaunchPlaybooksPanel({
  projectId,
  playbooks,
  onChange,
}: {
  projectId: string;
  playbooks: LaunchPlaybookDTO[];
  onChange: (playbooks: LaunchPlaybookDTO[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(
    playbooks.find((p) => p.status === "active")?.playbook_id ?? playbooks[0]?.playbook_id ?? null
  );
  const [isPending, startTransition] = useTransition();

  const activate = (playbookId: string) => {
    startTransition(async () => {
      try {
        const updated = await activateLaunchPlaybook(projectId, playbookId, {
          generateCopy: true,
        });
        onChange(
          playbooks.map((p) => (p.playbook_id === playbookId ? updated : p))
        );
        setExpanded(playbookId);
        toast.success(`${updated.name} activated with AI copy packs`);
      } catch {
        toast.error("Failed to activate playbook");
      }
    });
  };

  const toggleStep = (playbook: LaunchPlaybookDTO, stepId: string, done: boolean) => {
    startTransition(async () => {
      try {
        if (playbook.status === "idle") {
          await activateLaunchPlaybook(projectId, playbook.playbook_id, {
            generateCopy: true,
          });
        }
        await togglePlaybookStep(projectId, playbook.playbook_id, stepId, done);
        onChange(
          playbooks.map((p) => {
            if (p.playbook_id !== playbook.playbook_id) return p;
            return {
              ...p,
              status: "active",
              checklist: { ...p.checklist, [stepId]: done },
              steps: p.steps.map((s) => (s.id === stepId ? { ...s, done } : s)),
            };
          })
        );
      } catch {
        toast.error("Failed to update step");
      }
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Launch playbooks
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive checklists with AI copy packs — not just external links.
        </p>
      </div>

      <div className="space-y-3">
        {playbooks.map((playbook) => {
          const done = playbook.steps.filter((s) => s.done).length;
          const isOpen = expanded === playbook.playbook_id;
          return (
            <div key={playbook.playbook_id} className="rounded-xl border overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
                onClick={() =>
                  setExpanded(isOpen ? null : playbook.playbook_id)
                }
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{playbook.name}</p>
                    <Badge variant={playbook.status === "active" ? "default" : "outline"}>
                      {playbook.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {playbook.description}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {done}/{playbook.steps.length}
                </div>
              </button>

              {isOpen && (
                <div className="border-t px-4 pb-4 space-y-4">
                  <div className="flex flex-wrap gap-2 pt-3">
                    {playbook.status !== "active" && (
                      <Button
                        size="sm"
                        onClick={() => activate(playbook.playbook_id)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Rocket className="h-4 w-4 mr-1" />
                        )}
                        Activate + generate copy
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <a href={playbook.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Open site
                      </a>
                    </Button>
                    {playbook.launch_date && (
                      <Badge variant="secondary">
                        Launch {new Date(playbook.launch_date).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {playbook.steps.map((step) => {
                      const copy =
                        step.copyKey && playbook.copy_packs[step.copyKey]
                          ? playbook.copy_packs[step.copyKey]
                          : null;
                      return (
                        <li key={step.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => toggleStep(playbook, step.id, !step.done)}
                              className="mt-0.5"
                            >
                              {step.done ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1">
                              <p
                                className={`text-sm font-medium ${
                                  step.done ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Day {step.dayOffset >= 0 ? `+${step.dayOffset}` : step.dayOffset}:{" "}
                                {step.description}
                              </p>
                            </div>
                          </div>
                          {copy && (
                            <div className="rounded-md bg-muted/50 p-2 text-xs relative">
                              <p className="whitespace-pre-wrap pr-8">{copy}</p>
                              <button
                                type="button"
                                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                                onClick={() => copyText(copy)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
