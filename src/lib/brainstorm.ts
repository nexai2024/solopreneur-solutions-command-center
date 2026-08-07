// Types and utilities for brainstorm canvas (Prisma-backed via server actions)

export type IdeaStatus = "Draft" | "Vetting" | "Backlog" | "Ready for Project Creation";
export type NodeType = "Idea" | "Feature" | "User Story" | "Task" | "Research" | "Risk" | "Marketing";

export interface ValidationResult {
  score: number;
  verdict: "Strong" | "Moderate" | "Weak";
  strengths: string[];
  risks: string[];
  suggestion: string;
}

export interface DeepAnalysis {
  marketFit: {
    score: number;
    targetAudience: string;
    painPoints: string[];
    competitors: string[];
  };
  valuation: {
    potential: "High" | "Medium" | "Low";
    monetizationModels: string[];
    estimatedTAM: string;
  };
  feasibility: {
    score: number;
    technicalComplexity: string;
    resourceRequirements: string[];
    timeToMVP: string;
  };
}

export interface ProductBlueprint {
  useCases: string[];
  userStories: string[];
  personas: Array<{ name: string; role: string; goals: string[] }>;
  features: Array<{
    name: string;
    priority: "Must-have" | "Should-have" | "Could-have";
    description: string;
  }>;
  description: string;
}

export interface BrainstormSession {
  id: string;
  user_id: string;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface BrainstormNode {
  id: string;
  session_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  type: "user_input" | "ai_generated";
  node_type: NodeType;
  status: "active" | "archived";
  metadata: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
  title: string | null;
  core_problem: string | null;
  proposed_solution: string | null;
  target_user_persona: string | null;
  idea_status: IdeaStatus;
  estimated_complexity: number | null;
  market_need_intensity: number | null;
  tech_stack_familiarity: number | null;
  monetization_potential: boolean | null;
  time_to_mvp_days: number | null;
  target_technology: string | null;
  dependency_risk: string | null;
  viability_score: number | null;
}

export function calculateViabilityScore(
  complexity: number | null,
  marketNeed: number | null,
  techFamiliarity: number | null
): number | null {
  if (complexity === null || marketNeed === null || techFamiliarity === null) return null;
  const score = complexity * 0.2 + marketNeed * 0.5 + techFamiliarity * 0.3;
  return Math.round(score * 10) / 10;
}

export function mapNodeDTOToBrainstormNode(
  dto: import("@/lib/actions/brainstorm").BrainstormNodeDTO,
  userId: string
): BrainstormNode {
  const meta = dto.metadata ?? {};
  return {
    id: dto.id,
    session_id: dto.session_id,
    user_id: userId,
    parent_id: dto.parent_id,
    content: dto.content,
    type: dto.type,
    node_type: dto.node_type as NodeType,
    status: dto.status as "active" | "archived",
    metadata: dto.metadata,
    position_x: dto.position_x,
    position_y: dto.position_y,
    created_at: dto.created_at,
    title: dto.title,
    core_problem: dto.core_problem,
    proposed_solution: dto.proposed_solution,
    target_user_persona: dto.target_user_persona,
    idea_status: (meta.idea_status as IdeaStatus) ?? "Draft",
    estimated_complexity: (meta.estimated_complexity as number) ?? null,
    market_need_intensity: (meta.market_need_intensity as number) ?? null,
    tech_stack_familiarity: (meta.tech_stack_familiarity as number) ?? null,
    monetization_potential: (meta.monetization_potential as boolean) ?? null,
    time_to_mvp_days: (meta.time_to_mvp_days as number) ?? null,
    target_technology: (meta.target_technology as string) ?? null,
    dependency_risk: (meta.dependency_risk as string) ?? null,
    viability_score: dto.viability_score,
  };
}
