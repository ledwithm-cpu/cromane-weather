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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_eval_cases: {
        Row: {
          confirmed: boolean
          created_at: string
          expected_verdict: string
          location_id: string
          notes: string | null
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          expected_verdict: string
          location_id: string
          notes?: string | null
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          expected_verdict?: string
          location_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_eval_cases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "agent_listing_registry"
            referencedColumns: ["location_id"]
          },
        ]
      }
      agent_listing_registry: {
        Row: {
          active: boolean
          country: string | null
          county: string | null
          last_checked_at: string | null
          lat: number | null
          location_id: string
          lon: number | null
          place_name: string
          sauna_name: string
          sauna_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          country?: string | null
          county?: string | null
          last_checked_at?: string | null
          lat?: number | null
          location_id: string
          lon?: number | null
          place_name: string
          sauna_name: string
          sauna_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          country?: string | null
          county?: string | null
          last_checked_at?: string | null
          lat?: number | null
          location_id?: string
          lon?: number | null
          place_name?: string
          sauna_name?: string
          sauna_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_run_steps: {
        Row: {
          created_at: string
          id: number
          kind: string
          location_id: string | null
          name: string | null
          payload: Json | null
          run_id: string
          step_no: number
        }
        Insert: {
          created_at?: string
          id?: number
          kind: string
          location_id?: string | null
          name?: string | null
          payload?: Json | null
          run_id: string
          step_no: number
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string
          location_id?: string | null
          name?: string | null
          payload?: Json | null
          run_id?: string
          step_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent: string
          error: string | null
          finished_at: string | null
          id: string
          input_tokens: number
          listings_checked: number
          llm_calls: number
          mode: string
          model: string | null
          output_tokens: number
          prompt_version: string | null
          started_at: string
          status: string
          summary: Json | null
          web_searches: number
        }
        Insert: {
          agent?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input_tokens?: number
          listings_checked?: number
          llm_calls?: number
          mode?: string
          model?: string | null
          output_tokens?: number
          prompt_version?: string | null
          started_at?: string
          status?: string
          summary?: Json | null
          web_searches?: number
        }
        Update: {
          agent?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input_tokens?: number
          listings_checked?: number
          llm_calls?: number
          mode?: string
          model?: string | null
          output_tokens?: number
          prompt_version?: string | null
          started_at?: string
          status?: string
          summary?: Json | null
          web_searches?: number
        }
        Relationships: []
      }
      booking_clicks: {
        Row: {
          created_at: string
          id: string
          location_id: string
          path: string | null
          sauna_name: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          path?: string | null
          sauna_name?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          path?: string | null
          sauna_name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      bucket_list_items: {
        Row: {
          created_at: string
          id: string
          location_id: string
          priority_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          priority_index?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          priority_index?: number
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string
          token?: string
        }
        Relationships: []
      }
      lightning_cache: {
        Row: {
          alert_level: number
          bearing_compass: string
          bearing_deg: number
          cache_key: string
          created_at: string
          distance_km: number
          id: string
          lat: number
          lon: number
          time_ns: number
        }
        Insert: {
          alert_level: number
          bearing_compass: string
          bearing_deg: number
          cache_key: string
          created_at?: string
          distance_km: number
          id?: string
          lat: number
          lon: number
          time_ns: number
        }
        Update: {
          alert_level?: number
          bearing_compass?: string
          bearing_deg?: number
          cache_key?: string
          created_at?: string
          distance_km?: number
          id?: string
          lat?: number
          lon?: number
          time_ns?: number
        }
        Relationships: []
      }
      listing_snapshots: {
        Row: {
          checked_at: string
          confidence: number | null
          evidence: Json | null
          final_url: string | null
          http_status: number | null
          id: string
          location_id: string
          run_id: string | null
          url_kind: string | null
          used_llm: boolean
          verdict: string
        }
        Insert: {
          checked_at?: string
          confidence?: number | null
          evidence?: Json | null
          final_url?: string | null
          http_status?: number | null
          id?: string
          location_id: string
          run_id?: string | null
          url_kind?: string | null
          used_llm?: boolean
          verdict: string
        }
        Update: {
          checked_at?: string
          confidence?: number | null
          evidence?: Json | null
          final_url?: string | null
          http_status?: number | null
          id?: string
          location_id?: string
          run_id?: string | null
          url_kind?: string | null
          used_llm?: boolean
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "agent_listing_registry"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "listing_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_update_proposals: {
        Row: {
          confidence: number
          created_at: string
          current_value: string | null
          evidence_urls: string[]
          field: string
          id: string
          location_id: string
          proposed_value: string | null
          rationale: string
          review_note: string | null
          reviewed_at: string | null
          run_id: string | null
          status: string
          verdict: string
        }
        Insert: {
          confidence: number
          created_at?: string
          current_value?: string | null
          evidence_urls?: string[]
          field: string
          id?: string
          location_id: string
          proposed_value?: string | null
          rationale: string
          review_note?: string | null
          reviewed_at?: string | null
          run_id?: string | null
          status?: string
          verdict: string
        }
        Update: {
          confidence?: number
          created_at?: string
          current_value?: string | null
          evidence_urls?: string[]
          field?: string
          id?: string
          location_id?: string
          proposed_value?: string | null
          rationale?: string
          review_note?: string | null
          reviewed_at?: string | null
          run_id?: string | null
          status?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_update_proposals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "agent_listing_registry"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "listing_update_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_subscribers: {
        Row: {
          converted_to_full_account: boolean
          county: string | null
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          converted_to_full_account?: boolean
          county?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          converted_to_full_account?: boolean
          county?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          county: string | null
          created_at: string
          email: string | null
          first_name: string | null
          home_sauna_slug: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          home_sauna_slug?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          county?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          home_sauna_slug?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notification_log: {
        Row: {
          alert_level: number
          details: Json | null
          id: string
          notification_type: string
          sent_at: string
        }
        Insert: {
          alert_level?: number
          details?: Json | null
          id?: string
          notification_type: string
          sent_at?: string
        }
        Update: {
          alert_level?: number
          details?: Json | null
          id?: string
          notification_type?: string
          sent_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      listing_review_queue: {
        Row: {
          clicks_90d: number | null
          confidence: number | null
          created_at: string | null
          current_value: string | null
          evidence_urls: string[] | null
          field: string | null
          id: string | null
          location_id: string | null
          place_name: string | null
          proposed_value: string | null
          rationale: string | null
          sauna_name: string | null
          verdict: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_update_proposals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "agent_listing_registry"
            referencedColumns: ["location_id"]
          },
        ]
      }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
