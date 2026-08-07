"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createIdea,
  scoreIdeaById,
  promoteIdeaToProject,
  archiveIdea,
  deleteIdea,
} from "@/lib/actions/ideas";
import { IdeaAIAssistant } from "@/components/ideas/idea-ai-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Loader2,
  Sparkles,
  Rocket,
  Trash2,
  Archive,
} from "lucide-react";
import { HowDoILink } from "@/components/help/how-do-i-link";
type IdeaWithProject = {
  id: string;
  title: string;
  description: string;
  status: string;
  aiScore: number | null;
  scoringData: unknown;
  project: { id: string; name: string } | null;
};

interface IdeaWorkspaceProps {
  initialIdeas: IdeaWithProject[];
}

function scoreLabel(score: number | null) {
  if (score == null) return "Not scored";
  if (score >= 80) return "Exceptional";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Moderate";
  if (score >= 35) return "Weak";
  return "Poor";
}

function scoreColor(score: number | null) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 65) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
}

export function IdeaWorkspace({ initialIdeas }: IdeaWorkspaceProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Enter an idea title");
      return;
    }
    startTransition(async () => {
      try {
        const idea = await createIdea({ title, description });
        setIdeas((prev) => [{ ...idea, project: null }, ...prev]);
        setTitle("");
        setDescription("");
        toast.success("Idea created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create idea");
      }
    });
  };

  const handleScore = (id: string) => {
    setActiveId(id);
    startTransition(async () => {
      try {
        const updated = await scoreIdeaById(id);
        setIdeas((prev) =>
          prev.map((i) => (i.id === id ? { ...i, ...updated, project: i.project } : i))
        );
        toast.success(`Scored: ${updated.aiScore?.toFixed(1)} / 100`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Scoring failed");
      } finally {
        setActiveId(null);
      }
    });
  };

  const handlePromote = (id: string) => {
    setActiveId(id);
    startTransition(async () => {
      try {
        const project = await promoteIdeaToProject(id);
        if (!project) return;
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, status: "promoted", project: { id: project.id, name: project.name } }
              : i
          )
        );
        toast.success(`Promoted to project: ${project.name} — starter tasks & milestones added`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Promotion failed");
      } finally {
        setActiveId(null);
      }
    });
  };

  const handleArchive = (id: string) => {
    startTransition(async () => {
      try {
        await archiveIdea(id);
        setIdeas((prev) => prev.filter((i) => i.id !== id));
        toast.success("Idea archived");
      } catch (err) {
        toast.error("Failed to archive");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteIdea(id);
        setIdeas((prev) => prev.filter((i) => i.id !== id));
        toast.success("Idea deleted");
      } catch (err) {
        toast.error("Failed to delete");
      }
    });
  };

  const visibleIdeas = ideas.filter((i) => i.status !== "archived");

  return (
    <div className="space-y-8">
      <IdeaAIAssistant
        draftTitle={title}
        draftDescription={description}
        onEnhanceDraft={(t, d) => {
          setTitle(t);
          setDescription(d);
        }}
        onIdeasCreated={(created) => {
          setIdeas((prev) => [
            ...created.map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              status: "draft",
              aiScore: null,
              scoringData: null,
              project: null,
            })),
            ...prev,
          ]);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            New Idea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Idea title (e.g. AI invoice tool for freelancers)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
          />
          <Textarea
            placeholder="Describe the problem, target user, and proposed solution..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            disabled={isPending}
          />
          <Button onClick={handleCreate} disabled={isPending || !title.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Idea
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Your Ideas ({visibleIdeas.length})
        </h2>
        {visibleIdeas.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No ideas yet. Add one above to run the soloOS scoring engine.
            </p>
            <HowDoILink section="brainstorm" />
          </div>
        ) : (
          visibleIdeas.map((idea) => {
            const busy = isPending && activeId === idea.id;
            const scoringData = idea.scoringData as {
              overallAssessment?: string;
              strengths?: string[];
              weaknesses?: string[];
              recommendations?: string[];
              improvements?: string[];
              dimensions?: Record<string, { score?: number; rationale?: string }>;
            } | null;

            return (
              <Card key={idea.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{idea.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {idea.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize">
                        {idea.status}
                      </Badge>
                      {idea.aiScore != null && (
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${scoreColor(idea.aiScore)}`}
                        >
                          {idea.aiScore.toFixed(1)} — {scoreLabel(idea.aiScore)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scoringData?.overallAssessment && (
                    <p className="text-sm bg-muted/50 rounded-md p-3">
                      {scoringData.overallAssessment}
                    </p>
                  )}
                  {scoringData && (scoringData.strengths?.length || scoringData.weaknesses?.length) && (
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      {scoringData.strengths && scoringData.strengths.length > 0 && (
                        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                            Strengths
                          </p>
                          <ul className="space-y-1 text-muted-foreground">
                            {scoringData.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {scoringData.weaknesses && scoringData.weaknesses.length > 0 && (
                        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3">
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
                            Weaknesses
                          </p>
                          <ul className="space-y-1 text-muted-foreground">
                            {scoringData.weaknesses.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {scoringData?.recommendations && scoringData.recommendations.length > 0 && (
                    <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Recommendations
                      </p>
                      <ul className="space-y-1 text-muted-foreground">
                        {scoringData.recommendations.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {idea.project && (
                    <p className="text-xs text-muted-foreground">
                      Project: <span className="font-medium">{idea.project.name}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleScore(idea.id)}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      {idea.aiScore != null ? "Re-score" : "Score with AI"}
                    </Button>
                    {idea.status !== "promoted" && (
                      <Button
                        size="sm"
                        onClick={() => handlePromote(idea.id)}
                        disabled={busy}
                      >
                        <Rocket className="h-3 w-3 mr-1" />
                        Promote to Project
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchive(idea.id)}
                      disabled={busy}
                    >
                      <Archive className="h-3 w-3 mr-1" />
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(idea.id)}
                      disabled={busy}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
