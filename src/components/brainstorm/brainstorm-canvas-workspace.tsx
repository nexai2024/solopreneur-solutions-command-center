"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Archive, Loader2, Plus, Sparkles } from "lucide-react";
import { SessionPanel } from "@/components/brainstorm/session-panel";
import { NodeCard } from "@/components/brainstorm/node-card";
import { BrainstormCopilot } from "@/components/brainstorm/brainstorm-copilot";
import {
  addBrainstormNode,
  createBrainstormSession,
  deleteBrainstormNode,
  deleteBrainstormSession,
  getBrainstormNodes,
  runBrainstormAI,
  updateBrainstormNode,
  generateIdeasForSession,
  autoFillNodeVetting,
  enhanceBrainstormNode,
  type BrainstormNodeDTO,
  type BrainstormSessionDTO,
} from "@/lib/actions/brainstorm";
import {
  mapNodeDTOToBrainstormNode,
  type BrainstormNode,
  type BrainstormSession,
  type NodeType,
  type ValidationResult,
} from "@/lib/brainstorm";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toSession(s: BrainstormSessionDTO): BrainstormSession {
  return {
    id: s.id,
    user_id: s.user_id,
    title: s.title,
    status: s.status as "active" | "archived",
    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}

function mapNodes(dtos: BrainstormNodeDTO[], userId: string): BrainstormNode[] {
  return dtos.map((dto) => mapNodeDTOToBrainstormNode(dto, userId));
}

export function BrainstormCanvasWorkspace({
  initialSessions,
}: {
  initialSessions: BrainstormSessionDTO[];
}) {
  const { user } = useUser();
  const userId = user?.id ?? "local";

  const [sessions, setSessions] = useState<BrainstormSession[]>(
    initialSessions.map(toSession)
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessions[0]?.id ?? null
  );
  const [nodes, setNodes] = useState<BrainstormNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [newRootContent, setNewRootContent] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [copilotCollapsed, setCopilotCollapsed] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [focusedNodeContent, setFocusedNodeContent] = useState<string | undefined>();

  const [explodingId, setExplodingId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [developingId, setDevelopingId] = useState<string | null>(null);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [autoFillingId, setAutoFillingId] = useState<string | null>(null);
  const [validationResults] = useState(new Map<string, ValidationResult>());
  const [, startTransition] = useTransition();

  const reloadNodes = useCallback(
    async (sessionId: string) => {
      setLoadingNodes(true);
      try {
        const dtos = await getBrainstormNodes(sessionId);
        setNodes(mapNodes(dtos, userId));
      } catch {
        toast.error("Failed to load nodes");
      } finally {
        setLoadingNodes(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (activeSessionId) reloadNodes(activeSessionId);
  }, [activeSessionId, reloadNodes]);

  const handleCreateSession = async (title: string) => {
    setCreatingSession(true);
    try {
      const session = await createBrainstormSession(title);
      const mapped = toSession(session);
      setSessions((prev) => [mapped, ...prev]);
      setActiveSessionId(session.id);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    await deleteBrainstormSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const next = sessions.find((s) => s.id !== id);
      setActiveSessionId(next?.id ?? null);
      setNodes([]);
    }
  };

  const handleAddRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId || !newRootContent.trim()) return;
    startTransition(async () => {
      const dto = await addBrainstormNode({
        sessionId: activeSessionId,
        content: newRootContent.trim(),
      });
      setNodes((prev) => [...prev, mapNodeDTOToBrainstormNode(dto, userId)]);
      setNewRootContent("");
    });
  };

  const handleUpdateFields = async (
    nodeId: string,
    fields: Partial<BrainstormNode>
  ) => {
    const existing = nodes.find((n) => n.id === nodeId);
    const metadata = {
      ...(existing?.metadata ?? {}),
      ...(fields.idea_status !== undefined ? { idea_status: fields.idea_status } : {}),
      ...(fields.estimated_complexity !== undefined
        ? { estimated_complexity: fields.estimated_complexity }
        : {}),
      ...(fields.market_need_intensity !== undefined
        ? { market_need_intensity: fields.market_need_intensity }
        : {}),
      ...(fields.tech_stack_familiarity !== undefined
        ? { tech_stack_familiarity: fields.tech_stack_familiarity }
        : {}),
      ...(fields.monetization_potential !== undefined
        ? { monetization_potential: fields.monetization_potential }
        : {}),
      ...(fields.time_to_mvp_days !== undefined
        ? { time_to_mvp_days: fields.time_to_mvp_days }
        : {}),
      ...(fields.target_technology !== undefined
        ? { target_technology: fields.target_technology }
        : {}),
      ...(fields.dependency_risk !== undefined
        ? { dependency_risk: fields.dependency_risk }
        : {}),
      ...(fields.viability_score !== undefined
        ? { viability_score: fields.viability_score }
        : {}),
    };

    const dto = await updateBrainstormNode(nodeId, {
      content: fields.content ?? fields.title ?? undefined,
      coreProblem: fields.core_problem ?? undefined,
      proposedSolution: fields.proposed_solution ?? undefined,
      targetUserPersona: fields.target_user_persona ?? undefined,
      viabilityScore: fields.viability_score ?? undefined,
      metadata,
    });

    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? mapNodeDTOToBrainstormNode(dto, userId) : n
      )
    );
  };

  const handleUpdateMetadata = async (
    nodeId: string,
    metadata: Record<string, unknown>
  ) => {
    const dto = await updateBrainstormNode(nodeId, { metadata });
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? mapNodeDTOToBrainstormNode(dto, userId) : n
      )
    );
  };

  const handleUpdateContent = async (nodeId: string, content: string) => {
    const dto = await updateBrainstormNode(nodeId, { content });
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? mapNodeDTOToBrainstormNode(dto, userId) : n
      )
    );
  };

  const handleAddSubNode = async (
    parentId: string,
    content: string,
    nodeType?: NodeType
  ) => {
    if (!activeSessionId) return;
    const dto = await addBrainstormNode({
      sessionId: activeSessionId,
      parentId,
      content,
      nodeType,
    });
    setNodes((prev) => [...prev, mapNodeDTOToBrainstormNode(dto, userId)]);
  };

  const runAI = async (
    node: BrainstormNode,
    action: "explode" | "validate" | "analyze" | "develop",
    setLoading: (id: string | null) => void,
    metadataKey: string,
    resultKey?: string
  ) => {
    setLoading(node.id);
    setFocusedNodeContent(node.content);
    try {
      const activeSession = sessions.find((s) => s.id === activeSessionId);
      const result = await runBrainstormAI(
        action,
        node.content,
        activeSession?.title
      );
      if (action === "explode") {
        const parsed = result as { nodes?: Array<{ label: string; nodeType?: string }> };
        const items = parsed.nodes ?? [];
        for (const item of items) {
          await handleAddSubNode(
            node.id,
            item.label,
            (item.nodeType as NodeType) ?? "Feature"
          );
        }
        toast.success(`Added ${items.length} branches`);
      } else {
        await handleUpdateMetadata(node.id, {
          ...node.metadata,
          [metadataKey]: result,
          ...(resultKey ? { [resultKey]: result } : {}),
        });
        toast.success(`${action} complete`);
      }
    } catch {
      toast.error(`AI ${action} failed`);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateSessionIdeas = () => {
    if (!activeSessionId || !aiPrompt.trim()) {
      toast.error("Enter a prompt for AI idea generation");
      return;
    }
    setGeneratingIdeas(true);
    startTransition(async () => {
      try {
        const created = await generateIdeasForSession(activeSessionId, aiPrompt.trim(), 4);
        setNodes((prev) => [
          ...prev,
          ...created.map((dto) => mapNodeDTOToBrainstormNode(dto, userId)),
        ]);
        setAiPrompt("");
        toast.success(`Added ${created.length} AI-generated ideas`);
      } catch {
        toast.error("Failed to generate ideas");
      } finally {
        setGeneratingIdeas(false);
      }
    });
  };

  const handleEnhanceNode = async (node: BrainstormNode) => {
    setEnhancingId(node.id);
    setFocusedNodeContent(node.content);
    try {
      const dto = await enhanceBrainstormNode(node.id);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id ? mapNodeDTOToBrainstormNode(dto, userId) : n
        )
      );
      toast.success("Idea enhanced");
    } catch {
      toast.error("Enhancement failed");
    } finally {
      setEnhancingId(null);
    }
  };

  const handleAutoFillVetting = async (node: BrainstormNode) => {
    setAutoFillingId(node.id);
    setFocusedNodeContent(node.content);
    try {
      const dto = await autoFillNodeVetting(node.id);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id ? mapNodeDTOToBrainstormNode(dto, userId) : n
        )
      );
      toast.success("Vetting fields auto-filled");
    } catch {
      toast.error("Auto-fill failed");
    } finally {
      setAutoFillingId(null);
    }
  };

  const rootNodes = nodes.filter((n) => !n.parent_id);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] border rounded-xl overflow-hidden bg-background">
      <SessionPanel
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        creating={creatingSession}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-border">
          <form onSubmit={handleAddRoot} className="flex flex-1 gap-2">
            <Input
              placeholder="Add a root idea to this session..."
              value={newRootContent}
              onChange={(e) => setNewRootContent(e.target.value)}
              disabled={!activeSessionId}
            />
            <Button type="submit" size="sm" disabled={!activeSessionId || !newRootContent.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>
          <div className="flex gap-2">
            <Input
              placeholder="AI: generate ideas (e.g. B2B tools for remote teams)"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={!activeSessionId || generatingIdeas}
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleGenerateSessionIdeas()}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleGenerateSessionIdeas}
              disabled={!activeSessionId || generatingIdeas || !aiPrompt.trim()}
            >
              {generatingIdeas ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="h-4 w-4 mr-1" />
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!activeSessionId ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Create or select a session to start brainstorming.
              </p>
              <HowDoILink section="brainstorm" />
            </div>
          ) : loadingNodes ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rootNodes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Add your first idea above, or use AI Generate to seed this session.
              </p>
              <HowDoILink section="brainstorm" />
            </div>
          ) : (
            rootNodes.map((node) => {
              const children = nodes.filter((n) => n.parent_id === node.id);
              return (
                <NodeCard
                  key={node.id}
                  node={node}
                  childNodes={children}
                  depth={0}
                  onExplode={(n) =>
                    runAI(n, "explode", setExplodingId, "explosion")
                  }
                  onValidate={(n) =>
                    runAI(n, "validate", setValidatingId, "validation")
                  }
                  onAnalyze={(n) =>
                    runAI(n, "analyze", setAnalyzingId, "analysis")
                  }
                  onDevelop={(n) =>
                    runAI(n, "develop", setDevelopingId, "blueprint")
                  }
                  onEnhance={handleEnhanceNode}
                  onAutoFillVetting={handleAutoFillVetting}
                  onFocus={(n) => setFocusedNodeContent(n.content)}
                  onArchive={(id) =>
                    startTransition(async () => {
                      await updateBrainstormNode(id, { status: "archived" });
                      if (activeSessionId) reloadNodes(activeSessionId);
                    })
                  }
                  onDelete={(id) =>
                    startTransition(async () => {
                      await deleteBrainstormNode(id);
                      setNodes((prev) => prev.filter((n) => n.id !== id && n.parent_id !== id));
                    })
                  }
                  onUpdateMetadata={handleUpdateMetadata}
                  onUpdateFields={handleUpdateFields}
                  onUpdateContent={handleUpdateContent}
                  onAddSubNode={handleAddSubNode}
                  explodingId={explodingId}
                  validatingId={validatingId}
                  analyzingId={analyzingId}
                  developingId={developingId}
                  enhancingId={enhancingId}
                  autoFillingId={autoFillingId}
                  validationResults={validationResults}
                  allNodes={nodes}
                  showArchived={showArchived}
                />
              );
            })
          )}
        </div>
      </div>

      <BrainstormCopilot
        sessionId={activeSessionId}
        sessionTitle={activeSession?.title}
        activeNodeContent={focusedNodeContent}
        collapsed={copilotCollapsed}
        onToggleCollapse={() => setCopilotCollapsed((v) => !v)}
      />
    </div>
  );
}
