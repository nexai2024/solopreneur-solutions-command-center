"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  Calendar,
  CheckSquare,
  Clock,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTask,
  generateTasksForProject,
  reorderTasks,
} from "@/lib/actions/tasks";
import {
  type BoardTask,
  type TaskPriority,
  type TaskStatus,
  KANBAN_COLUMNS,
  PRIORITY_CONFIG,
  TASK_PRIORITIES,
  checklistProgress,
  formatDueDate,
  isOverdue,
  normalizeTaskStatus,
} from "@/lib/task-types";
import { TaskDetailSheet } from "@/components/build-tracker/task-detail-sheet";

function groupTasks(tasks: BoardTask[]) {
  const grouped: Record<TaskStatus, BoardTask[]> = {
    todo: [],
    "in-progress": [],
    done: [],
  };
  for (const task of tasks) {
    grouped[normalizeTaskStatus(task.status)].push(task);
  }
  for (const col of KANBAN_COLUMNS) {
    grouped[col.id].sort((a, b) => a.order - b.order);
  }
  return grouped;
}

function SortableTaskCard({
  task,
  onOpen,
  disabled,
}: {
  task: BoardTask;
  onOpen: (task: BoardTask) => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const progress = checklistProgress(task.checklist);
  const overdue = isOverdue(task.dueDate, task.status);
  const priorityCfg = PRIORITY_CONFIG[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border bg-card shadow-sm overflow-hidden hover:border-primary/40 transition-colors"
    >
      <div className="flex items-stretch">
        <button
          type="button"
          className="px-1.5 flex items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label="Drag task"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex-1 min-w-0 p-3 pl-0 text-left"
          onClick={() => onOpen(task)}
          disabled={disabled}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] px-1.5 py-0 h-5 ${priorityCfg.badgeClass}`}
            >
              {priorityCfg.label}
            </Badge>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] ${
                  overdue ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.estimatedHours != null && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.estimatedHours}h
              </span>
            )}
            {progress.total > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {progress.done}/{progress.total}
              </span>
            )}
          </div>

          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.labels.slice(0, 3).map((label) => (
                <Badge key={label} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {label}
                </Badge>
              ))}
              {task.labels.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{task.labels.length - 3}
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function TaskCardPreview({ task }: { task: BoardTask }) {
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg rotate-2 w-64">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{task.title}</p>
        <Badge variant="outline" className={`text-[10px] ${priorityCfg.badgeClass}`}>
          {priorityCfg.label}
        </Badge>
      </div>
    </div>
  );
}

function KanbanColumn({
  columnId,
  label,
  tasks,
  onOpenTask,
  disabled,
}: {
  columnId: TaskStatus;
  label: string;
  tasks: BoardTask[];
  onOpenTask: (task: BoardTask) => void;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div className="flex flex-col min-h-[420px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border border-dashed p-3 space-y-3 transition-colors ${
          isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              disabled={disabled}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}

export function TaskKanbanBoard({
  projectId,
  initialTasks,
  onTasksChange,
}: {
  projectId: string;
  initialTasks: BoardTask[];
  onTasksChange: (tasks: BoardTask[]) => void;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [isPending, startTransition] = useTransition();

  const filteredTasks = useMemo(() => {
    if (priorityFilter === "all") return tasks;
    return tasks.filter((t) => t.priority === priorityFilter);
  }, [tasks, priorityFilter]);

  const grouped = useMemo(() => groupTasks(filteredTasks), [filteredTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const applyLocalTasks = (next: BoardTask[]) => {
    setTasks(next);
    onTasksChange(next);
  };

  const openTask = (task: BoardTask) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleTaskUpdated = (updated: BoardTask) => {
    applyLocalTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (taskId: string) => {
    applyLocalTasks(tasks.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  const persistBoard = (nextGrouped: Record<TaskStatus, BoardTask[]>) => {
    const updates: BoardTask[] = [];
    const payload: Array<{ id: string; status: TaskStatus; order: number }> = [];

    for (const column of KANBAN_COLUMNS) {
      nextGrouped[column.id].forEach((task, index) => {
        const updated = { ...task, status: column.id, order: index };
        updates.push(updated);
        payload.push({ id: task.id, status: column.id, order: index });
      });
    }

    // Merge with filtered-out tasks (when priority filter active)
    const filteredIds = new Set(filteredTasks.map((t) => t.id));
    const untouched = tasks.filter((t) => !filteredIds.has(t.id));
    applyLocalTasks([...updates, ...untouched]);

    startTransition(async () => {
      try {
        await reorderTasks(projectId, payload);
      } catch {
        toast.error("Failed to save task order");
        setTasks(initialTasks);
        onTasksChange(initialTasks);
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const moving = tasks.find((t) => t.id === activeId);
    if (!moving) return;

    let targetColumn: TaskStatus = normalizeTaskStatus(moving.status);
    if (KANBAN_COLUMNS.some((c) => c.id === overId)) {
      targetColumn = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) targetColumn = normalizeTaskStatus(overTask.status);
    }

    const sourceColumn = normalizeTaskStatus(moving.status);
    const nextGrouped = groupTasks(filteredTasks);

    nextGrouped[sourceColumn] = nextGrouped[sourceColumn].filter((t) => t.id !== activeId);

    let insertIndex = nextGrouped[targetColumn].length;
    if (!KANBAN_COLUMNS.some((c) => c.id === overId)) {
      const overIndex = nextGrouped[targetColumn].findIndex((t) => t.id === overId);
      if (overIndex >= 0) insertIndex = overIndex;
    }

    nextGrouped[targetColumn].splice(insertIndex, 0, { ...moving, status: targetColumn });
    persistBoard(nextGrouped);
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      try {
        const task = await createTask(projectId, {
          title: newTitle,
          priority: newPriority,
        });
        applyLocalTasks([...tasks, task]);
        setNewTitle("");
        toast.success("Task added");
      } catch {
        toast.error("Failed to add task");
      }
    });
  };

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const result = await generateTasksForProject(projectId);
        toast.success(`Generated ${result.created} tasks`);
        window.location.reload();
      } catch {
        toast.error("Failed to generate tasks");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="max-w-xs"
          disabled={isPending}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
        />
        <Select
          value={newPriority}
          onValueChange={(v) => setNewPriority(v as TaskPriority)}
          disabled={isPending}
        >
          <SelectTrigger className="w-[110px] h-9">
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
        <Button size="sm" onClick={handleAddTask} disabled={isPending || !newTitle.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
        <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          Generate with AI
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as TaskPriority | "all")}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_CONFIG[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              columnId={column.id}
              label={column.label}
              tasks={grouped[column.id]}
              onOpenTask={openTask}
              disabled={isPending}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <TaskCardPreview task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
}
