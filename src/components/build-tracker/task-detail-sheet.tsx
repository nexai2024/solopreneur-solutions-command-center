"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Copy,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  deleteTask,
  duplicateTask,
  updateTask,
} from "@/lib/actions/tasks";
import {
  type BoardTask,
  type ChecklistItem,
  type TaskPriority,
  type TaskStatus,
  KANBAN_COLUMNS,
  PRIORITY_CONFIG,
  TASK_PRIORITIES,
  checklistProgress,
  formatDueDate,
  isOverdue,
} from "@/lib/task-types";

function newChecklistId(): string {
  return `cl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  task: BoardTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: BoardTask) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [draft, setDraft] = useState<BoardTask | null>(task);
  const [labelInput, setLabelInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(task);
  }, [task]);

  if (!draft) return null;

  const progress = checklistProgress(draft.checklist);
  const overdue = isOverdue(draft.dueDate, draft.status);

  const save = (patch: Parameters<typeof updateTask>[1]) => {
    startTransition(async () => {
      try {
        const updated = await updateTask(draft.id, patch);
        setDraft(updated);
        onUpdated(updated);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save task");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      try {
        await deleteTask(draft.id);
        onDeleted(draft.id);
        onOpenChange(false);
        toast.success("Task deleted");
      } catch {
        toast.error("Failed to delete task");
      }
    });
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        const copy = await duplicateTask(draft.id);
        onUpdated(copy);
        toast.success("Task duplicated");
      } catch {
        toast.error("Failed to duplicate task");
      }
    });
  };

  const addLabel = () => {
    const value = labelInput.trim();
    if (!value || draft.labels.includes(value)) return;
    const labels = [...draft.labels, value];
    setLabelInput("");
    setDraft({ ...draft, labels });
    save({ labels });
  };

  const removeLabel = (label: string) => {
    const labels = draft.labels.filter((l) => l !== label);
    setDraft({ ...draft, labels });
    save({ labels });
  };

  const addChecklistItem = () => {
    const text = checklistInput.trim();
    if (!text) return;
    const item: ChecklistItem = { id: newChecklistId(), text, done: false };
    const checklist = [...draft.checklist, item];
    setChecklistInput("");
    setDraft({ ...draft, checklist });
    save({ checklist });
  };

  const toggleChecklistItem = (id: string, done: boolean) => {
    const checklist = draft.checklist.map((item) =>
      item.id === id ? { ...item, done } : item
    );
    setDraft({ ...draft, checklist });
    save({ checklist });
  };

  const removeChecklistItem = (id: string) => {
    const checklist = draft.checklist.filter((item) => item.id !== id);
    setDraft({ ...draft, checklist });
    save({ checklist });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onBlur={() => {
              if (draft.title.trim() && draft.title !== task?.title) {
                save({ title: draft.title });
              }
            }}
            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={draft.status}
              onValueChange={(value: TaskStatus) => {
                setDraft({ ...draft, status: value });
                save({ status: value });
              }}
              disabled={isPending}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draft.priority}
              onValueChange={(value: TaskPriority) => {
                setDraft({ ...draft, priority: value });
                save({ priority: value });
              }}
              disabled={isPending}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_CONFIG[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className={PRIORITY_CONFIG[draft.priority].badgeClass}>
              {PRIORITY_CONFIG[draft.priority].label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={() => save({ description: draft.description ?? "" })}
              placeholder="Add details, acceptance criteria, links..."
              rows={5}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due date
              </Label>
              <Input
                type="date"
                value={draft.dueDate ? draft.dueDate.slice(0, 10) : ""}
                onChange={(e) => {
                  const dueDate = e.target.value || null;
                  setDraft({
                    ...draft,
                    dueDate: dueDate ? `${dueDate}T12:00:00.000Z` : null,
                  });
                  save({ dueDate });
                }}
                disabled={isPending}
              />
              {overdue && <p className="text-xs text-destructive">Overdue</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Estimate (hours)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={draft.estimatedHours ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setDraft({ ...draft, estimatedHours: val });
                }}
                onBlur={() => save({ estimatedHours: draft.estimatedHours })}
                placeholder="e.g. 2"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-1.5">
              {draft.labels.map((label) => (
                <Badge key={label} variant="secondary" className="gap-1 pr-1">
                  {label}
                  <button type="button" onClick={() => removeLabel(label)} disabled={isPending}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add label"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                disabled={isPending}
              />
              <Button type="button" variant="outline" size="sm" onClick={addLabel} disabled={isPending}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Checklist</Label>
              {progress.total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {progress.done}/{progress.total}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {draft.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) =>
                      toggleChecklistItem(item.id, checked === true)
                    }
                    disabled={isPending}
                  />
                  <span
                    className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.text}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeChecklistItem(item.id)}
                    disabled={isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add checklist item"
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
                disabled={isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addChecklistItem}
                disabled={isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created {new Date(draft.createdAt).toLocaleString()}</p>
            <p>Updated {new Date(draft.updatedAt).toLocaleString()}</p>
            {draft.completedAt && (
              <p>Completed {new Date(draft.completedAt).toLocaleString()}</p>
            )}
            {draft.dueDate && <p>Due {formatDueDate(draft.dueDate)}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isPending}>
              <Copy className="h-4 w-4 mr-1" />
              Duplicate
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
