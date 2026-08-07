"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PIPELINE_COLUMNS,
  type BuildPipelineStatus,
} from "@/lib/build-rbac";
import type { BuildReleaseDTO } from "@/lib/actions/build-library";
import { updateBuildPipelineStatus } from "@/lib/actions/build-library";

function PipelineCard({
  build,
  canDrag,
}: {
  build: BuildReleaseDTO;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: build.id, disabled: !canDrag });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-lg border bg-card p-2.5 text-xs space-y-1 shadow-sm"
    >
      <div className="flex items-start gap-1">
        {canDrag && (
          <button
            type="button"
            className="text-muted-foreground cursor-grab"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {build.appName} · {build.version}
          </p>
          <p className="text-muted-foreground">
            #{build.buildNumber} · {build.platform}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {build.environment}
      </Badge>
      {build.commitSha && (
        <a
          href={build.commitUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[hsl(var(--os-cyan))] hover:underline font-mono"
        >
          {build.commitSha.slice(0, 7)}
        </a>
      )}
    </div>
  );
}

function PipelineColumn({
  columnId,
  label,
  builds,
  canDrag,
}: {
  columnId: BuildPipelineStatus;
  label: string;
  builds: BuildReleaseDTO[];
  canDrag: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div className="flex flex-col min-w-[140px] flex-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-[10px] text-muted-foreground">{builds.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg border border-dashed p-2 space-y-2 min-h-[120px] transition-colors ${
          isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/10"
        }`}
      >
        <SortableContext items={builds.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {builds.map((b) => (
            <PipelineCard key={b.id} build={b} canDrag={canDrag} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function BuildPipelineBoard({
  builds,
  canDrag,
  onBuildsChange,
}: {
  builds: BuildReleaseDTO[];
  canDrag: boolean;
  onBuildsChange?: (builds: BuildReleaseDTO[]) => void;
}) {
  const [localBuilds, setLocalBuilds] = useState(builds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map: Record<BuildPipelineStatus, BuildReleaseDTO[]> = {
      queued: [],
      building: [],
      success: [],
      failed: [],
      in_qa: [],
      approved: [],
      released: [],
    };
    for (const b of localBuilds) {
      const key = b.pipelineStatus as BuildPipelineStatus;
      if (map[key]) map[key].push(b);
    }
    return map;
  }, [localBuilds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!canDrag) return;
    const { active, over } = event;
    if (!over) return;

    const buildId = String(active.id);
    const targetColumn = String(over.id) as BuildPipelineStatus;
    if (!PIPELINE_COLUMNS.some((c) => c.id === targetColumn)) return;

    const build = localBuilds.find((b) => b.id === buildId);
    if (!build || build.pipelineStatus === targetColumn) return;

    const next = localBuilds.map((b) =>
      b.id === buildId ? { ...b, pipelineStatus: targetColumn } : b
    );
    setLocalBuilds(next);
    onBuildsChange?.(next);

    startTransition(async () => {
      try {
        await updateBuildPipelineStatus(buildId, targetColumn);
        toast.success(`Moved to ${targetColumn.replace("_", " ")}`);
      } catch (err) {
        setLocalBuilds(builds);
        toast.error(err instanceof Error ? err.message : "Status update failed");
      }
    });
  };

  const activeBuild = activeId
    ? localBuilds.find((b) => b.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PIPELINE_COLUMNS.map((col) => (
          <PipelineColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            builds={grouped[col.id]}
            canDrag={canDrag}
          />
        ))}
      </div>
      <DragOverlay>
        {activeBuild ? <PipelineCard build={activeBuild} canDrag={false} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
