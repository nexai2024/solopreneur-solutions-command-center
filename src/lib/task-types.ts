export type TaskStatus = "todo" | "in-progress" | "done";

export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type BoardTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  dueDate: string | null;
  estimatedHours: number | null;
  labels: string[];
  checklist: ChecklistItem[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const TASK_STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];

export const TASK_PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; badgeClass: string }
> = {
  urgent: {
    label: "Urgent",
    color: "text-red-600",
    badgeClass: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  high: {
    label: "High",
    color: "text-orange-600",
    badgeClass: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  medium: {
    label: "Medium",
    color: "text-blue-600",
    badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  low: {
    label: "Low",
    color: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

export const KANBAN_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

export function normalizeTaskStatus(value: string): TaskStatus {
  if (value === "in-progress" || value === "done") return value;
  return "todo";
}

export function normalizeTaskPriority(value: string | null | undefined): TaskPriority {
  const v = value?.toLowerCase();
  if (v === "urgent" || v === "high" || v === "medium" || v === "low") return v;
  return "medium";
}

export function parseAiPriority(value: string): TaskPriority {
  const v = value.toUpperCase();
  if (v === "URGENT") return "urgent";
  if (v === "HIGH") return "high";
  if (v === "LOW") return "low";
  return "medium";
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ChecklistItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ChecklistItem).id === "string" &&
        typeof (item as ChecklistItem).text === "string" &&
        typeof (item as ChecklistItem).done === "boolean"
    )
    .map((item) => ({ id: item.id, text: item.text, done: item.done }));
}

/** Legacy AI tasks stored priority in description footer */
export function parseLegacyTaskMeta(description: string | null): {
  priority: TaskPriority | null;
  estimatedHours: number | null;
  cleanDescription: string | null;
} {
  if (!description) {
    return { priority: null, estimatedHours: null, cleanDescription: null };
  }

  const priorityMatch = description.match(/\n\nPriority:\s*(URGENT|HIGH|MEDIUM|LOW)/i);
  const hoursMatch = description.match(/Est\.\s*([\d.]+)h/i);

  let cleanDescription = description;
  if (priorityMatch) {
    cleanDescription = cleanDescription.replace(/\n\nPriority:[\s\S]*$/, "").trim();
  }

  return {
    priority: priorityMatch ? parseAiPriority(priorityMatch[1]) : null,
    estimatedHours: hoursMatch ? Number(hoursMatch[1]) : null,
    cleanDescription: cleanDescription || null,
  };
}

export function toBoardTask(task: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority?: string | null;
  order: number;
  dueDate: Date | null;
  estimatedHours?: number | null;
  labels?: unknown;
  checklist?: unknown;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}): BoardTask {
  const legacy = parseLegacyTaskMeta(task.description);
  const priority =
    task.priority && task.priority !== "medium"
      ? normalizeTaskPriority(task.priority)
      : legacy.priority ?? normalizeTaskPriority(task.priority);

  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: legacy.cleanDescription ?? task.description,
    status: normalizeTaskStatus(task.status),
    priority,
    order: task.order,
    dueDate: task.dueDate?.toISOString() ?? null,
    estimatedHours: task.estimatedHours ?? legacy.estimatedHours,
    labels: parseStringArray(task.labels),
    checklist: parseChecklist(task.checklist),
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: (task.updatedAt ?? task.createdAt).toISOString(),
  };
}

export function checklistProgress(checklist: ChecklistItem[]): {
  done: number;
  total: number;
} {
  return {
    done: checklist.filter((i) => i.done).length,
    total: checklist.length,
  };
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate) < new Date();
}

export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
