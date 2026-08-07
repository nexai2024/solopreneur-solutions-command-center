'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Brain } from 'lucide-react';
import type { BrainstormSession } from '@/lib/brainstorm';
import { HowDoILink } from '@/components/help/how-do-i-link';

interface SessionPanelProps {
  sessions: BrainstormSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: (title: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  creating: boolean;
}

export function SessionPanel({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  creating,
}: SessionPanelProps) {
  const [newTitle, setNewTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || 'Untitled Session';
    await onCreateSession(title);
    setNewTitle('');
    setShowInput(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-64 shrink-0 flex flex-col bg-card border-r border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[hsl(var(--os-cyan))]" />
          <span className="text-sm font-semibold text-foreground">Sessions</span>
        </div>
        <button
          onClick={() => setShowInput(true)}
          className="w-6 h-6 rounded-md bg-secondary hover:bg-[hsl(var(--os-cyan)/0.15)] text-muted-foreground hover:text-[hsl(var(--os-cyan))] flex items-center justify-center transition-all"
          title="New session"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New session input */}
      {showInput && (
        <form onSubmit={handleCreate} className="px-3 py-2.5 border-b border-border bg-secondary/50">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Session title..."
            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--os-cyan))] focus:border-[hsl(var(--os-cyan))] transition-all"
            onBlur={() => !creating && setShowInput(false)}
            onKeyDown={e => e.key === 'Escape' && setShowInput(false)}
          />
          <div className="flex gap-1.5 mt-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 text-xs bg-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan-dim))] text-white rounded-md py-1 transition-all disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="px-2 text-xs bg-secondary hover:bg-muted text-muted-foreground rounded-md py-1 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && !showInput && (
          <div className="px-4 py-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">No sessions yet.</p>
            <button
              onClick={() => setShowInput(true)}
              className="text-xs text-[hsl(var(--os-cyan))] hover:underline"
            >
              Create your first one
            </button>
            <div className="flex justify-center pt-1">
              <HowDoILink section="brainstorm" />
            </div>
          </div>
        )}

        {sessions.map(session => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
              activeSessionId === session.id
                ? 'bg-[hsl(var(--os-cyan)/0.1)] border-r-2 border-[hsl(var(--os-cyan))]'
                : 'hover:bg-secondary'
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${activeSessionId === session.id ? 'text-[hsl(var(--os-cyan))]' : 'text-foreground'}`}>
                {session.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(session.updated_at)}</p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); onDeleteSession(session.id); }}
                className="p-1 rounded text-muted-foreground hover:text-[hsl(var(--os-rose))] hover:bg-[hsl(var(--os-rose)/0.1)] transition-all"
                title="Delete session"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {activeSessionId === session.id && (
              <ChevronRight className="w-3 h-3 text-[hsl(var(--os-cyan))]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
