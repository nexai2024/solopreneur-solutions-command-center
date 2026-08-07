'use client';

import { useState, useEffect } from 'react';
import {
  Zap, CircleCheck as CheckCircle2, Trash2, GitBranch, ChevronDown, ChevronRight,
  Sparkles, Hammer, BarChart3, ListChecks, Archive, Plus, Target, DollarSign,
  Activity, Info, Lightbulb, Users, CheckCircle, Edit3, Save, X, Gauge,
  AlertTriangle, Clock, Terminal, ShieldAlert, ArrowRight
} from 'lucide-react';
import type { BrainstormNode, ValidationResult, DeepAnalysis, ProductBlueprint, IdeaStatus, NodeType } from '@/lib/brainstorm';
import { calculateViabilityScore } from '@/lib/brainstorm';
import { promoteBrainstormNodeToProject } from '@/lib/actions/brainstorm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface NodeCardProps {
  node: BrainstormNode;
  childNodes?: BrainstormNode[];
  depth: number;
  onExplode: (node: BrainstormNode) => Promise<void>;
  onValidate: (node: BrainstormNode) => Promise<void>;
  onAnalyze: (node: BrainstormNode) => Promise<void>;
  onDevelop: (node: BrainstormNode) => Promise<void>;
  onEnhance?: (node: BrainstormNode) => Promise<void>;
  onAutoFillVetting?: (node: BrainstormNode) => Promise<void>;
  onFocus?: (node: BrainstormNode) => void;
  onArchive: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onUpdateMetadata: (nodeId: string, metadata: any) => Promise<void>;
  onUpdateFields: (nodeId: string, fields: Partial<BrainstormNode>) => Promise<void>;
  onUpdateContent: (nodeId: string, content: string) => Promise<void>;
  onAddSubNode: (parentId: string, content: string, nodeType?: NodeType) => Promise<void>;
  onPromote?: (projectId: string) => void;
  explodingId: string | null;
  validatingId: string | null;
  analyzingId: string | null;
  developingId: string | null;
  enhancingId?: string | null;
  autoFillingId?: string | null;
  validationResults: Map<string, ValidationResult>;
  allNodes: BrainstormNode[];
  showArchived: boolean;
}

const DEPTH_COLORS = [
  'border-[hsl(var(--os-cyan)/0.4)] bg-[hsl(var(--os-cyan)/0.04)]',
  'border-[hsl(var(--os-emerald)/0.35)] bg-[hsl(var(--os-emerald)/0.03)]',
  'border-[hsl(var(--os-amber)/0.35)] bg-[hsl(var(--os-amber)/0.03)]',
  'border-border bg-card',
];

const DEPTH_ACCENT = [
  'text-[hsl(var(--os-cyan))]',
  'text-[hsl(var(--os-emerald))]',
  'text-[hsl(var(--os-amber))]',
  'text-muted-foreground',
];

const nodeTypeBadgeStyles: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  Idea: {
    bg: 'bg-[hsl(var(--os-cyan)/0.1)]',
    text: 'text-[hsl(var(--os-cyan))]',
    border: 'border-[hsl(var(--os-cyan)/0.2)]',
    icon: Lightbulb,
  },
  Feature: {
    bg: 'bg-[hsl(var(--os-emerald)/0.1)]',
    text: 'text-[hsl(var(--os-emerald))]',
    border: 'border-[hsl(var(--os-emerald)/0.2)]',
    icon: Sparkles,
  },
  'User Story': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    icon: Users,
  },
  Task: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    icon: ListChecks,
  },
  Research: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    icon: Target,
  },
  Risk: {
    bg: 'bg-[hsl(var(--os-rose)/0.1)]',
    text: 'text-[hsl(var(--os-rose))]',
    border: 'border-[hsl(var(--os-rose)/0.2)]',
    icon: AlertTriangle,
  },
  Marketing: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    icon: DollarSign,
  },
};

