"use client";

import { useState, useEffect } from "react";
import type { ContentItem } from "@/lib/growth";
import type { Project } from "@/lib/build-tracker";
import {
  deleteContentItem,
  generateContentForProject,
  getContentItems,
  updateContentItem,
} from "@/lib/actions/growth";
import {
  Plus,
  Trash2,
  Calendar,
  FileText,
  Loader2,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface ContentCalendarProps {
  project: Project;
}

export function ContentCalendar({ project }: ContentCalendarProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  const loadContent = async () => {
    try {
      const data = await getContentItems(project.id);
      setItems(
        data.map((item) => ({
          id: item.id,
          project_id: item.project_id,
          title: item.title,
          type: item.type,
          status: item.status,
          scheduled_at: item.scheduled_at,
          content_body: item.content_body,
          created_at: item.created_at,
        }))
      );
    } catch {
      toast.error("Failed to load content calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [project.id]);

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const count = await generateContentForProject(project.id);
      await loadContent();
      toast.success(`Generated ${count} new content ideas!`);
    } catch {
      toast.error("Failed to generate ideas");
    } finally {
      setSuggesting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentItem(id);
      setItems(items.filter((i) => i.id !== id));
      toast.success("Content item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleStatusChange = async (id: string, status: ContentItem["status"]) => {
    try {
      await updateContentItem(id, { status });
      setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Content Calendar</h3>
          <p className="text-sm text-muted-foreground">
            Plan and schedule your marketing content.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--os-cyan)/0.1)] text-[hsl(var(--os-cyan))] rounded-lg hover:bg-[hsl(var(--os-cyan)/0.2)] transition-all disabled:opacity-50"
          >
            {suggesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI Ideas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-32 shimmer rounded-xl" />)
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="group p-4 bg-card border border-border rounded-xl hover:border-[hsl(var(--os-cyan)/0.5)] transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {item.type}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-medium text-foreground mb-1 line-clamp-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                {item.content_body || "No description provided."}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <button
                  onClick={() =>
                    handleStatusChange(
                      item.id,
                      item.status === "published" ? "draft" : "published"
                    )
                  }
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-all ${
                    item.status === "published"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.status === "published" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </button>

                {item.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.scheduled_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-secondary/10 rounded-2xl border-2 border-dashed border-border">
            <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Your content calendar is empty.</p>
            <button
              onClick={handleSuggest}
              className="mt-3 flex items-center gap-2 text-sm text-[hsl(var(--os-cyan))]"
            >
              <Plus className="w-4 h-4" />
              Generate ideas with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
