export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          logo_url: string | null
          color_scheme: Json | null
          settings: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          logo_url?: string | null
          color_scheme?: Json | null
          settings?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          color_scheme?: Json | null
          settings?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          workspace_name: string | null
          subscription_tier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          workspace_name?: string | null
          subscription_tier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          workspace_name?: string | null
          subscription_tier?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          definition: Json
          triggers: string[] | null
          variables: Json | null
          settings: Json | null
          tags: string[] | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          definition: Json
          triggers?: string[] | null
          variables?: Json | null
          settings?: Json | null
          tags?: string[] | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          definition?: Json
          triggers?: string[] | null
          variables?: Json | null
          settings?: Json | null
          tags?: string[] | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          user_id: string
          status: string
          input_data: Json | null
          output_data: Json | null
          error_message: string | null
          started_at: string
          completed_at: string | null
          duration_ms: number | null
          trigger_type: string | null
          trigger_data: Json | null
          execution_logs: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id: string
          status?: string
          input_data?: Json | null
          output_data?: Json | null
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          trigger_type?: string | null
          trigger_data?: Json | null
          execution_logs?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string
          status?: string
          input_data?: Json | null
          output_data?: Json | null
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          trigger_type?: string | null
          trigger_data?: Json | null
          execution_logs?: Json | null
          created_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: string
          account_id: string
          account_name: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          credentials: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          account_id: string
          account_name: string
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          credentials?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          account_id?: string
          account_name?: string
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          credentials?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      workflow_schedules: {
        Row: {
          id: string
          workflow_id: string
          user_id: string
          cron_expression: string
          timezone: string | null
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id: string
          cron_expression: string
          timezone?: string | null
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string
          cron_expression?: string
          timezone?: string | null
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_endpoints: {
        Row: {
          id: string
          workflow_id: string
          user_id: string
          endpoint_id: string
          method: string | null
          headers: Json | null
          is_active: boolean
          last_triggered_at: string | null
          trigger_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id: string
          endpoint_id: string
          method?: string | null
          headers?: Json | null
          is_active?: boolean
          last_triggered_at?: string | null
          trigger_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string
          endpoint_id?: string
          method?: string | null
          headers?: Json | null
          is_active?: boolean
          last_triggered_at?: string | null
          trigger_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      social_posts: {
        Row: {
          id: string
          user_id: string
          workflow_execution_id: string | null
          platform: string
          post_id: string | null
          content: string
          media_urls: string[] | null
          scheduled_at: string | null
          published_at: string | null
          status: string
          error_message: string | null
          engagement_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workflow_execution_id?: string | null
          platform: string
          post_id?: string | null
          content: string
          media_urls?: string[] | null
          scheduled_at?: string | null
          published_at?: string | null
          status?: string
          error_message?: string | null
          engagement_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workflow_execution_id?: string | null
          platform?: string
          post_id?: string | null
          content?: string
          media_urls?: string[] | null
          scheduled_at?: string | null
          published_at?: string | null
          status?: string
          error_message?: string | null
          engagement_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      content_generations: {
        Row: {
          id: string
          user_id: string
          workflow_execution_id: string | null
          prompt: string
          content_type: string
          generated_content: string
          platforms: string[] | null
          ai_provider: string | null
          tokens_used: number | null
          cost_cents: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workflow_execution_id?: string | null
          prompt: string
          content_type: string
          generated_content: string
          platforms?: string[] | null
          ai_provider?: string | null
          tokens_used?: number | null
          cost_cents?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workflow_execution_id?: string | null
          prompt?: string
          content_type?: string
          generated_content?: string
          platforms?: string[] | null
          ai_provider?: string | null
          tokens_used?: number | null
          cost_cents?: number | null
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_preview: string
          permissions: Json | null
          last_used_at: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_preview: string
          permissions?: Json | null
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_preview?: string
          permissions?: Json | null
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      usage_analytics: {
        Row: {
          id: string
          user_id: string
          date: string
          workflow_executions: number | null
          social_posts: number | null
          ai_generations: number | null
          api_calls: number | null
          webhook_triggers: number | null
          tokens_used: number | null
          cost_cents: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          workflow_executions?: number | null
          social_posts?: number | null
          ai_generations?: number | null
          api_calls?: number | null
          webhook_triggers?: number | null
          tokens_used?: number | null
          cost_cents?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          workflow_executions?: number | null
          social_posts?: number | null
          ai_generations?: number | null
          api_calls?: number | null
          webhook_triggers?: number | null
          tokens_used?: number | null
          cost_cents?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}