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
      activity_log: {
        Row: {
          action_type: string
          actor_name: string | null
          created_at: string
          id: string
          item_id: string | null
          item_type: string
          project_id: string
        }
        Insert: {
          action_type: string
          actor_name?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          item_type: string
          project_id: string
        }
        Update: {
          action_type?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheets: {
        Row: {
          call_time: string | null
          created_at: string
          day_budget: number
          id: string
          lat: number | null
          lng: number | null
          location_address: string | null
          location_name: string | null
          notes: string | null
          project_id: string
          shoot_date: string | null
          sort_order: number
          title: string
          updated_at: string
          wrap_time: string | null
        }
        Insert: {
          call_time?: string | null
          created_at?: string
          day_budget?: number
          id?: string
          lat?: number | null
          lng?: number | null
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          project_id: string
          shoot_date?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          wrap_time?: string | null
        }
        Update: {
          call_time?: string | null
          created_at?: string
          day_budget?: number
          id?: string
          lat?: number | null
          lng?: number | null
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          project_id?: string
          shoot_date?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          wrap_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_payments: {
        Row: {
          amount: number
          created_at: string
          crew_rate_id: string
          id: string
          method: string | null
          notes: string | null
          paid_by: string
          paid_on: string
          project_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          crew_rate_id: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_by?: string
          paid_on?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          crew_rate_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_by?: string
          paid_on?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_payments_crew_rate_id_fkey"
            columns: ["crew_rate_id"]
            isOneToOne: false
            referencedRelation: "crew_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_rates: {
        Row: {
          created_at: string
          currency: string
          days: number
          id: string
          notes: string | null
          person_name: string
          project_id: string
          rate: number
          rate_type: string
          role: string | null
          sort_order: number
          team_member_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          days?: number
          id?: string
          notes?: string | null
          person_name: string
          project_id: string
          rate?: number
          rate_type?: string
          role?: string | null
          sort_order?: number
          team_member_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          days?: number
          id?: string
          notes?: string | null
          person_name?: string
          project_id?: string
          rate?: number
          rate_type?: string
          role?: string | null
          sort_order?: number
          team_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_rates_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string
          created_at: string
          id: string
          is_secured: boolean
          name: string
          notes: string | null
          project_id: string
          quantity: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_secured?: boolean
          name: string
          notes?: string | null
          project_id: string
          quantity?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_secured?: boolean
          name?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          call_sheet_id: string | null
          category: string
          created_at: string
          currency: string
          due_date: string | null
          entry_date: string | null
          entry_type: string
          id: string
          is_paid: boolean
          notes: string | null
          paid_by: string
          party: string | null
          project_id: string
          sort_order: number
          team_member_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          call_sheet_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          entry_date?: string | null
          entry_type?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          paid_by?: string
          party?: string | null
          project_id: string
          sort_order?: number
          team_member_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          call_sheet_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          entry_date?: string | null
          entry_type?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          paid_by?: string
          party?: string | null
          project_id?: string
          sort_order?: number
          team_member_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_call_sheet_id_fkey"
            columns: ["call_sheet_id"]
            isOneToOne: false
            referencedRelation: "call_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_pins: {
        Row: {
          created_at: string | null
          id: string
          pin: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pin: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pin?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_budget: number
          client_due_date: string | null
          client_name: string | null
          created_at: string | null
          end_date: string | null
          finance_pin_hash: string | null
          id: string
          name: string
          short_code: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          client_budget?: number
          client_due_date?: string | null
          client_name?: string | null
          created_at?: string | null
          end_date?: string | null
          finance_pin_hash?: string | null
          id?: string
          name: string
          short_code: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          client_budget?: number
          client_due_date?: string | null
          client_name?: string | null
          created_at?: string | null
          end_date?: string | null
          finance_pin_hash?: string | null
          id?: string
          name?: string
          short_code?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          id: string
          project_id: string
          quantity: number
          quotation_id: string
          sort_order: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          project_id: string
          quantity?: number
          quotation_id: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          quantity?: number
          quotation_id?: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_contact: string | null
          client_name: string | null
          contract_body: string | null
          created_at: string
          currency: string
          discount: number
          id: string
          issue_date: string | null
          notes: string | null
          project_id: string
          quote_number: string | null
          signature_name: string | null
          signed_at: string | null
          status: string
          tax_percent: number
          terms: string | null
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_contact?: string | null
          client_name?: string | null
          contract_body?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          issue_date?: string | null
          notes?: string | null
          project_id: string
          quote_number?: string | null
          signature_name?: string | null
          signed_at?: string | null
          status?: string
          tax_percent?: number
          terms?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_contact?: string | null
          client_name?: string | null
          contract_body?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          issue_date?: string | null
          notes?: string | null
          project_id?: string
          quote_number?: string | null
          signature_name?: string | null
          signed_at?: string | null
          status?: string
          tax_percent?: number
          terms?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          call_sheet_id: string | null
          created_at: string
          description: string
          id: string
          is_done: boolean
          movement: string | null
          notes: string | null
          project_id: string
          scene: string | null
          shot_size: string | null
          sort_order: number
          storyboard_url: string | null
          updated_at: string
        }
        Insert: {
          call_sheet_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_done?: boolean
          movement?: string | null
          notes?: string | null
          project_id: string
          scene?: string | null
          shot_size?: string | null
          sort_order?: number
          storyboard_url?: string | null
          updated_at?: string
        }
        Update: {
          call_sheet_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_done?: boolean
          movement?: string | null
          notes?: string | null
          project_id?: string
          scene?: string | null
          shot_size?: string | null
          sort_order?: number
          storyboard_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shots_call_sheet_id_fkey"
            columns: ["call_sheet_id"]
            isOneToOne: false
            referencedRelation: "call_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          details: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          project_id: string
          team_member_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          project_id: string
          team_member_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          project_id?: string
          team_member_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          project_id: string
          role: string
          sort_order: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
          role: string
          sort_order?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_project: {
        Args: { _end_date?: string; _name: string; _start_date?: string }
        Returns: {
          client_budget: number
          client_due_date: string | null
          client_name: string | null
          created_at: string | null
          end_date: string | null
          finance_pin_hash: string | null
          id: string
          name: string
          short_code: string
          start_date: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project: {
        Args: { _project_id: string }
        Returns: {
          client_budget: number
          client_due_date: string | null
          client_name: string | null
          created_at: string | null
          end_date: string | null
          finance_pin_hash: string | null
          id: string
          name: string
          short_code: string
          start_date: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project_finance: { Args: { _project_id: string }; Returns: Json }
      project_exists: { Args: { _project_id: string }; Returns: boolean }
      resolve_project_code: { Args: { _short_code: string }; Returns: string }
      update_project: {
        Args: {
          _end_date?: string
          _name: string
          _project_id: string
          _start_date?: string
        }
        Returns: {
          client_budget: number
          client_due_date: string | null
          client_name: string | null
          created_at: string | null
          end_date: string | null
          finance_pin_hash: string | null
          id: string
          name: string
          short_code: string
          start_date: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_project_finance: {
        Args: {
          _client_budget: number
          _client_due_date: string
          _client_name: string
          _project_id: string
        }
        Returns: undefined
      }
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
