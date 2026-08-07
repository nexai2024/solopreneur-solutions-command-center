"use client";

import { useState, useEffect } from "react";
import type { SEOKeyword } from "@/lib/growth";
import type { Project } from "@/lib/build-tracker";
import {
  addKeyword,
  deleteKeyword,
  getKeywords,
  suggestKeywordsForProject,
} from "@/lib/actions/growth";
import { Plus, Trash2, Search, TrendingUp, Loader2, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";

interface SEOTrackerProps {
  project: Project;
}

export function SEOTracker({ project }: SEOTrackerProps) {
  const [keywords, setKeywords] = useState<SEOKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const loadKeywords = async () => {
    try {
      const data = await getKeywords(project.id);
      setKeywords(
        data.map((k) => ({
          id: k.id,
          project_id: k.project_id,
          keyword: k.keyword,
          target_url: k.target_url,
          difficulty: k.difficulty,
          search_volume: k.search_volume,
          rank: k.rank,
          created_at: k.created_at,
        }))
      );
    } catch {
      toast.error("Failed to load keywords");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeywords();
  }, [project.id]);

  const handleAddKeyword = async (kw?: string) => {
    const word = kw || newKeyword;
    if (!word.trim()) return;

    try {
      await addKeyword(project.id, word.trim());
      await loadKeywords();
      if (!kw) setNewKeyword("");
      toast.success("Keyword added");
    } catch {
      toast.error("Failed to add keyword");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKeyword(id);
      setKeywords(keywords.filter((k) => k.id !== id));
      toast.success("Keyword removed");
    } catch {
      toast.error("Failed to remove keyword");
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const count = await suggestKeywordsForProject(project.id);
      await loadKeywords();
      toast.success(`Found ${count} new keyword ideas!`);
    } catch {
      toast.error("Failed to suggest keywords");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">SEO Keywords</h3>
          <p className="text-sm text-muted-foreground">
            Track rankings and discover new opportunities.
          </p>
        </div>
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
          Suggest Ideas
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Add a keyword..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
            className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--os-cyan)/0.5)]"
          />
        </div>
        <button
          onClick={() => handleAddKeyword()}
          className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Keyword</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                Difficulty
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                Volume
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Rank</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-4 py-4 h-12 bg-secondary/20" />
                </tr>
              ))
            ) : keywords.length > 0 ? (
              keywords.map((kw) => (
                <tr key={kw.id} className="group hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {kw.keyword}
                      {kw.target_url && <Globe className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        kw.difficulty < 30
                          ? "bg-green-500/10 text-green-500"
                          : kw.difficulty < 60
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {kw.difficulty || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {kw.search_volume ? kw.search_volume.toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {kw.rank ? (
                      <span className="flex items-center justify-center gap-1 text-[hsl(var(--os-cyan))] font-semibold">
                        #{kw.rank}
                        <TrendingUp className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(kw.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted-foreground italic"
                >
                  No keywords added yet. Use the suggest button to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
