export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          action_notes: string | null
          action_taken: boolean | null
          action_taken_at: string | null
          barbershop_id: string
          category: string | null
          confidence_score: number | null
          created_at: string | null
          description: string
          dismissed: boolean | null
          dismissed_at: string | null
          dismissed_reason: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          insight_type: string
          metrics_analyzed: Json | null
          potential_cost_savings: number | null
          potential_revenue_impact: number | null
          read_at: string | null
          recommendations: Json | null
          severity: string
          snapshot_id: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_notes?: string | null
          action_taken?: boolean | null
          action_taken_at?: string | null
          barbershop_id: string
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          dismissed?: boolean | null
          dismissed_at?: string | null
          dismissed_reason?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type: string
          metrics_analyzed?: Json | null
          potential_cost_savings?: number | null
          potential_revenue_impact?: number | null
          read_at?: string | null
          recommendations?: Json | null
          severity: string
          snapshot_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_notes?: string | null
          action_taken?: boolean | null
          action_taken_at?: string | null
          barbershop_id?: string
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          dismissed?: boolean | null
          dismissed_at?: string | null
          dismissed_reason?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type?: string
          metrics_analyzed?: Json | null
          potential_cost_savings?: number | null
          potential_revenue_impact?: number | null
          read_at?: string | null
          recommendations?: Json | null
          severity?: string
          snapshot_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "analytics_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          barbershop_id: string
          barbershop_name: string | null
          captured_at: string | null
          cash_flow: Json
          client_detailed_analytics: Json
          client_metrics: Json
          created_at: string | null
          employee_analytics: Json
          employee_detailed_analytics: Json
          financial_analytics: Json
          historical_data: Json
          id: string
          operational_metrics: Json
          payment_methods: Json
          period_end: string
          period_start: string
          profitability: Json
          revenue_by_source: Json
          snapshot_type: string
          updated_at: string | null
          visitor_detailed_analytics: Json | null
          visitor_metrics: Json | null
        }
        Insert: {
          barbershop_id: string
          barbershop_name?: string | null
          captured_at?: string | null
          cash_flow?: Json
          client_detailed_analytics?: Json
          client_metrics?: Json
          created_at?: string | null
          employee_analytics: Json
          employee_detailed_analytics?: Json
          financial_analytics?: Json
          historical_data?: Json
          id?: string
          operational_metrics?: Json
          payment_methods?: Json
          period_end: string
          period_start: string
          profitability?: Json
          revenue_by_source?: Json
          snapshot_type?: string
          updated_at?: string | null
          visitor_detailed_analytics?: Json | null
          visitor_metrics?: Json | null
        }
        Update: {
          barbershop_id?: string
          barbershop_name?: string | null
          captured_at?: string | null
          cash_flow?: Json
          client_detailed_analytics?: Json
          client_metrics?: Json
          created_at?: string | null
          employee_analytics?: Json
          employee_detailed_analytics?: Json
          financial_analytics?: Json
          historical_data?: Json
          id?: string
          operational_metrics?: Json
          payment_methods?: Json
          period_end?: string
          period_start?: string
          profitability?: Json
          revenue_by_source?: Json
          snapshot_type?: string
          updated_at?: string | null
          visitor_detailed_analytics?: Json | null
          visitor_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notification_settings: {
        Row: {
          barbershop_id: string
          created_at: string
          custom_agent_prompt: string | null
          id: string
          is_active: boolean
          notification_timing: Database["public"]["Enums"]["notification_timing"]
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          custom_agent_prompt?: string | null
          id?: string
          is_active?: boolean
          notification_timing?: Database["public"]["Enums"]["notification_timing"]
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          custom_agent_prompt?: string | null
          id?: string
          is_active?: boolean
          notification_timing?: Database["public"]["Enums"]["notification_timing"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notification_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          barbershop_id: string
          cancellation_reason: string | null
          client_name: string
          client_phone: string
          client_profile_id: string | null
          created_at: string
          employee_id: string
          end_time: string
          id: string
          is_subscription_appointment: boolean
          mercadopago_payment_id: string | null
          mercadopago_preference_id: string | null
          notes: string | null
          payment_link: string | null
          payment_method: string | null
          payment_status: string | null
          rescheduled_from: string | null
          rescheduled_to: string | null
          service_id: string
          source: string | null
          start_time: string
          status: string
          subscription_id: string | null
          updated_at: string
          virtual_queue_entry_id: string | null
        }
        Insert: {
          appointment_date: string
          barbershop_id: string
          cancellation_reason?: string | null
          client_name: string
          client_phone: string
          client_profile_id?: string | null
          created_at?: string
          employee_id: string
          end_time: string
          id?: string
          is_subscription_appointment?: boolean
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          notes?: string | null
          payment_link?: string | null
          payment_method?: string | null
          payment_status?: string | null
          rescheduled_from?: string | null
          rescheduled_to?: string | null
          service_id: string
          source?: string | null
          start_time: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          virtual_queue_entry_id?: string | null
        }
        Update: {
          appointment_date?: string
          barbershop_id?: string
          cancellation_reason?: string | null
          client_name?: string
          client_phone?: string
          client_profile_id?: string | null
          created_at?: string
          employee_id?: string
          end_time?: string
          id?: string
          is_subscription_appointment?: boolean
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          notes?: string | null
          payment_link?: string | null
          payment_method?: string | null
          payment_status?: string | null
          rescheduled_from?: string | null
          rescheduled_to?: string | null
          service_id?: string
          source?: string | null
          start_time?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          virtual_queue_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "payments_clean"
            referencedColumns: ["client_profile_id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_to_fkey"
            columns: ["rescheduled_to"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_virtual_queue_entry_id_fkey"
            columns: ["virtual_queue_entry_id"]
            isOneToOne: false
            referencedRelation: "virtual_queue_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_commission_settings: {
        Row: {
          auto_generate_periods: boolean
          barbershop_id: string
          created_at: string
          default_period_type: string
          id: string
          monthly_close_day: number | null
          require_signature: boolean
          updated_at: string
          weekly_close_day: number | null
        }
        Insert: {
          auto_generate_periods?: boolean
          barbershop_id: string
          created_at?: string
          default_period_type?: string
          id?: string
          monthly_close_day?: number | null
          require_signature?: boolean
          updated_at?: string
          weekly_close_day?: number | null
        }
        Update: {
          auto_generate_periods?: boolean
          barbershop_id?: string
          created_at?: string
          default_period_type?: string
          id?: string
          monthly_close_day?: number | null
          require_signature?: boolean
          updated_at?: string
          weekly_close_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_commission_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_goals: {
        Row: {
          barbershop_id: string
          created_at: string | null
          created_by_user_id: string | null
          current_value: number | null
          end_date: string | null
          goal_metric: Database["public"]["Enums"]["goal_metric"]
          goal_name: string
          goal_period: Database["public"]["Enums"]["goal_period"]
          id: string
          is_active: boolean
          last_calculated_at: string | null
          start_date: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          current_value?: number | null
          end_date?: string | null
          goal_metric?: Database["public"]["Enums"]["goal_metric"]
          goal_name: string
          goal_period?: Database["public"]["Enums"]["goal_period"]
          id?: string
          is_active?: boolean
          last_calculated_at?: string | null
          start_date: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          current_value?: number | null
          end_date?: string | null
          goal_metric?: Database["public"]["Enums"]["goal_metric"]
          goal_name?: string
          goal_period?: Database["public"]["Enums"]["goal_period"]
          id?: string
          is_active?: boolean
          last_calculated_at?: string | null
          start_date?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_goals_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_subscriptions: {
        Row: {
          amount_paid: number
          barbershop_id: string
          created_at: string
          end_date: string | null
          id: string
          mercadopago_payment_id: string | null
          mercadopago_preference_id: string | null
          payment_method: string | null
          plan_type: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid: number
          barbershop_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          payment_method?: string | null
          plan_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          barbershop_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          payment_method?: string | null
          plan_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          active: boolean | null
          address: string | null
          avatar_url: string | null
          business_hours: Json | null
          created_at: string
          email: string | null
          id: string
          mercadopago_access_token: string | null
          mercadopago_enabled: boolean | null
          mercadopago_public_key: string | null
          name: string
          owner_id: string
          phone: string | null
          plan_type: string | null
          show_categories_in_booking: boolean | null
          slogan: string | null
          slug: string
          updated_at: string
          whatsapp_business_account_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          avatar_url?: string | null
          business_hours?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_enabled?: boolean | null
          mercadopago_public_key?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan_type?: string | null
          show_categories_in_booking?: boolean | null
          slogan?: string | null
          slug: string
          updated_at?: string
          whatsapp_business_account_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          avatar_url?: string | null
          business_hours?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_enabled?: boolean | null
          mercadopago_public_key?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan_type?: string | null
          show_categories_in_booking?: boolean | null
          slogan?: string | null
          slug?: string
          updated_at?: string
          whatsapp_business_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          barbershop_id: string
          client_phone: string | null
          client_profile_id: string | null
          created_at: string | null
          current_appointment_date: string | null
          id: string
          last_message_at: string | null
          session_data: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          client_phone?: string | null
          client_profile_id?: string | null
          created_at?: string | null
          current_appointment_date?: string | null
          id?: string
          last_message_at?: string | null
          session_data?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          client_phone?: string | null
          client_profile_id?: string | null
          created_at?: string | null
          current_appointment_date?: string | null
          id?: string
          last_message_at?: string | null
          session_data?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "payments_clean"
            referencedColumns: ["client_profile_id"]
          },
        ]
      }
      chatwoot_inboxes: {
        Row: {
          barbershop_id: string
          chatwoot_account_id: number
          chatwoot_inbox_id: number
          created_at: string
          id: string
          inbox_identifier: string | null
          inbox_name: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          barbershop_id: string
          chatwoot_account_id: number
          chatwoot_inbox_id: number
          created_at?: string
          id?: string
          inbox_identifier?: string | null
          inbox_name: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          barbershop_id?: string
          chatwoot_account_id?: number
          chatwoot_inbox_id?: number
          created_at?: string
          id?: string
          inbox_identifier?: string | null
          inbox_name?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatwoot_inboxes_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      chatwoot_users: {
        Row: {
          barbershop_id: string
          chatwoot_account_id: number
          chatwoot_user_id: number
          created_at: string
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barbershop_id: string
          chatwoot_account_id: number
          chatwoot_user_id: number
          created_at?: string
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barbershop_id?: string
          chatwoot_account_id?: number
          chatwoot_user_id?: number
          created_at?: string
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatwoot_users_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback: {
        Row: {
          appointment_id: string | null
          barbershop_id: string
          client_profile_id: string
          comments: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          nps_score: number | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          barbershop_id: string
          client_profile_id: string
          comments?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          nps_score?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          barbershop_id?: string
          client_profile_id?: string
          comments?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          nps_score?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "payments_clean"
            referencedColumns: ["client_profile_id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          phone_verified: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          phone_verified?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          phone_verified?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          amount_paid: number
          auto_renewal: boolean
          barbershop_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          client_profile_id: string
          created_at: string
          duration_months: number
          end_date: string | null
          id: string
          mercadopago_preapproval_id: string | null
          mercadopago_subscription_id: string | null
          start_date: string | null
          status: string
          subscription_plan_id: string
          updated_at: string
        }
        Insert: {
          amount_paid: number
          auto_renewal?: boolean
          barbershop_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_profile_id: string
          created_at?: string
          duration_months: number
          end_date?: string | null
          id?: string
          mercadopago_preapproval_id?: string | null
          mercadopago_subscription_id?: string | null
          start_date?: string | null
          status?: string
          subscription_plan_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          auto_renewal?: boolean
          barbershop_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_profile_id?: string
          created_at?: string
          duration_months?: number
          end_date?: string | null
          id?: string
          mercadopago_preapproval_id?: string | null
          mercadopago_subscription_id?: string | null
          start_date?: string | null
          status?: string
          subscription_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "payments_clean"
            referencedColumns: ["client_profile_id"]
          },
          {
            foreignKeyName: "client_subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_period_items: {
        Row: {
          commission_transaction_id: string
          created_at: string
          id: string
          period_id: string
        }
        Insert: {
          commission_transaction_id: string
          created_at?: string
          id?: string
          period_id: string
        }
        Update: {
          commission_transaction_id?: string
          created_at?: string
          id?: string
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_period_items_commission_transaction_id_fkey"
            columns: ["commission_transaction_id"]
            isOneToOne: false
            referencedRelation: "commissions_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_period_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "commission_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_periods: {
        Row: {
          barbershop_id: string
          created_at: string
          employee_id: string
          generated_at: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_receipt_urls: string[] | null
          pdf_url: string | null
          period_end: string
          period_start: string
          period_type: string
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          employee_id: string
          generated_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_receipt_urls?: string[] | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          period_type?: string
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          employee_id?: string
          generated_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_receipt_urls?: string[] | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_periods_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions_summary: {
        Row: {
          barbershop_id: string
          created_at: string | null
          employee_id: string
          id: string
          last_updated: string | null
          total_commission_due: number
          total_commission_paid: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          last_updated?: string | null
          total_commission_due?: number
          total_commission_paid?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          last_updated?: string | null
          total_commission_due?: number
          total_commission_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_summary_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions_transactions: {
        Row: {
          appointment_id: string
          barbershop_id: string
          commission_percentage: number
          commission_value: number
          created_at: string | null
          employee_id: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          service_id: string
          service_value: number
          status: string
        }
        Insert: {
          appointment_id: string
          barbershop_id: string
          commission_percentage: number
          commission_value: number
          created_at?: string | null
          employee_id: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          service_id: string
          service_value: number
          status?: string
        }
        Update: {
          appointment_id?: string
          barbershop_id?: string
          commission_percentage?: number
          commission_value?: number
          created_at?: string | null
          employee_id?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          service_id?: string
          service_value?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_breaks: {
        Row: {
          break_type: string
          created_at: string
          day_of_week: number | null
          employee_id: string
          end_time: string
          id: string
          is_active: boolean
          specific_date: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          break_type: string
          created_at?: string
          day_of_week?: number | null
          employee_id: string
          end_time: string
          id?: string
          is_active?: boolean
          specific_date?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          break_type?: string
          created_at?: string
          day_of_week?: number | null
          employee_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          specific_date?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_breaks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_daily_availability: {
        Row: {
          availability_map: Json | null
          availability_slots: Json
          barbershop_id: string
          computed_at: string
          created_at: string
          date: string
          employee_id: string
          first_available_slot: string | null
          id: string
          is_stale: boolean
          last_available_slot: string | null
          sources_hash: string | null
          total_slots_available: number
          updated_at: string
        }
        Insert: {
          availability_map?: Json | null
          availability_slots?: Json
          barbershop_id: string
          computed_at?: string
          created_at?: string
          date: string
          employee_id: string
          first_available_slot?: string | null
          id?: string
          is_stale?: boolean
          last_available_slot?: string | null
          sources_hash?: string | null
          total_slots_available?: number
          updated_at?: string
        }
        Update: {
          availability_map?: Json | null
          availability_slots?: Json
          barbershop_id?: string
          computed_at?: string
          created_at?: string
          date?: string
          employee_id?: string
          first_available_slot?: string | null
          id?: string
          is_stale?: boolean
          last_available_slot?: string | null
          sources_hash?: string | null
          total_slots_available?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_daily_availability_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_daily_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_goals: {
        Row: {
          achieved_at: string | null
          barbershop_id: string
          base_commission_percentage: number
          created_at: string | null
          created_by_user_id: string | null
          current_value: number | null
          employee_id: string
          end_date: string | null
          goal_achieved: boolean | null
          goal_commission_percentage: number
          goal_metric: Database["public"]["Enums"]["goal_metric"]
          goal_name: string
          goal_period: Database["public"]["Enums"]["goal_period"]
          id: string
          is_active: boolean
          last_calculated_at: string | null
          start_date: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          achieved_at?: string | null
          barbershop_id: string
          base_commission_percentage?: number
          created_at?: string | null
          created_by_user_id?: string | null
          current_value?: number | null
          employee_id: string
          end_date?: string | null
          goal_achieved?: boolean | null
          goal_commission_percentage?: number
          goal_metric?: Database["public"]["Enums"]["goal_metric"]
          goal_name: string
          goal_period?: Database["public"]["Enums"]["goal_period"]
          id?: string
          is_active?: boolean
          last_calculated_at?: string | null
          start_date: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          achieved_at?: string | null
          barbershop_id?: string
          base_commission_percentage?: number
          created_at?: string | null
          created_by_user_id?: string | null
          current_value?: number | null
          employee_id?: string
          end_date?: string | null
          goal_achieved?: boolean | null
          goal_commission_percentage?: number
          goal_metric?: Database["public"]["Enums"]["goal_metric"]
          goal_name?: string
          goal_period?: Database["public"]["Enums"]["goal_period"]
          id?: string
          is_active?: boolean
          last_calculated_at?: string | null
          start_date?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_goals_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          barbershop_id: string
          created_at: string
          email: string
          employee_id: string | null
          expires_at: string
          id: string
          name: string
          phone: string | null
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          barbershop_id: string
          created_at?: string
          email: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          name: string
          phone?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          barbershop_id?: string
          created_at?: string
          email?: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          name?: string
          phone?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_services: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          service_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          avatar_url: string | null
          barbershop_id: string
          commission_percentage: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          barbershop_id: string
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          barbershop_id?: string
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          amount: number
          barbershop_id: string
          cost_type: string
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          recurrence: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          barbershop_id: string
          cost_type: string
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          recurrence?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          barbershop_id?: string
          cost_type?: string
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          recurrence?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_achievements: {
        Row: {
          achieved_at: string | null
          achieved_value: number
          achievement_percentage: number
          barbershop_id: string
          bonus_commission_generated: number | null
          bonus_commission_paid: boolean | null
          commission_payment_id: string | null
          created_at: string | null
          employee_id: string | null
          exceeded_by: number | null
          goal_id: string
          goal_type: string
          id: string
          period_end: string
          period_start: string
          target_value: number
        }
        Insert: {
          achieved_at?: string | null
          achieved_value: number
          achievement_percentage: number
          barbershop_id: string
          bonus_commission_generated?: number | null
          bonus_commission_paid?: boolean | null
          commission_payment_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          exceeded_by?: number | null
          goal_id: string
          goal_type: string
          id?: string
          period_end: string
          period_start: string
          target_value: number
        }
        Update: {
          achieved_at?: string | null
          achieved_value?: number
          achievement_percentage?: number
          barbershop_id?: string
          bonus_commission_generated?: number | null
          bonus_commission_paid?: boolean | null
          commission_payment_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          exceeded_by?: number | null
          goal_id?: string
          goal_type?: string
          id?: string
          period_end?: string
          period_start?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_achievements_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_bonus_payments: {
        Row: {
          barbershop_id: string
          bonus_amount: number
          created_at: string | null
          employee_id: string
          goal_achievement_id: string
          id: string
          linked_to_commission_period_id: string | null
          notes: string | null
          paid_at: string | null
          payment_date: string | null
          payment_method: string | null
          payment_receipt_urls: string[] | null
          payment_status: string
        }
        Insert: {
          barbershop_id: string
          bonus_amount: number
          created_at?: string | null
          employee_id: string
          goal_achievement_id: string
          id?: string
          linked_to_commission_period_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_receipt_urls?: string[] | null
          payment_status?: string
        }
        Update: {
          barbershop_id?: string
          bonus_amount?: number
          created_at?: string | null
          employee_id?: string
          goal_achievement_id?: string
          id?: string
          linked_to_commission_period_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_receipt_urls?: string[] | null
          payment_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_bonus_payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_bonus_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_bonus_payments_goal_achievement_id_fkey"
            columns: ["goal_achievement_id"]
            isOneToOne: false
            referencedRelation: "goal_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          created_by_user_id: string | null
          expiry_date: string | null
          id: string
          manufacturing_date: string | null
          product_id: string
          purchase_order_id: string | null
          quantity_available: number
          quantity_received: number
          status: string | null
          supplier_id: string | null
          unit_cost: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          created_by_user_id?: string | null
          expiry_date?: string | null
          id?: string
          manufacturing_date?: string | null
          product_id: string
          purchase_order_id?: string | null
          quantity_available: number
          quantity_received: number
          status?: string | null
          supplier_id?: string | null
          unit_cost: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          created_by_user_id?: string | null
          expiry_date?: string | null
          id?: string
          manufacturing_date?: string | null
          product_id?: string
          purchase_order_id?: string | null
          quantity_available?: number
          quantity_received?: number
          status?: string | null
          supplier_id?: string | null
          unit_cost?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          appointment_id: string | null
          barbershop_id: string
          batch_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          product_id: string
          quantity: number
          reason: string | null
          service_id: string | null
          transaction_type: string
          unit_cost: number | null
          variant_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          barbershop_id: string
          batch_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          product_id: string
          quantity: number
          reason?: string | null
          service_id?: string | null
          transaction_type: string
          unit_cost?: number | null
          variant_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          barbershop_id?: string
          batch_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          quantity?: number
          reason?: string | null
          service_id?: string | null
          transaction_type?: string
          unit_cost?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_audit_logs: {
        Row: {
          action: string
          barbershop_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          barbershop_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          barbershop_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_audit_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          barbershop_id: string
          client_name: string | null
          client_phone: string | null
          created_at: string
          description: string | null
          employee_id: string | null
          external_reference: string | null
          fee_amount: number | null
          id: string
          mercadopago_payment_id: string | null
          mercadopago_preference_id: string | null
          net_received_amount: number | null
          paid_at: string | null
          payment_method: string | null
          payment_source: string | null
          payment_type: string | null
          qr_code: string | null
          qr_code_base64: string | null
          service_id: string | null
          status: string
          tab_id: string | null
          transaction_amount: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          barbershop_id: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          external_reference?: string | null
          fee_amount?: number | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          net_received_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_source?: string | null
          payment_type?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          service_id?: string | null
          status?: string
          tab_id?: string | null
          transaction_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          barbershop_id?: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          external_reference?: string | null
          fee_amount?: number | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          net_received_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_source?: string | null
          payment_type?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          service_id?: string | null
          status?: string
          tab_id?: string | null
          transaction_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean | null
          attributes: Json | null
          created_at: string | null
          id: string
          min_stock_level: number | null
          price_adjustment: number | null
          product_id: string
          reorder_point: number | null
          retail_price: number | null
          sku: string | null
          unit_cost: number | null
          unit_size: number | null
          updated_at: string | null
          variant_name: string
        }
        Insert: {
          active?: boolean | null
          attributes?: Json | null
          created_at?: string | null
          id?: string
          min_stock_level?: number | null
          price_adjustment?: number | null
          product_id: string
          reorder_point?: number | null
          retail_price?: number | null
          sku?: string | null
          unit_cost?: number | null
          unit_size?: number | null
          updated_at?: string | null
          variant_name: string
        }
        Update: {
          active?: boolean | null
          attributes?: Json | null
          created_at?: string | null
          id?: string
          min_stock_level?: number | null
          price_adjustment?: number | null
          product_id?: string
          reorder_point?: number | null
          retail_price?: number | null
          sku?: string | null
          unit_cost?: number | null
          unit_size?: number | null
          updated_at?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barbershop_id: string
          barcode: string | null
          category_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          custom_attributes: Json | null
          default_cost: number | null
          description: string | null
          id: string
          image_urls: string[] | null
          min_stock_level: number | null
          name: string
          product_type: string
          reorder_point: number | null
          retail_price: number | null
          shelf_life_days: number | null
          sku: string | null
          stock_control_mode: string | null
          track_batches: boolean | null
          track_expiry: boolean | null
          unit_size: number | null
          unit_type: string
          updated_at: string | null
          uses_variants: boolean | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          barcode?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_attributes?: Json | null
          default_cost?: number | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          min_stock_level?: number | null
          name: string
          product_type: string
          reorder_point?: number | null
          retail_price?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          stock_control_mode?: string | null
          track_batches?: boolean | null
          track_expiry?: boolean | null
          unit_size?: number | null
          unit_type: string
          updated_at?: string | null
          uses_variants?: boolean | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          barcode?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_attributes?: Json | null
          default_cost?: number | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          min_stock_level?: number | null
          name?: string
          product_type?: string
          reorder_point?: number | null
          retail_price?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          stock_control_mode?: string | null
          track_batches?: boolean | null
          track_expiry?: boolean | null
          unit_size?: number | null
          unit_type?: string
          updated_at?: string | null
          uses_variants?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          total_cost: number | null
          unit_cost: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          total_cost?: number | null
          unit_cost: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          barbershop_id: string
          created_at: string | null
          created_by_user_id: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          shipping_cost: number | null
          status: string | null
          subtotal: number | null
          supplier_id: string
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          barbershop_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          barbershop_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      qrcodewhatsapp: {
        Row: {
          base64: string | null
          created_at: string
          id: number
          instancia: string | null
          verificador: boolean | null
        }
        Insert: {
          base64?: string | null
          created_at?: string
          id?: number
          instancia?: string | null
          verificador?: boolean | null
        }
        Update: {
          base64?: string | null
          created_at?: string
          id?: number
          instancia?: string | null
          verificador?: boolean | null
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          available_slots: Json | null
          barbershop_id: string
          created_at: string
          created_by_user_id: string | null
          employee_id: string
          exception_date: string
          id: string
          reason: string | null
          time_end: string | null
          time_start: string | null
          updated_at: string
        }
        Insert: {
          available_slots?: Json | null
          barbershop_id: string
          created_at?: string
          created_by_user_id?: string | null
          employee_id: string
          exception_date: string
          id?: string
          reason?: string | null
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
        }
        Update: {
          available_slots?: Json | null
          barbershop_id?: string
          created_at?: string
          created_by_user_id?: string | null
          employee_id?: string
          exception_date?: string
          id?: string
          reason?: string | null
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          avatar_url: string | null
          barbershop_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number | null
          parent_id: string | null
          path: string | null
          slogan: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          barbershop_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_id?: string | null
          path?: string | null
          slogan?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          barbershop_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_id?: string | null
          path?: string | null
          slogan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_product_items: {
        Row: {
          cost_per_use: number | null
          created_at: string | null
          id: string
          is_optional: boolean | null
          product_id: string
          quantity_per_service: number
          service_id: string
          unit: string
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          cost_per_use?: number | null
          created_at?: string | null
          id?: string
          is_optional?: boolean | null
          product_id: string
          quantity_per_service: number
          service_id: string
          unit: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          cost_per_use?: number | null
          created_at?: string | null
          id?: string
          is_optional?: boolean | null
          product_id?: string
          quantity_per_service?: number
          service_id?: string
          unit?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_product_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_product_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_product_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          accepts_payment: boolean | null
          active: boolean
          barbershop_id: string
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          payment_required: boolean | null
          price: number
          updated_at: string
        }
        Insert: {
          accepts_payment?: boolean | null
          active?: boolean
          barbershop_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          payment_required?: boolean | null
          price: number
          updated_at?: string
        }
        Update: {
          accepts_payment?: boolean | null
          active?: boolean
          barbershop_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          payment_required?: boolean | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_data: Json | null
          alert_type: string
          barbershop_id: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          product_id: string
          resolved_at: string | null
          severity: string
          variant_id: string | null
        }
        Insert: {
          alert_data?: Json | null
          alert_type: string
          barbershop_id: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          product_id: string
          resolved_at?: string | null
          severity: string
          variant_id?: string | null
        }
        Update: {
          alert_data?: Json | null
          alert_type?: string
          barbershop_id?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          product_id?: string
          resolved_at?: string | null
          severity?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_employees: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          subscription_plan_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          subscription_plan_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          subscription_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_employees_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          barbershop_id: string
          commission_enabled: boolean
          commission_percentage: number | null
          created_at: string
          description: string | null
          id: string
          is_employee_specific: boolean
          name: string
          price_1_month: number
          price_12_months: number
          price_6_months: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          commission_enabled?: boolean
          commission_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_employee_specific?: boolean
          name: string
          price_1_month: number
          price_12_months: number
          price_6_months: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          commission_enabled?: boolean
          commission_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_employee_specific?: boolean
          name?: string
          price_1_month?: number
          price_12_months?: number
          price_6_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          barbershop_id: string
          city: string | null
          contact_person: string | null
          created_at: string | null
          delivery_time_days: number | null
          email: string | null
          id: string
          minimum_order_value: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          tax_id: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          barbershop_id: string
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          delivery_time_days?: number | null
          email?: string | null
          id?: string
          minimum_order_value?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          barbershop_id?: string
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          delivery_time_days?: number | null
          email?: string | null
          id?: string
          minimum_order_value?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      tab_items: {
        Row: {
          created_at: string
          description: string | null
          discount: number
          employee_id: string | null
          id: string
          item_name: string
          item_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          service_id: string | null
          subtotal: number
          tab_id: string
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number
          employee_id?: string | null
          id?: string
          item_name: string
          item_type: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          subtotal?: number
          tab_id: string
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number
          employee_id?: string | null
          id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          subtotal?: number
          tab_id?: string
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tab_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_items_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      tabs: {
        Row: {
          appointment_id: string | null
          barbershop_id: string
          client_name: string
          client_phone: string | null
          client_profile_id: string | null
          closed_at: string | null
          created_at: string
          created_by_user_id: string | null
          discount: number
          id: string
          notes: string | null
          opened_at: string
          paid_amount: number
          payment_status: string
          status: string
          subtotal: number
          tab_number: string
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          barbershop_id: string
          client_name: string
          client_phone?: string | null
          client_profile_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          opened_at?: string
          paid_amount?: number
          payment_status?: string
          status?: string
          subtotal?: number
          tab_number: string
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          barbershop_id?: string
          client_name?: string
          client_phone?: string | null
          client_profile_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          opened_at?: string
          paid_amount?: number
          payment_status?: string
          status?: string
          subtotal?: number
          tab_number?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabs_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabs_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "payments_clean"
            referencedColumns: ["client_profile_id"]
          },
        ]
      }
      virtual_queue_entries: {
        Row: {
          barbershop_id: string
          client_name: string
          client_phone: string
          client_profile_id: string | null
          created_at: string
          employee_id: string | null
          estimated_arrival_minutes: number
          id: string
          notification_expires_at: string | null
          notification_sent_at: string | null
          priority_score: number | null
          reserved_slot_end: string | null
          reserved_slot_start: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          client_name: string
          client_phone: string
          client_profile_id?: string | null
          created_at?: string
          employee_id?: string | null
          estimated_arrival_minutes: number
          id?: string
          notification_expires_at?: string | null
          notification_sent_at?: string | null
          priority_score?: number | null
          reserved_slot_end?: string | null
          reserved_slot_start?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          client_name?: string
          client_phone?: string
          client_profile_id?: string | null
          created_at?: string
          employee_id?: string | null
          estimated_arrival_minutes?: number
          id?: string
          notification_expires_at?: string | null
          notification_sent_at?: string | null
          priority_score?: number | null
          reserved_slot_end?: string | null
          reserved_slot_start?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_queue_entries_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_queue_entries_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_queue_entries_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "payments_clean"
            referencedColumns: ["client_profile_id"]
          },
          {
            foreignKeyName: "virtual_queue_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_queue_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_queue_logs: {
        Row: {
          barbershop_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          queue_entry_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          queue_entry_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          queue_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_queue_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_queue_logs_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "virtual_queue_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_queue_settings: {
        Row: {
          barbershop_id: string
          buffer_percentage: number
          created_at: string
          enabled: boolean
          eta_weight: number
          id: string
          max_queue_size: number
          notification_minutes: number
          position_weight: number
          updated_at: string
          wait_time_bonus: number
        }
        Insert: {
          barbershop_id: string
          buffer_percentage?: number
          created_at?: string
          enabled?: boolean
          eta_weight?: number
          id?: string
          max_queue_size?: number
          notification_minutes?: number
          position_weight?: number
          updated_at?: string
          wait_time_bonus?: number
        }
        Update: {
          barbershop_id?: string
          buffer_percentage?: number
          created_at?: string
          enabled?: boolean
          eta_weight?: number
          id?: string
          max_queue_size?: number
          notification_minutes?: number
          position_weight?: number
          updated_at?: string
          wait_time_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "virtual_queue_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload_preview: Json | null
          response_time_ms: number | null
          status_code: number | null
          table_name: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload_preview?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          table_name: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload_preview?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          table_name?: string
          webhook_url?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          barbershop_id: string
          chatwoot_inbox_id: number | null
          connected_at: string | null
          connected_phone: string | null
          connection_status: string
          created_at: string | null
          evolution_instance_id: string | null
          id: string
          instance_name: string
          last_qr_generated_at: string | null
          qr_code_base64: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          chatwoot_inbox_id?: number | null
          connected_at?: string | null
          connected_phone?: string | null
          connection_status?: string
          created_at?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_name: string
          last_qr_generated_at?: string | null
          qr_code_base64?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          chatwoot_inbox_id?: number | null
          connected_at?: string | null
          connected_phone?: string | null
          connection_status?: string
          created_at?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_name?: string
          last_qr_generated_at?: string | null
          qr_code_base64?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payments_clean: {
        Row: {
          amount: number | null
          barbershop_id: string | null
          client_name: string | null
          client_profile_id: string | null
          created_at: string | null
          customer_type: string | null
          net_amount: number | null
          normalized_phone: string | null
          original_phone: string | null
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_type: string | null
          registered_name: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_employee_invitation: {
        Args: { invitation_token: string }
        Returns: string
      }
      auto_link_orphan_commissions: {
        Args: { p_barbershop_id: string }
        Returns: number
      }
      build_availability_map: {
        Args: { p_date: string; p_employee_id: string }
        Returns: Json
      }
      calculate_available_stock: {
        Args: {
          p_barbershop_id?: string
          p_product_id: string
          p_variant_id?: string
        }
        Returns: {
          batch_count: number
          oldest_expiry: string
          total_quantity: number
          total_value: number
          weighted_avg_cost: number
        }[]
      }
      calculate_client_clv: {
        Args: { p_barbershop_id: string; p_client_profile_id: string }
        Returns: {
          avg_ticket: number
          clv: number
          customer_type: string
          first_payment_date: string
          last_payment_date: string
          total_payments: number
        }[]
      }
      calculate_commission_amount: {
        Args: { appointment_ids_param: string[]; employee_id_param: string }
        Returns: number
      }
      calculate_fixed_costs_for_period: {
        Args: {
          p_barbershop_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: number
      }
      calculate_goal_progress: {
        Args: { p_goal_id: string; p_goal_type: string }
        Returns: number
      }
      calculate_product_total_volume: {
        Args: { p_barbershop_id?: string; p_product_id: string }
        Returns: {
          total_units: number
          total_value: number
          total_volume: number
          variants: Json
        }[]
      }
      calculate_segment_metrics: {
        Args: {
          p_barbershop_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          avg_clv: number
          avg_days_since_visit: number
          avg_frequency: number
          avg_ticket: number
          client_count: number
          segment: string
          total_clv: number
          total_revenue: number
        }[]
      }
      can_add_employee: {
        Args: { barbershop_id_param: string }
        Returns: boolean
      }
      can_add_service: {
        Args: { barbershop_id_param: string }
        Returns: boolean
      }
      can_create_appointment: {
        Args: { appointment_date_param?: string; barbershop_id_param: string }
        Returns: boolean
      }
      cancel_commission_period: {
        Args: { period_id_param: string }
        Returns: undefined
      }
      check_and_create_goal_achievement: {
        Args: { p_goal_id: string; p_goal_type: string }
        Returns: boolean
      }
      check_and_create_stock_alerts: {
        Args: { p_barbershop_id: string }
        Returns: number
      }
      check_barbershop_exists: {
        Args: { barbershop_id_param: string }
        Returns: {
          active: boolean
          id: string
          name: string
        }[]
      }
      cleanup_old_availability: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      compute_daily_availability: {
        Args: { p_date: string; p_employee_id: string }
        Returns: Json
      }
      compute_daily_availability_debug: {
        Args: { p_date: string; p_employee_id: string }
        Returns: {
          data: Json
          info: string
          step: string
        }[]
      }
      create_client_profile_from_existing: {
        Args: {
          p_barbershop_id: string
          p_custom_name?: string
          p_phone: string
          p_source_barbershop_id?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_employee_slug: {
        Args: { employee_name: string }
        Returns: string
      }
      generate_product_sku: {
        Args: {
          p_barbershop_id: string
          p_product_name: string
          p_product_type: string
        }
        Returns: string
      }
      generate_slug: {
        Args: { name: string }
        Returns: string
      }
      generate_tab_number: {
        Args: { p_barbershop_id: string }
        Returns: string
      }
      get_active_subscription_for_appointment: {
        Args: {
          p_barbershop_id: string
          p_client_profile_id: string
          p_employee_id?: string
        }
        Returns: string
      }
      get_active_subscription_for_appointment_by_phone: {
        Args: {
          p_barbershop_id: string
          p_client_phone: string
          p_employee_id?: string
        }
        Returns: string
      }
      get_appointment_availability: {
        Args: {
          p_barbershop_id: string
          p_date?: string
          p_employee_id?: string
        }
        Returns: {
          appointment_date: string
          employee_id: string
          end_time: string
          start_time: string
          status: string
        }[]
      }
      get_barbershop_for_booking: {
        Args: { barbershop_identifier: string }
        Returns: {
          avatar_url: string
          id: string
          mercadopago_enabled: boolean
          name: string
          show_categories_in_booking: boolean
          slogan: string
          slug: string
        }[]
      }
      get_barbershop_for_employee: {
        Args: { employee_email_param: string }
        Returns: {
          avatar_url: string
          business_hours: Json
          id: string
          name: string
          show_categories_in_booking: boolean
          slug: string
        }[]
      }
      get_barbershop_plan_limits: {
        Args: { barbershop_id_param: string }
        Returns: {
          max_appointments_per_month: number
          max_employees: number
          max_services: number
          plan_type: string
        }[]
      }
      get_barbershop_usage_stats: {
        Args: { barbershop_id_param: string }
        Returns: {
          active_employees: number
          active_services: number
          can_add_employee: boolean
          can_add_service: boolean
          can_create_appointment: boolean
          current_month_appointments: number
          max_appointments_per_month: number
          max_employees: number
          max_services: number
          plan_type: string
        }[]
      }
      get_daily_availability: {
        Args: { p_date: string; p_employee_id: string }
        Returns: {
          availability_slots: Json
          computed_at: string
          first_available_slot: string
          is_cached: boolean
          last_available_slot: string
          total_slots_available: number
        }[]
      }
      get_employee_commission_history: {
        Args: {
          barbershop_id_param: string
          employee_id_param: string
          end_date?: string
          start_date?: string
        }
        Returns: {
          amount: number
          commission_type: string
          created_at: string
          id: string
          notes: string
          payment_date: string
          payment_receipt_url: string
          payment_receipt_urls: string[]
          status: string
        }[]
      }
      get_employee_commission_history_with_adjustments: {
        Args: {
          barbershop_id_param: string
          employee_id_param: string
          end_date?: string
          start_date?: string
        }
        Returns: {
          adjustment_amount: number
          adjustment_type: string
          amount: number
          commission_type: string
          created_at: string
          id: string
          notes: string
          original_payment_id: string
          payment_date: string
          payment_receipt_url: string
          payment_receipt_urls: string[]
          record_type: string
          status: string
        }[]
      }
      get_employee_commission_periods_history: {
        Args: {
          barbershop_id_param: string
          employee_id_param: string
          end_date?: string
          start_date?: string
        }
        Returns: {
          commission_entries: Json
          created_at: string
          document_pdf_url: string
          id: string
          notes: string
          paid_at: string
          payment_receipt_urls: string[]
          period_end: string
          period_start: string
          period_type: string
          signature_images: string[]
          status: string
          total_amount: number
        }[]
      }
      get_employee_commission_summary: {
        Args:
          | { barbershop_id_param: string }
          | { p_barbershop_id: string; p_employee_id: string }
        Returns: {
          confirmed_appointments_count: number
          confirmed_pending_commission: number
          employee_id: string
          employee_name: string
          future_appointments_count: number
          future_commission: number
          paid_appointments_count: number
          paid_commission: number
        }[]
      }
      get_employee_id_by_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_invitation: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          barbershop_description: string
          barbershop_id: string
          barbershop_name: string
          barbershop_slug: string
          created_at: string
          email: string
          expires_at: string
          id: string
          name: string
          phone: string
          token: string
          updated_at: string
        }[]
      }
      get_safe_barbershop_data: {
        Args: { barbershop_id_param: string }
        Returns: {
          active: boolean
          address: string
          avatar_url: string
          business_hours: Json
          created_at: string
          email: string
          id: string
          mercadopago_enabled: boolean
          name: string
          owner_id: string
          phone: string
          plan_type: string
          show_categories_in_booking: boolean
          slogan: string
          slug: string
          updated_at: string
        }[]
      }
      get_safe_barbershops_list: {
        Args: { user_id_param?: string }
        Returns: {
          active: boolean
          address: string
          avatar_url: string
          business_hours: Json
          created_at: string
          email: string
          id: string
          mercadopago_enabled: boolean
          name: string
          owner_id: string
          phone: string
          plan_type: string
          show_categories_in_booking: boolean
          slogan: string
          slug: string
          updated_at: string
        }[]
      }
      get_user_profiles_in_other_barbershops: {
        Args: { p_current_barbershop_id: string; p_user_id: string }
        Returns: {
          barbershop_id: string
          barbershop_name: string
          client_name: string
          notes: string
          phone: string
        }[]
      }
      get_visitors_by_barbershop: {
        Args: { p_barbershop_id: string; p_limit?: number }
        Returns: {
          cancelled_appointments: number
          confirmed_appointments: number
          days_since_last_visit: number
          first_appointment_date: string
          last_appointment_date: string
          no_show_appointments: number
          pending_appointments: number
          total_appointments: number
          variant_names: string[]
          variant_phones: string[]
          visitor_name: string
          visitor_phone: string
        }[]
      }
      has_active_subscription: {
        Args: {
          p_barbershop_id: string
          p_client_profile_id: string
          p_employee_id?: string
        }
        Returns: boolean
      }
      has_active_subscription_by_phone: {
        Args: {
          p_barbershop_id: string
          p_client_phone: string
          p_employee_id?: string
        }
        Returns: boolean
      }
      is_active_employee_of_barbershop: {
        Args: { barbershop_id: string }
        Returns: boolean
      }
      is_barbershop_owner: {
        Args: { barbershop_id: string }
        Returns: boolean
      }
      is_client_of_barbershop: {
        Args: { barbershop_id_param: string }
        Returns: boolean
      }
      log_mercadopago_access: {
        Args: {
          _action: string
          _barbershop_id: string
          _ip_address?: unknown
          _user_agent?: string
        }
        Returns: undefined
      }
      mark_commission_as_paid: {
        Args: {
          p_payment_method?: string
          p_payment_notes?: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      normalize_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      populate_commission_period_services: {
        Args: { period_id_param: string }
        Returns: {
          services_count: number
          total_commission: number
          total_value: number
        }[]
      }
      preload_availability_batch: {
        Args: { p_barbershop_id: string; p_days_ahead?: number }
        Returns: {
          date_range_days: number
          employee_count: number
          processed_count: number
        }[]
      }
      process_commission_adjustment: {
        Args: {
          adjustment_type_param: string
          new_amount_param: number
          payment_id_param: string
          reason_param?: string
        }
        Returns: string
      }
      recalculate_commissions_summary: {
        Args: { p_barbershop_id: string; p_employee_id?: string }
        Returns: undefined
      }
      refresh_availability_map: {
        Args: { p_date: string; p_employee_id: string }
        Returns: undefined
      }
      refresh_daily_availability: {
        Args: { p_date: string; p_employee_id: string; p_force?: boolean }
        Returns: undefined
      }
      suggest_optimal_purchase: {
        Args: { p_needed_volume: number; p_product_id: string }
        Returns: {
          quantity_to_buy: number
          total_cost: number
          total_volume: number
          unit_cost: number
          unit_size: number
          variant_id: string
          variant_name: string
        }[]
      }
    }
    Enums: {
      commission_period_status:
        | "draft"
        | "pending_signature"
        | "signed"
        | "paid"
        | "cancelled"
      deduction_type: "advance" | "product_purchase" | "split_payment" | "other"
      goal_metric: "revenue" | "appointments" | "new_clients"
      goal_period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
      notification_timing: "30_minutes" | "1_hour" | "1_day"
      period_type: "individual" | "weekly" | "monthly" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      commission_period_status: [
        "draft",
        "pending_signature",
        "signed",
        "paid",
        "cancelled",
      ],
      deduction_type: ["advance", "product_purchase", "split_payment", "other"],
      goal_metric: ["revenue", "appointments", "new_clients"],
      goal_period: ["daily", "weekly", "monthly", "quarterly", "yearly"],
      notification_timing: ["30_minutes", "1_hour", "1_day"],
      period_type: ["individual", "weekly", "monthly", "custom"],
    },
  },
} as const
