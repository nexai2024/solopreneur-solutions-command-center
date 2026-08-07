export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string;
          display_name?: string;
          avatar_url?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string;
          created_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          icon?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          icon?: string;
          status?: string;
          created_at?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          access_level: string;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          access_level?: string;
          granted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string;
          access_level?: string;
          granted_at?: string;
        };
      };
      brainstorm_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      brainstorm_nodes: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          parent_id: string | null;
          content: string;
          type: string;
          node_type: string;
          metadata: Json;
          position_x: number;
          position_y: number;
          created_at: string;
          title: string | null;
          core_problem: string | null;
          proposed_solution: string | null;
          target_user_persona: string | null;
          idea_status: string;
          estimated_complexity: number | null;
          market_need_intensity: number | null;
          tech_stack_familiarity: number | null;
          monetization_potential: boolean | null;
          time_to_mvp_days: number | null;
          target_technology: string | null;
          dependency_risk: string | null;
          viability_score: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          parent_id?: string | null;
          content: string;
          type?: string;
          node_type?: string;
          metadata?: Json;
          position_x?: number;
          position_y?: number;
          created_at?: string;
          title?: string | null;
          core_problem?: string | null;
          proposed_solution?: string | null;
          target_user_persona?: string | null;
          idea_status?: string;
          estimated_complexity?: number | null;
          market_need_intensity?: number | null;
          tech_stack_familiarity?: number | null;
          monetization_potential?: boolean | null;
          time_to_mvp_days?: number | null;
          target_technology?: string | null;
          dependency_risk?: string | null;
          viability_score?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          parent_id?: string | null;
          content?: string;
          type?: string;
          node_type?: string;
          metadata?: Json;
          position_x?: number;
          position_y?: number;
          created_at?: string;
          title?: string | null;
          core_problem?: string | null;
          proposed_solution?: string | null;
          target_user_persona?: string | null;
          idea_status?: string;
          estimated_complexity?: number | null;
          market_need_intensity?: number | null;
          tech_stack_familiarity?: number | null;
          monetization_potential?: boolean | null;
          time_to_mvp_days?: number | null;
          target_technology?: string | null;
          dependency_risk?: string | null;
          viability_score?: number | null;
        };
      };
      marketing_campaigns: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          platform: string | null;
          status: string;
          budget: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          platform?: string | null;
          status?: string;
          budget?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          platform?: string | null;
          status?: string;
          budget?: number;
          created_at?: string;
        };
      };
      revenue_plans: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          amount: number;
          currency: string;
          interval: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          amount: number;
          currency?: string;
          interval?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          amount?: number;
          currency?: string;
          interval?: string;
          created_at?: string;
        };
      };
      revenue_customers: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          name: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          name?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          email?: string;
          name?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      revenue_subscriptions: {
        Row: {
          id: string;
          project_id: string;
          customer_id: string;
          plan_id: string;
          status: string;
          current_period_start: string;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          customer_id: string;
          plan_id: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          customer_id?: string;
          plan_id?: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string | null;
          created_at?: string;
        };
      };
      revenue_transactions: {
        Row: {
          id: string;
          project_id: string;
          customer_id: string;
          subscription_id: string | null;
          amount: number;
          currency: string;
          status: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          customer_id: string;
          subscription_id?: string | null;
          amount: number;
          currency?: string;
          status?: string;
          type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          customer_id?: string;
          subscription_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          type?: string;
          created_at?: string;
        };
      };
    };
  };
}
