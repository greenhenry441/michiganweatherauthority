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
      alert_thresholds: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string | null
          last_fired_at: string | null
          location_id: string | null
          metric: string
          op: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          last_fired_at?: string | null
          location_id?: string | null
          metric: string
          op: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          last_fired_at?: string | null
          location_id?: string | null
          metric?: string
          op?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_thresholds_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "saved_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          areas: string[]
          category: string
          custom_name: string | null
          description: string
          expires_at: string
          headline: string
          id: string
          instruction: string | null
          issued_at: string
          issuer: string
          kind: string
          severity: string
          source: string
          type_id: string | null
        }
        Insert: {
          areas?: string[]
          category?: string
          custom_name?: string | null
          description: string
          expires_at: string
          headline: string
          id?: string
          instruction?: string | null
          issued_at?: string
          issuer?: string
          kind?: string
          severity?: string
          source?: string
          type_id?: string | null
        }
        Update: {
          areas?: string[]
          category?: string
          custom_name?: string | null
          description?: string
          expires_at?: string
          headline?: string
          id?: string
          instruction?: string | null
          issued_at?: string
          issuer?: string
          kind?: string
          severity?: string
          source?: string
          type_id?: string | null
        }
        Relationships: []
      }
      command_unlock_attempts: {
        Row: {
          attempted_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      dispatcher_test_runs: {
        Row: {
          details: Json
          duration_ms: number
          error: string | null
          failed: number
          id: string
          ok: boolean
          passed: number
          ran_at: string
          source: string
          total: number
        }
        Insert: {
          details?: Json
          duration_ms?: number
          error?: string | null
          failed?: number
          id?: string
          ok: boolean
          passed?: number
          ran_at?: string
          source?: string
          total?: number
        }
        Update: {
          details?: Json
          duration_ms?: number
          error?: string | null
          failed?: number
          id?: string
          ok?: boolean
          passed?: number
          ran_at?: string
          source?: string
          total?: number
        }
        Relationships: []
      }
      mfa_email_codes: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          purpose: string
          user_id: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          purpose: string
          user_id: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          home_city: string | null
          home_lat: number | null
          home_lon: number | null
          home_zip: string | null
          id: string
          min_severity: string
          notify_alerts: boolean
          notify_categories: string[]
          notify_eas: boolean
          notify_event_types: string[]
          notify_forecast: boolean
          notify_hourly_forecast: boolean
          notify_marine: boolean
          notify_only_my_area: boolean
          updated_at: string
          work_city: string | null
          work_lat: number | null
          work_lon: number | null
          work_zip: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lon?: number | null
          home_zip?: string | null
          id: string
          min_severity?: string
          notify_alerts?: boolean
          notify_categories?: string[]
          notify_eas?: boolean
          notify_event_types?: string[]
          notify_forecast?: boolean
          notify_hourly_forecast?: boolean
          notify_marine?: boolean
          notify_only_my_area?: boolean
          updated_at?: string
          work_city?: string | null
          work_lat?: number | null
          work_lon?: number | null
          work_zip?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lon?: number | null
          home_zip?: string | null
          id?: string
          min_severity?: string
          notify_alerts?: boolean
          notify_categories?: string[]
          notify_eas?: boolean
          notify_event_types?: string[]
          notify_forecast?: boolean
          notify_hourly_forecast?: boolean
          notify_marine?: boolean
          notify_only_my_area?: boolean
          updated_at?: string
          work_city?: string | null
          work_lat?: number | null
          work_lon?: number | null
          work_zip?: string | null
        }
        Relationships: []
      }
      push_delivery_log: {
        Row: {
          alert_id: string | null
          created_at: string
          endpoint: string
          error: string | null
          id: number
          ok: boolean
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          endpoint: string
          error?: string | null
          id?: number
          ok: boolean
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          endpoint?: string
          error?: string | null
          id?: number
          ok?: boolean
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          min_severity: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          min_severity?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          min_severity?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      report_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "spotter_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_reactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "spotter_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_locations: {
        Row: {
          created_at: string
          id: string
          is_home: boolean
          label: string
          lat: number
          lon: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_home?: boolean
          label: string
          lat: number
          lon: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_home?: boolean
          label?: string
          lat?: number
          lon?: number
          user_id?: string
        }
        Relationships: []
      }
      scheduled_alerts: {
        Row: {
          created_at: string
          created_by: string
          error: string | null
          id: string
          payload: Json
          send_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error?: string | null
          id?: string
          payload: Json
          send_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          payload?: Json
          send_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      spotter_reports: {
        Row: {
          confirmed_count: number
          created_at: string
          doubt_count: number
          id: string
          kind: string
          lat: number
          location_label: string | null
          lon: number
          measurement: string | null
          notes: string | null
          photo_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          confirmed_count?: number
          created_at?: string
          doubt_count?: number
          id?: string
          kind: string
          lat: number
          location_label?: string | null
          lon: number
          measurement?: string | null
          notes?: string | null
          photo_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          confirmed_count?: number
          created_at?: string
          doubt_count?: number
          id?: string
          kind?: string
          lat?: number
          location_label?: string | null
          lon?: number
          measurement?: string | null
          notes?: string | null
          photo_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      status_updates: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          link_url: string | null
          message: string
          severity: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          kind: string
          link_url?: string | null
          message?: string
          severity?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          link_url?: string | null
          message?: string
          severity?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_mfa_factors: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          last_used_at: string | null
          method: string
          purpose: string
          secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          method: string
          purpose: string
          secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          method?: string
          purpose?: string
          secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          clock_24h: boolean
          created_at: string
          daily_briefing: boolean
          default_map: string
          home_label: string | null
          home_lat: number | null
          home_lon: number | null
          lightning_radius_mi: number
          notify_counties: string[]
          notify_severity: string[]
          notify_types: string[]
          quiet_end: string | null
          quiet_start: string | null
          quiet_tz: string
          units_precip: string
          units_speed: string
          units_temp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_24h?: boolean
          created_at?: string
          daily_briefing?: boolean
          default_map?: string
          home_label?: string | null
          home_lat?: number | null
          home_lon?: number | null
          lightning_radius_mi?: number
          notify_counties?: string[]
          notify_severity?: string[]
          notify_types?: string[]
          quiet_end?: string | null
          quiet_start?: string | null
          quiet_tz?: string
          units_precip?: string
          units_speed?: string
          units_temp?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_24h?: boolean
          created_at?: string
          daily_briefing?: boolean
          default_map?: string
          home_label?: string | null
          home_lat?: number | null
          home_lon?: number | null
          lightning_radius_mi?: number
          notify_counties?: string[]
          notify_severity?: string[]
          notify_types?: string[]
          quiet_end?: string | null
          quiet_start?: string | null
          quiet_tz?: string
          units_precip?: string
          units_speed?: string
          units_temp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
