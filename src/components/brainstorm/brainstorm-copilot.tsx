"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  askBrainstormCopilot,
  getBrainstormCopilotMessages,
  clearBrainstormCopilotHistory,
  type BrainstormCopilotMessageDTO,
} from "@/lib/actions/brainstorm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Send, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";

const QUICK_PROMPTS = [
  "What's the strongest idea on my canvas?",
  "Suggest 3 pivot angles",
  "What should I build first as MVP?",
  "Name ideas for the top concept",
  "What risks am I missing?",
];

interface BrainstormCopilotProps {
  sessionId: string | null;
  sessionTitle?: string;
  activeNodeContent?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function BrainstormCopilot({
  sessionId,
  sessionTitle,
  activeNodeContent,
  collapsed = false,
  onToggleCollapse,
}: BrainstormCopilotProps) {
  const [messages, setMessages] = useState<BrainstormCopilotMessageDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async (id: string) => {
    setLoadingHistory(true);
    try {
      const history = await getBrainstormCopilotMessages(id);
      setMessages(history);
    } catch {
      toast.error("Failed to load co-pilot history");
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      void loadHistory(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  const sendMessage = (text: string) => {
    if (!sessionId || !text.trim()) return;
    const userMsg = text.trim();
    setInput("");

    const optimisticUser: BrainstormCopilotMessageDTO = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMsg,
      focus_node: activeNodeContent?.slice(0, 500) ?? null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    startTransition(async () => {
      try {
        await askBrainstormCopilot(sessionId, userMsg, activeNodeContent);
        await loadHistory(sessionId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Co-pilot unavailable");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      }
    });
  };

  const handleClearHistory = () => {
    if (!sessionId || messages.length === 0) return;
    if (!confirm("Clear all co-pilot messages for this session?")) return;

    startTransition(async () => {
      try {
        await clearBrainstormCopilotHistory(sessionId);
        setMessages([]);
        toast.success("Co-pilot history cleared");
      } catch {
        toast.error("Failed to clear history");
      }
    });
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-10 border-l border-border flex flex-col items-center justify-center gap-2 bg-secondary/30 hover:bg-secondary/50 transition-colors shrink-0"
        title="Open AI Co-pilot"
      >
        <Bot className="h-5 w-5 text-[hsl(var(--os-cyan))]" />
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="w-72 border-l border-border flex flex-col bg-secondary/20 shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 text-[hsl(var(--os-cyan))] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">AI Co-pilot</p>
            {sessionTitle && (
              <p className="text-[10px] text-muted-foreground truncate">{sessionTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {sessionId && messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={isPending}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"
              title="Clear history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-secondary text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {!sessionId ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Select a session to chat with your brainstorming co-pilot.
          </p>
        ) : loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Ask anything about your ideas — pivots, MVP scope, naming, GTM, or what to prioritize.
              Your conversation is saved per session.
            </p>
            <div className="flex flex-col gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isPending}
                  className="text-left text-[11px] px-2.5 py-2 rounded-md border border-border/50 bg-background/60 hover:border-[hsl(var(--os-cyan)/0.3)] hover:bg-[hsl(var(--os-cyan)/0.05)] transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-xs rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[hsl(var(--os-cyan)/0.1)] border border-[hsl(var(--os-cyan)/0.2)] ml-4"
                  : "bg-background border border-border/50 mr-2"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        {isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border space-y-2">
        {activeNodeContent && (
          <p className="text-[10px] text-muted-foreground truncate" title={activeNodeContent}>
            Focus: {activeNodeContent.slice(0, 40)}
            {activeNodeContent.length > 40 ? "…" : ""}
          </p>
        )}
        {messages.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {messages.length} messages saved · included when you promote to project
          </p>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask the co-pilot..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!sessionId || isPending || loadingHistory}
            rows={2}
            className="text-xs resize-none min-h-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 h-auto"
            onClick={() => sendMessage(input)}
            disabled={!sessionId || isPending || loadingHistory || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