export function NodeCard({
  node,
  childNodes = [],
  depth,
  onExplode,
  onValidate,
  onAnalyze,
  onDevelop,
  onEnhance,
  onAutoFillVetting,
  onFocus,
  onArchive,
  onDelete,
  onUpdateMetadata,
  onUpdateFields,
  onUpdateContent,
  onAddSubNode,
  onPromote,
  explodingId,
  validatingId,
  analyzingId,
  developingId,
  enhancingId,
  autoFillingId,
  validationResults,
  allNodes,
  showArchived,
}: NodeCardProps) {
  const validation = (node.metadata?.validation || validationResults.get(node.id)) as ValidationResult | undefined;
  const analysis = node.metadata?.analysis as DeepAnalysis | undefined;
  const blueprint = node.metadata?.blueprint as ProductBlueprint | undefined;

  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(
    node.idea_status !== 'Draft' ? 'vetting' : validation ? 'validation' : analysis ? 'analysis' : blueprint ? 'blueprint' : 'vetting'
  );
  const colorClass = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  const accentClass = DEPTH_ACCENT[Math.min(depth, DEPTH_ACCENT.length - 1)];
  const isExploding = explodingId === node.id;
  const isValidating = validatingId === node.id;
  const isAnalyzing = analyzingId === node.id;
  const isDeveloping = developingId === node.id;
  const isEnhancing = enhancingId === node.id;
  const isAutoFilling = autoFillingId === node.id;
  const aiSummary = node.metadata?.ai_summary as string | undefined;
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);

  const hasChildren = childNodes.length > 0;
  const isPromoted = !!node.metadata?.promoted_to_project_id;
  const promotedProjectId = node.metadata?.promoted_to_project_id as string | undefined;
  const isArchived = node.status === 'archived';

  // Manual Input States
  const [showAddSubNode, setShowAddSubNode] = useState(false);
  const [newSubNodeContent, setNewSubNodeContent] = useState('');
  const [newSubNodeType, setNewSubNodeType] = useState<NodeType>('Feature');
  const [showEditValidation, setShowEditValidation] = useState(false);
  const [showEditAnalysis, setShowEditAnalysis] = useState(false);
  const [showEditBlueprint, setShowEditBlueprint] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(node.content);

  // Vetting Local States
  const [isSavingVetting, setIsSavingVetting] = useState(false);
  const [localVetting, setLocalVetting] = useState({
    title: node.title || node.content,
    core_problem: node.core_problem || '',
    proposed_solution: node.proposed_solution || '',
    target_user_persona: node.target_user_persona || '',
    idea_status: node.idea_status,
    estimated_complexity: node.estimated_complexity || 3,
    market_need_intensity: node.market_need_intensity || 3,
    tech_stack_familiarity: node.tech_stack_familiarity || 3,
    monetization_potential: node.monetization_potential || false,
    time_to_mvp_days: node.time_to_mvp_days || 14,
    target_technology: node.target_technology || 'Web',
    dependency_risk: node.dependency_risk || '',
  });

  // Local state buffers for metadata editing
  const [localValidation, setLocalValidation] = useState<ValidationResult | undefined>(validation);
  const [localAnalysis, setLocalAnalysis] = useState<DeepAnalysis | undefined>(analysis);
  const [localBlueprint, setLocalBlueprint] = useState<ProductBlueprint | undefined>(blueprint);

  useEffect(() => {
    setLocalVetting({
      title: node.title || node.content,
      core_problem: node.core_problem || '',
      proposed_solution: node.proposed_solution || '',
      target_user_persona: node.target_user_persona || '',
      idea_status: node.idea_status,
      estimated_complexity: node.estimated_complexity || 3,
      market_need_intensity: node.market_need_intensity || 3,
      tech_stack_familiarity: node.tech_stack_familiarity || 3,
      monetization_potential: node.monetization_potential || false,
      time_to_mvp_days: node.time_to_mvp_days || 14,
      target_technology: node.target_technology || 'Web',
      dependency_risk: node.dependency_risk || '',
    });
    setEditedContent(node.content);
  }, [
    node.id,
    node.content,
    node.title,
    node.core_problem,
    node.proposed_solution,
    node.target_user_persona,
    node.idea_status,
    node.estimated_complexity,
    node.market_need_intensity,
    node.tech_stack_familiarity,
    node.monetization_potential,
    node.time_to_mvp_days,
    node.target_technology,
    node.dependency_risk,
  ]);

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const project = await promoteBrainstormNodeToProject(node.id);
      toast.success('Promoted to project!');
      if (onPromote) onPromote(project.id);
      router.push('/dashboard/build-tracker');
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error('Failed to promote to project');
    } finally {
      setPromoting(false);
    }
  };

  const verdictColor: Record<string, string> = {
    Strong: 'text-[hsl(var(--os-emerald))] bg-[hsl(var(--os-emerald)/0.1)] border-[hsl(var(--os-emerald)/0.25)]',
    Moderate: 'text-[hsl(var(--os-amber))] bg-[hsl(var(--os-amber)/0.1)] border-[hsl(var(--os-amber)/0.25)]',
    Weak: 'text-[hsl(var(--os-rose))] bg-[hsl(var(--os-rose)/0.1)] border-[hsl(var(--os-rose)/0.25)]',
  };

  const handleUpdateNodeContent = async () => {
    if (!editedContent.trim()) return;
    await onUpdateContent(node.id, editedContent);
    setIsEditingContent(false);
  };

  const handleManualAddSubNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubNodeContent.trim()) return;
    await onAddSubNode(node.id, newSubNodeContent.trim(), newSubNodeType);
    setNewSubNodeContent('');
    setNewSubNodeType('Feature');
    setShowAddSubNode(false);
    setExpanded(true);
  };

  const handleSaveValidation = async () => {
    await onUpdateMetadata(node.id, { ...node.metadata, validation: localValidation });
    setShowEditValidation(false);
  };

  const handleSaveAnalysis = async () => {
    await onUpdateMetadata(node.id, { ...node.metadata, analysis: localAnalysis });
    setShowEditAnalysis(false);
  };

  const handleSaveBlueprint = async () => {
    await onUpdateMetadata(node.id, { ...node.metadata, blueprint: localBlueprint });
    setShowEditBlueprint(false);
  };

  const handleSaveVetting = async () => {
    setIsSavingVetting(true);
    const score = calculateViabilityScore(
      localVetting.estimated_complexity,
      localVetting.market_need_intensity,
      localVetting.tech_stack_familiarity
    );
    await onUpdateFields(node.id, { ...localVetting, viability_score: score });
    setIsSavingVetting(false);
    toast.success('Idea vetting updated');
  };

  const handleStatusTransition = async (newStatus: IdeaStatus) => {
    setLocalVetting(prev => ({ ...prev, idea_status: newStatus }));
    const score = calculateViabilityScore(
      localVetting.estimated_complexity,
      localVetting.market_need_intensity,
      localVetting.tech_stack_familiarity
    );
    await onUpdateFields(node.id, { idea_status: newStatus, viability_score: score });
    toast.success(`Status updated to ${newStatus}`);
  };

  return (
    <div className={`node-appear ${depth > 0 ? 'ml-6 mt-2' : 'mt-0'} ${isArchived && !showArchived ? 'hidden' : ''}`}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-0 -ml-3 mt-5 w-3 h-px bg-border opacity-60" />
      )}

      <div className={`relative border rounded-xl p-4 transition-all duration-200 hover:shadow-md ${colorClass} ${node.type === 'ai_generated' ? 'node-ai-pulse' : ''} ${isArchived ? 'opacity-60 grayscale-[0.5]' : ''}`}
        onMouseEnter={() => onFocus?.(node)}
      >
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Expand/collapse if has children */}
          <button
            onClick={() => hasChildren && setExpanded(e => !e)}
            className={`mt-0.5 shrink-0 transition-colors ${hasChildren ? `cursor-pointer ${accentClass}` : 'text-muted-foreground/30 cursor-default'}`}
          >
            {hasChildren
              ? expanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
              : <div className="w-4 h-4 flex items-center justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${node.type === 'ai_generated' ? 'bg-[hsl(var(--os-cyan))]' : 'bg-muted-foreground/40'}`} />
                </div>
            }
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              {node.node_type && (
                (() => {
                  const badge = nodeTypeBadgeStyles[node.node_type] || nodeTypeBadgeStyles.Idea;
                  const Icon = badge.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-[10px] ${badge.text} ${badge.bg} border ${badge.border} rounded-md px-2 py-0.5 font-bold shrink-0`}>
                      <Icon className="w-3 h-3" />
                      {node.node_type}
                    </span>
                  );
                })()
              )}
              {node.type === 'ai_generated' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--os-cyan))] bg-[hsl(var(--os-cyan)/0.1)] border border-[hsl(var(--os-cyan)/0.2)] rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              )}
              {isArchived && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary border border-border rounded-md px-1.5 py-0.5 font-medium shrink-0">
                  <Archive className="w-2.5 h-2.5" /> Archived
                </span>
              )}
              {isEditingContent ? (
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <input
                    autoFocus
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                    onKeyDown={e => e.key === 'Enter' && handleUpdateNodeContent()}
                  />
                  <button onClick={handleUpdateNodeContent} className="p-1 text-[hsl(var(--os-emerald))] hover:bg-[hsl(var(--os-emerald)/0.1)] rounded transition-colors"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => setIsEditingContent(false)} className="p-1 text-[hsl(var(--os-rose))] hover:bg-[hsl(var(--os-rose)/0.1)] rounded transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <p
                  className={`text-sm text-foreground leading-relaxed cursor-text hover:text-[hsl(var(--os-cyan))] transition-colors ${isArchived ? 'line-through opacity-70' : ''}`}
                  onClick={() => setIsEditingContent(true)}
                >
                  {node.content}
                </p>
              )}
            </div>

            {/* Child count */}
            {hasChildren && (
              <p className="mt-1 text-xs text-muted-foreground">
                {childNodes.length} branch{childNodes.length !== 1 ? 'es' : ''}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowAddSubNode(true)}
              title="Add Branch Manually"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan)/0.1)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>

            <button
              onClick={() => onExplode(node)}
              disabled={isExploding}
              title="Explode — generate sub-ideas with AI"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan)/0.1)] transition-all disabled:opacity-50"
            >
              {isExploding
                ? <span className="w-3.5 h-3.5 border border-[hsl(var(--os-cyan))] border-t-transparent rounded-full animate-spin" />
                : <Zap className="w-3.5 h-3.5" />
              }
              {!isExploding && <span className="hidden sm:inline">Explode</span>}
            </button>

            {onEnhance && (
              <button
                onClick={() => onEnhance(node)}
                disabled={isEnhancing}
                title="Enhance — rewrite idea with AI"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan)/0.1)] transition-all disabled:opacity-50"
              >
                {isEnhancing
                  ? <span className="w-3.5 h-3.5 border border-[hsl(var(--os-cyan))] border-t-transparent rounded-full animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />
                }
                {!isEnhancing && <span className="hidden sm:inline">Enhance</span>}
              </button>
            )}

            {node.node_type === 'Idea' && (
              <>
                {isPromoted ? (
                  <button
                    onClick={() => router.push('/dashboard/build-tracker')}
                    title="View Project in Build Tracker"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[hsl(var(--os-cyan))] bg-[hsl(var(--os-cyan)/0.08)] hover:bg-[hsl(var(--os-cyan)/0.15)] border border-[hsl(var(--os-cyan)/0.25)] transition-all font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View Project</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePromote}
                    disabled={promoting}
                    title="Promote to Project"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all disabled:opacity-50 ${node.idea_status === 'Ready for Project Creation' ? 'bg-[hsl(var(--os-emerald))] text-white hover:bg-[hsl(var(--os-emerald-dim))]' : 'text-muted-foreground hover:text-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan)/0.1)]'}`}
                  >
                    {promoting
                      ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                      : <Hammer className="w-3.5 h-3.5" />
                    }
                    {!promoting && <span className="hidden sm:inline">Build</span>}
                  </button>
                )}

                <button
                  onClick={() => onValidate(node)}
                  disabled={isValidating}
                  title="Validate — market viability check"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-[hsl(var(--os-emerald))] hover:bg-[hsl(var(--os-emerald)/0.1)] transition-all disabled:opacity-50"
                >
                  {isValidating
                    ? <span className="w-3.5 h-3.5 border border-[hsl(var(--os-emerald))] border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />
                  }
                  {!isValidating && <span className="hidden sm:inline">Validate</span>}
                </button>

                <button
                  onClick={() => onAnalyze(node)}
                  disabled={isAnalyzing}
                  title="Analyze — Deep Market Analysis"
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all disabled:opacity-50 ${analysis ? 'text-[hsl(var(--os-cyan))] font-medium' : 'text-muted-foreground hover:text-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan)/0.1)]'}`}
                >
                  {isAnalyzing
                    ? <span className="w-3.5 h-3.5 border border-[hsl(var(--os-cyan))] border-t-transparent rounded-full animate-spin" />
                    : <BarChart3 className="w-3.5 h-3.5" />
                  }
                  {!isAnalyzing && <span className="hidden sm:inline">{analysis ? 'Analyzed' : 'Analyze'}</span>}
                </button>

                <button
                  onClick={() => onDevelop(node)}
                  disabled={isDeveloping}
                  title="Develop — Product Blueprint"
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all disabled:opacity-50 ${blueprint ? 'text-[hsl(var(--os-emerald))] font-medium' : 'text-muted-foreground hover:text-[hsl(var(--os-emerald))] hover:bg-[hsl(var(--os-emerald)/0.1)]'}`}
                >
                  {isDeveloping
                    ? <span className="w-3.5 h-3.5 border border-[hsl(var(--os-emerald))] border-t-transparent rounded-full animate-spin" />
                    : <ListChecks className="w-3.5 h-3.5" />
                  }
                  {!isDeveloping && <span className="hidden sm:inline">{blueprint ? 'Developed' : 'Develop'}</span>}
                </button>
              </>
            )}

            {!isArchived && (
              <button
                onClick={() => onArchive(node.id)}
                title="Archive node"
                className="p-1.5 rounded-md text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all"
              >
                <Archive className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => onDelete(node.id)}
              title="Delete node"
              className="p-1.5 rounded-md text-muted-foreground hover:text-[hsl(var(--os-rose))] hover:bg-[hsl(var(--os-rose)/0.1)] transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Result Tabs */}
        {node.node_type === 'Idea' && (validation || analysis || blueprint || node.idea_status) && (
          <Tabs defaultValue="vetting" value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="bg-secondary/50 border border-border/50 h-8 p-1">
              <TabsTrigger value="vetting" className="text-[10px] uppercase font-bold tracking-tight h-6">
                Vetting {node.viability_score ? `(${node.viability_score})` : ''}
              </TabsTrigger>
              {validation && (
                <TabsTrigger value="validation" className="text-[10px] uppercase font-bold tracking-tight h-6">
                  Validation
                </TabsTrigger>
              )}
              {analysis && (
                <TabsTrigger value="analysis" className="text-[10px] uppercase font-bold tracking-tight h-6">
                  Analysis
                </TabsTrigger>
              )}
              {blueprint && (
                <TabsTrigger value="blueprint" className="text-[10px] uppercase font-bold tracking-tight h-6">
                  Blueprint
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="vetting" className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="p-4 bg-secondary/30 rounded-lg border border-border/30 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[hsl(var(--os-cyan))]" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Idea Vetting & Viability</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {onAutoFillVetting && (
                      <button
                        onClick={() => onAutoFillVetting(node)}
                        disabled={isAutoFilling}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-[hsl(var(--os-cyan))] bg-[hsl(var(--os-cyan)/0.1)] hover:bg-[hsl(var(--os-cyan)/0.2)] transition-all disabled:opacity-50"
                      >
                        {isAutoFilling ? (
                          <span className="w-3 h-3 border border-[hsl(var(--os-cyan))] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        AI Auto-fill
                      </button>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      node.idea_status === 'Ready for Project Creation' ? 'bg-[hsl(var(--os-emerald)/0.1)] text-[hsl(var(--os-emerald))] border-[hsl(var(--os-emerald)/0.2)]' :
                      node.idea_status === 'Backlog' ? 'bg-[hsl(var(--os-cyan)/0.1)] text-[hsl(var(--os-cyan))] border-[hsl(var(--os-cyan)/0.2)]' :
                      node.idea_status === 'Vetting' ? 'bg-[hsl(var(--os-amber)/0.1)] text-[hsl(var(--os-amber))] border-[hsl(var(--os-amber)/0.2)]' :
                      'bg-secondary text-muted-foreground border-border'
                    }`}>
                      {node.idea_status}
                    </span>
                  </div>
                </div>

                {aiSummary && (
                  <p className="text-[11px] text-muted-foreground bg-[hsl(var(--os-cyan)/0.05)] border border-[hsl(var(--os-cyan)/0.15)] rounded-md px-3 py-2">
                    <span className="font-bold text-[hsl(var(--os-cyan))]">AI take: </span>
                    {aiSummary}
                  </p>
                )}

                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Idea Title</label>
                  <input
                    value={localVetting.title}
                    onChange={e => setLocalVetting(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-bold focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Metrics */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" /> Complexity
                        </label>
                        <select
                          value={localVetting.estimated_complexity}
                          onChange={e => setLocalVetting(prev => ({ ...prev, estimated_complexity: parseInt(e.target.value) }))}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                        >
                          <option value="1">1 (Highest)</option>
                          <option value="2">2 (High)</option>
                          <option value="3">3 (Medium)</option>
                          <option value="4">4 (Low)</option>
                          <option value="5">5 (Simple)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Target className="w-2.5 h-2.5" /> Market Need
                        </label>
                        <select
                          value={localVetting.market_need_intensity}
                          onChange={e => setLocalVetting(prev => ({ ...prev, market_need_intensity: parseInt(e.target.value) }))}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                        >
                          <option value="1">1 (Lowest)</option>
                          <option value="2">2 (Low)</option>
                          <option value="3">3 (Medium)</option>
                          <option value="4">4 (High)</option>
                          <option value="5">5 (Critical)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Terminal className="w-2.5 h-2.5" /> Tech Familiarity
                        </label>
                        <select
                          value={localVetting.tech_stack_familiarity}
                          onChange={e => setLocalVetting(prev => ({ ...prev, tech_stack_familiarity: parseInt(e.target.value) }))}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                        >
                          <option value="1">1 (Newbie)</option>
                          <option value="2">2 (Learner)</option>
                          <option value="3">3 (Proficient)</option>
                          <option value="4">4 (Expert)</option>
                          <option value="5">5 (Master)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-background/50 rounded-lg border border-border/50 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Viability Score</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xl font-black text-foreground">
                            {calculateViabilityScore(localVetting.estimated_complexity, localVetting.market_need_intensity, localVetting.tech_stack_familiarity)}
                          </div>
                          <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                        </div>
                      </div>
                      <div className="flex-1 max-w-[100px] ml-4">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              (calculateViabilityScore(localVetting.estimated_complexity, localVetting.market_need_intensity, localVetting.tech_stack_familiarity) || 0) >= 4 ? 'bg-[hsl(var(--os-emerald))]' :
                              (calculateViabilityScore(localVetting.estimated_complexity, localVetting.market_need_intensity, localVetting.tech_stack_familiarity) || 0) >= 2.5 ? 'bg-[hsl(var(--os-amber))]' :
                              'bg-[hsl(var(--os-rose))]'
                            }`}
                            style={{ width: `${((calculateViabilityScore(localVetting.estimated_complexity, localVetting.market_need_intensity, localVetting.tech_stack_familiarity) || 0) / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Days to MVP
                        </label>
                        <input
                          type="number"
                          value={localVetting.time_to_mvp_days}
                          onChange={e => setLocalVetting(prev => ({ ...prev, time_to_mvp_days: parseInt(e.target.value) }))}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" /> Monetizable?
                        </label>
                        <button
                          onClick={() => setLocalVetting(prev => ({ ...prev, monetization_potential: !prev.monetization_potential }))}
                          className={`w-full text-left px-2 py-1 rounded border text-[11px] transition-colors ${localVetting.monetization_potential ? 'bg-[hsl(var(--os-emerald)/0.1)] border-[hsl(var(--os-emerald)/0.3)] text-[hsl(var(--os-emerald))]' : 'bg-background border-border text-muted-foreground'}`}
                        >
                          {localVetting.monetization_potential ? 'Yes, Profit potential' : 'Not currently'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Hammer className="w-2.5 h-2.5" /> Target Tech
                      </label>
                      <select
                        value={localVetting.target_technology}
                        onChange={e => setLocalVetting(prev => ({ ...prev, target_technology: e.target.value }))}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                      >
                        <option value="Web">Web (Next.js/React)</option>
                        <option value="Mobile">Mobile (iOS/Android)</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Extension">Browser Extension</option>
                        <option value="AI/ML">AI / Machine Learning</option>
                        <option value="Web3">Web3 / Crypto</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column: Descriptions */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Core Problem</label>
                      <textarea
                        value={localVetting.core_problem}
                        onChange={e => setLocalVetting(prev => ({ ...prev, core_problem: e.target.value }))}
                        placeholder="What specific pain point does this solve?"
                        className="w-full h-16 bg-background border border-border rounded px-2 py-1.5 text-[11px] resize-none focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Proposed Solution</label>
                      <textarea
                        value={localVetting.proposed_solution}
                        onChange={e => setLocalVetting(prev => ({ ...prev, proposed_solution: e.target.value }))}
                        placeholder="How will you solve the problem?"
                        className="w-full h-16 bg-background border border-border rounded px-2 py-1.5 text-[11px] resize-none focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Persona</label>
                      <input
                        value={localVetting.target_user_persona}
                        onChange={e => setLocalVetting(prev => ({ ...prev, target_user_persona: e.target.value }))}
                        placeholder="Who is your ideal customer?"
                        className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-[hsl(var(--os-amber))]" /> Dependency Risk
                      </label>
                      <input
                        value={localVetting.dependency_risk}
                        onChange={e => setLocalVetting(prev => ({ ...prev, dependency_risk: e.target.value }))}
                        placeholder="Third-party APIs, platform constraints?"
                        className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-[hsl(var(--os-cyan))]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                   <div className="flex items-center gap-1.5">
                    {node.idea_status === 'Draft' && (
                      <button
                        onClick={() => handleStatusTransition('Vetting')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--os-amber)/0.1)] hover:bg-[hsl(var(--os-amber)/0.2)] text-[hsl(var(--os-amber))] text-[10px] font-bold rounded-lg transition-all"
                      >
                        Start Vetting <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {node.idea_status === 'Vetting' && (
                      <button
                        onClick={() => handleStatusTransition('Backlog')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--os-cyan)/0.1)] hover:bg-[hsl(var(--os-cyan)/0.2)] text-[hsl(var(--os-cyan))] text-[10px] font-bold rounded-lg transition-all"
                      >
                        Move to Backlog <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {node.idea_status === 'Backlog' && (
                      <button
                        onClick={() => handleStatusTransition('Ready for Project Creation')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--os-emerald)/0.1)] hover:bg-[hsl(var(--os-emerald)/0.2)] text-[hsl(var(--os-emerald))] text-[10px] font-bold rounded-lg transition-all"
                      >
                        Ready to Build! <CheckCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSaveVetting}
                    disabled={isSavingVetting}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[hsl(var(--os-cyan))] hover:bg-[hsl(var(--os-cyan-dim))] text-white text-[10px] font-bold rounded-lg transition-all shadow-sm"
                  >
                    {isSavingVetting ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                    Save Vetting Data
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="validation" className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {validation && (
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${verdictColor[validation.verdict]}`}>
                        {validation.verdict}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-3 rounded-sm transition-all ${i < validation.score
                              ? validation.score >= 7 ? 'bg-[hsl(var(--os-emerald))]' : validation.score >= 4 ? 'bg-[hsl(var(--os-amber))]' : 'bg-[hsl(var(--os-rose))]'
                              : 'bg-muted'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1 font-bold">{validation.score}/10</span>
                      </div>
                    </div>
                    <button onClick={() => setShowEditValidation(true)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                    <div>
                      <p className="text-[hsl(var(--os-emerald))] font-bold text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3" /> Strengths
                      </p>
                      <ul className="space-y-1">
                        {validation.strengths?.map((s, i) => (
                          <li key={i} className="text-muted-foreground/80 leading-relaxed flex gap-2">
                            <span className="text-[hsl(var(--os-emerald))] font-bold">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--os-rose))] font-bold text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                        <Info className="w-3 h-3" /> Risks
                      </p>
                      <ul className="space-y-1">
                        {validation.risks?.map((r, i) => (
                          <li key={i} className="text-muted-foreground/80 leading-relaxed flex gap-2">
                            <span className="text-[hsl(var(--os-rose))] font-bold">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {validation.suggestion && (
                    <div className="text-[11px] text-muted-foreground bg-background/40 rounded-lg px-3 py-2 border border-border/20 flex gap-2.5 leading-relaxed">
                      <Lightbulb className="w-3.5 h-3.5 text-[hsl(var(--os-cyan))] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[hsl(var(--os-cyan))] uppercase text-[9px] block mb-0.5">AI Suggestion</span>
                        {validation.suggestion}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {analysis && (
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-[hsl(var(--os-cyan))]" /> Market Analysis
                    </h4>
                    <button onClick={() => setShowEditAnalysis(true)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-background/40 rounded border border-border/20">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[hsl(var(--os-cyan))] uppercase mb-1">
                        <Target className="w-3 h-3" /> Market Fit
                      </div>
                      <div className="text-lg font-black">{analysis.marketFit.score}/10</div>
                      <p className="text-[9px] text-muted-foreground font-medium truncate" title={analysis.marketFit.targetAudience}>{analysis.marketFit.targetAudience}</p>
                    </div>
                    <div className="p-2 bg-background/40 rounded border border-border/20">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[hsl(var(--os-emerald))] uppercase mb-1">
                        <DollarSign className="w-3 h-3" /> Valuation
                      </div>
                      <div className="text-lg font-black">{analysis.valuation.potential}</div>
                      <p className="text-[9px] text-muted-foreground font-medium truncate">{analysis.valuation.estimatedTAM}</p>
                    </div>
                    <div className="p-2 bg-background/40 rounded border border-border/20">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[hsl(var(--os-amber))] uppercase mb-1">
                        <Activity className="w-3 h-3" /> Feasibility
                      </div>
                      <div className="text-lg font-black">{analysis.feasibility.score}/10</div>
                      <p className="text-[9px] text-muted-foreground font-medium truncate">{analysis.feasibility.timeToMVP}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Pain Points</h5>
                      <ul className="text-[10px] space-y-1.5">
                        {analysis.marketFit.painPoints.map((p, i) => <li key={i} className="flex gap-2 text-muted-foreground/80 leading-snug"><span className="text-[hsl(var(--os-cyan))]">•</span> {p}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Monetization</h5>
                      <ul className="text-[10px] space-y-1.5">
                        {analysis.valuation.monetizationModels.map((m, i) => <li key={i} className="flex gap-2 text-muted-foreground/80 leading-snug"><span className="text-[hsl(var(--os-emerald))]">•</span> {m}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="blueprint" className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {blueprint && (
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/30 space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-[hsl(var(--os-emerald))]" /> Product Blueprint
                    </h4>
                    <button onClick={() => setShowEditBlueprint(true)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-[hsl(var(--os-cyan))]" />
                        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User Personas</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {blueprint.personas.map((p, i) => (
                          <div key={i} className="bg-background/40 p-2.5 rounded border border-border/20 shadow-sm">
                            <div className="font-bold text-[11px] text-foreground">{p.name}</div>
                            <div className="text-[9px] font-medium text-[hsl(var(--os-cyan))] uppercase mb-1.5">{p.role}</div>
                            <div className="text-[9px] text-muted-foreground/80 italic leading-snug line-clamp-2">Goal: {p.goals[0]}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--os-emerald))]" />
                        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Must-Have Features</h5>
                      </div>
                      <div className="grid gap-1.5">
                        {blueprint.features.filter(f => f.priority === 'Must-have').map((f, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 text-[10px] bg-background/40 px-3 py-2 rounded border border-border/10">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{f.name}</span>
                              <span className="text-[9px] text-muted-foreground line-clamp-1">{f.description}</span>
                            </div>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold bg-[hsl(var(--os-emerald)/0.2)] text-[hsl(var(--os-emerald))] border border-[hsl(var(--os-emerald)/0.3)]">Critical</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Manual Input Dialogs */}
        <Dialog open={showAddSubNode} onOpenChange={setShowAddSubNode}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[hsl(var(--os-cyan))]" />
                Add Branch to &ldquo;{node.content.slice(0, 30)}...&rdquo;
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleManualAddSubNode} className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Sub-Idea / Branch Content</label>
                <input
                  autoFocus
                  placeholder="Enter your sub-idea..."
                  value={newSubNodeContent}
                  onChange={e => setNewSubNodeContent(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--os-cyan))]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Branch Type</label>
                <select
                  value={newSubNodeType}
                  onChange={e => setNewSubNodeType(e.target.value as NodeType)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--os-cyan))]"
                >
                  <option value="Feature">Feature (Capability/Function)</option>
                  <option value="User Story">User Story (Interaction Scenario)</option>
                  <option value="Task">Task (To-do / Implementation Step)</option>
                  <option value="Research">Research (Competitor/Market Analysis)</option>
                  <option value="Risk">Risk (Technical/Market Risk)</option>
                  <option value="Marketing">Marketing (Growth/Distribution Idea)</option>
                </select>
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setShowAddSubNode(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-[hsl(var(--os-cyan))] text-white rounded-lg hover:bg-[hsl(var(--os-cyan-dim))] font-medium">Add Branch</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Validation Editor */}
        <Dialog open={showEditValidation} onOpenChange={(open) => { if (open) setLocalValidation(validation); setShowEditValidation(open); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Market Validation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Verdict</label>
                  <select
                    value={localValidation?.verdict || 'Moderate'}
                    onChange={e => setLocalValidation({ ...(localValidation || { score: 0, strengths: [], risks: [], suggestion: '' }), verdict: e.target.value as any })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Strong">Strong</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Weak">Weak</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Score (0-10)</label>
                  <input
                    type="number" min="0" max="10"
                    value={localValidation?.score || 0}
                    onChange={e => setLocalValidation({ ...(localValidation || { verdict: 'Moderate', strengths: [], risks: [], suggestion: '' }), score: parseInt(e.target.value) })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Strengths (one per line)</label>
                <textarea
                  value={localValidation?.strengths?.join('\n') || ''}
                  onChange={e => setLocalValidation({ ...(localValidation || { score: 0, verdict: 'Moderate', risks: [], suggestion: '' }), strengths: e.target.value.split('\n').filter(s => s.trim()) })}
                  className="w-full h-24 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Risks (one per line)</label>
                <textarea
                  value={localValidation?.risks?.join('\n') || ''}
                  onChange={e => setLocalValidation({ ...(localValidation || { score: 0, verdict: 'Moderate', strengths: [], suggestion: '' }), risks: e.target.value.split('\n').filter(s => s.trim()) })}
                  className="w-full h-24 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Suggestion</label>
                <textarea
                  value={localValidation?.suggestion || ''}
                  onChange={e => setLocalValidation({ ...(localValidation || { score: 0, verdict: 'Moderate', strengths: [], risks: [] }), suggestion: e.target.value })}
                  className="w-full h-20 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowEditValidation(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
              <button onClick={handleSaveValidation} className="px-6 py-2 bg-[hsl(var(--os-cyan))] text-white rounded-lg font-bold">Save Changes</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Analysis Editor */}
        <Dialog open={showEditAnalysis} onOpenChange={(open) => { if (open) setLocalAnalysis(analysis); setShowEditAnalysis(open); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Market Analysis Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-[hsl(var(--os-cyan))]">Market Fit</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground">Score</label>
                    <input type="number" value={localAnalysis?.marketFit.score || 0} onChange={e => setLocalAnalysis({ ...(localAnalysis || { valuation: { potential: 'Medium', monetizationModels: [], estimatedTAM: '' }, feasibility: { score: 0, technicalComplexity: '', resourceRequirements: [], timeToMVP: '' }, marketFit: { score: 0, targetAudience: '', painPoints: [], competitors: [] } }), marketFit: { ...(localAnalysis?.marketFit || { score: 0, targetAudience: '', painPoints: [], competitors: [] }), score: parseInt(e.target.value) } })} className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground">Target Audience</label>
                    <input value={localAnalysis?.marketFit.targetAudience || ''} onChange={e => setLocalAnalysis({ ...(localAnalysis || { valuation: { potential: 'Medium', monetizationModels: [], estimatedTAM: '' }, feasibility: { score: 0, technicalComplexity: '', resourceRequirements: [], timeToMVP: '' }, marketFit: { score: 0, targetAudience: '', painPoints: [], competitors: [] } }), marketFit: { ...(localAnalysis?.marketFit || { score: 0, targetAudience: '', painPoints: [], competitors: [] }), targetAudience: e.target.value } })} className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-[hsl(var(--os-emerald))]">Valuation</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground">Potential</label>
                    <select value={localAnalysis?.valuation.potential || 'Medium'} onChange={e => setLocalAnalysis({ ...(localAnalysis || { marketFit: { score: 0, targetAudience: '', painPoints: [], competitors: [] }, feasibility: { score: 0, technicalComplexity: '', resourceRequirements: [], timeToMVP: '' }, valuation: { potential: 'Medium', monetizationModels: [], estimatedTAM: '' } }), valuation: { ...(localAnalysis?.valuation || { potential: 'Medium', monetizationModels: [], estimatedTAM: '' }), potential: e.target.value as any } })} className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs">
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground">Estimated TAM</label>
                    <input value={localAnalysis?.valuation.estimatedTAM || ''} onChange={e => setLocalAnalysis({ ...(localAnalysis || { marketFit: { score: 0, targetAudience: '', painPoints: [], competitors: [] }, feasibility: { score: 0, technicalComplexity: '', resourceRequirements: [], timeToMVP: '' }, valuation: { potential: 'Medium', monetizationModels: [], estimatedTAM: '' } }), valuation: { ...(localAnalysis?.valuation || { potential: 'Medium', monetizationModels: [], estimatedTAM: '' }), estimatedTAM: e.target.value } })} className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Pain Points (comma separated)</label>
                  <textarea value={localAnalysis?.marketFit.painPoints.join(', ') || ''} onChange={e => setLocalAnalysis({ ...(localAnalysis || { valuation: { potential: 'Medium', monetizationModels: [], estimatedTAM: '' }, feasibility: { score: 0, technicalComplexity: '', resourceRequirements: [], timeToMVP: '' }, marketFit: { score: 0, targetAudience: '', painPoints: [], competitors: [] } }), marketFit: { ...(localAnalysis?.marketFit || { score: 0, targetAudience: '', painPoints: [], competitors: [] }), painPoints: e.target.value.split(',').map(s => s.trim()) } })} className="w-full h-24 bg-secondary border border-border rounded px-2 py-1 text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Monetization (comma separated)</label>
                  <textarea value={localAnalysis?.valuation.monetizationModels.join(', ') || ''} onChange={e => setLocalAnalysis({ ...(localAnalysis || { marketFit: { score: 0, targetAudience: '', painPoints: [], competitors: [] }, feasibility: { score: 0, technicalComplexity: '', resourceRequirements: [], timeToMVP: '' }, valuation: { potential: 'Medium', monetizationModels: [], estimatedTAM: '' } }), valuation: { ...(localAnalysis?.valuation || { potential: 'Medium', monetizationModels: [], estimatedTAM: '' }), monetizationModels: e.target.value.split(',').map(s => s.trim()) } })} className="w-full h-24 bg-secondary border border-border rounded px-2 py-1 text-xs" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowEditAnalysis(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
              <button onClick={handleSaveAnalysis} className="px-6 py-2 bg-[hsl(var(--os-cyan))] text-white rounded-lg font-bold">Save Analysis</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Blueprint Editor */}
        <Dialog open={showEditBlueprint} onOpenChange={(open) => { if (open) setLocalBlueprint(blueprint); setShowEditBlueprint(open); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Product Blueprint — Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[75vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Product Description</label>
                <textarea
                  value={localBlueprint?.description || ''}
                  onChange={e => setLocalBlueprint({ ...(localBlueprint || { useCases: [], userStories: [], personas: [], features: [], description: '' }), description: e.target.value })}
                  className="w-full h-24 bg-secondary border border-border rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[hsl(var(--os-cyan))]">Personas</h3>
                  <button
                    onClick={() => setLocalBlueprint({ ...(localBlueprint || { useCases: [], userStories: [], personas: [], features: [], description: '' }), personas: [...(localBlueprint?.personas || []), { name: 'New Persona', role: 'Role', goals: ['Goal 1'] }] })}
                    className="text-[10px] bg-secondary hover:bg-muted px-2 py-1 rounded border border-border"
                  >
                    Add Persona
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {localBlueprint?.personas.map((p, idx) => (
                    <div key={idx} className="p-3 bg-secondary/50 rounded-lg border border-border relative group">
                      <button
                        onClick={() => setLocalBlueprint({ ...(localBlueprint || { useCases: [], userStories: [], personas: [], features: [], description: '' }), personas: localBlueprint?.personas.filter((_, i) => i !== idx) || [] })}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-[hsl(var(--os-rose))] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <input value={p.name} onChange={e => { const newP = [...(localBlueprint?.personas || [])]; newP[idx].name = e.target.value; setLocalBlueprint({ ...(localBlueprint!), personas: newP }); }} className="w-full bg-transparent font-bold text-xs mb-1 focus:outline-none" />
                      <input value={p.role} onChange={e => { const newP = [...(localBlueprint?.personas || [])]; newP[idx].role = e.target.value; setLocalBlueprint({ ...(localBlueprint!), personas: newP }); }} className="w-full bg-transparent text-[10px] text-[hsl(var(--os-cyan))] uppercase mb-2 focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowEditBlueprint(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
              <button onClick={handleSaveBlueprint} className="px-6 py-2 bg-[hsl(var(--os-emerald))] text-white rounded-lg font-bold">Save Blueprint</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative pl-3 border-l border-border/40 ml-4 mt-1 flex flex-col">
          {childNodes.map(child => {
            const grandChildren = allNodes.filter(n => n.parent_id === child.id);
            return (
              <NodeCard
                key={child.id}
                node={child}
                childNodes={grandChildren}
                depth={depth + 1}
                onExplode={onExplode}
                onValidate={onValidate}
                onAnalyze={onAnalyze}
                onDevelop={onDevelop}
                onEnhance={onEnhance}
                onAutoFillVetting={onAutoFillVetting}
                onFocus={onFocus}
                onArchive={onArchive}
                onDelete={onDelete}
                onPromote={onPromote}
                onUpdateMetadata={onUpdateMetadata}
                onUpdateFields={onUpdateFields}
                onUpdateContent={onUpdateContent}
                onAddSubNode={onAddSubNode}
                explodingId={explodingId}
                validatingId={validatingId}
                analyzingId={analyzingId}
                developingId={developingId}
                enhancingId={enhancingId}
                autoFillingId={autoFillingId}
                validationResults={validationResults}
                allNodes={allNodes}
                showArchived={showArchived}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
