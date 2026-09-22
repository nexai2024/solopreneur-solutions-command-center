"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProjectFeature,
  deleteProjectFeature,
  updateProjectFeature,
  type ProjectFeatureDTO,
} from "@/lib/actions/project-features";
import {
  FEATURE_CATEGORIES,
  type FeatureCategory,
} from "@/lib/project-features";

export function ProjectFeaturesPanel({
  projectId,
  initialFeatures,
  onTaskCreated,
}: {
  projectId: string;
  initialFeatures: ProjectFeatureDTO[];
  onTaskCreated?: () => void;
}) {
  const [features, setFeatures] = useState(initialFeatures);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FeatureCategory>("MVP");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFeatures(initialFeatures);
  }, [initialFeatures]);

  const grouped = useMemo(() => {
    const map = new Map<FeatureCategory, ProjectFeatureDTO[]>();
    for (const cat of FEATURE_CATEGORIES) map.set(cat, []);
    for (const f of features) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return map;
  }, [features]);

  const addFeature = () => {
    if (!title.trim()) {
      toast.error("Feature title is required");
      return;
    }
    startTransition(async () => {
      try {
        const { feature, taskId } = await createProjectFeature({
          projectId,
          title,
          description,
          category,
          createTask: true,
        });
        setFeatures((prev) => [...prev, feature]);
        setTitle("");
        setDescription("");
        if (taskId) onTaskCreated?.();
        toast.success(
          taskId
            ? `Feature added · task created on the board`
            : "Feature added"
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add feature");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Feature set</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Organize the product by MVP, Production, Planned, and Nice to have.
          Adding a feature automatically creates a linked task.
        </p>
      </div>

      <div className="rounded-xl border p-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Feature title"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addFeature()}
          />
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as FeatureCategory)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEATURE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={pending} onClick={addFeature}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description / acceptance notes"
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {FEATURE_CATEGORIES.map((cat) => {
          const items = grouped.get(cat) ?? [];
          return (
            <div key={cat} className="rounded-xl border">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <h4 className="text-sm font-medium">{cat}</h4>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="p-2 space-y-2 min-h-[4rem]">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1 py-3">
                    No {cat} features yet.
                  </p>
                ) : (
                  items.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg border bg-card px-3 py-2 space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{f.title}</div>
                          {f.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {f.description}
                            </p>
                          )}
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {f.status}
                            </Badge>
                            {f.task_count > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {f.task_count} task
                                {f.task_count === 1 ? "" : "s"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await deleteProjectFeature(f.id);
                                setFeatures((prev) =>
                                  prev.filter((x) => x.id !== f.id)
                                );
                                toast.success("Feature deleted");
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Delete failed"
                                );
                              }
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Select
                        value={f.category}
                        onValueChange={(v) =>
                          startTransition(async () => {
                            try {
                              const updated = await updateProjectFeature(f.id, {
                                category: v,
                              });
                              setFeatures((prev) =>
                                prev.map((x) =>
                                  x.id === f.id ? updated : x
                                )
                              );
                            } catch {
                              toast.error("Could not move feature");
                            }
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEATURE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              Move to {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
