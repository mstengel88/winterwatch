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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address: string
          city: string | null
          client_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          geofence_radius: number | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          priority: number | null
          service_type: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address: string
          city?: string | null
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          geofence_radius?: number | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          priority?: number | null
          service_type?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          geofence_radius?: number | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          priority?: number | null
          service_type?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          category: Database["public"]["Enums"]["employee_category"]
          created_at: string
          email: string | null
          first_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          last_name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["employee_category"]
          created_at?: string
          email?: string | null
          first_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["employee_category"]
          created_at?: string
          email?: string | null
          first_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_maintenance_date: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          service_type: string | null
          status: string | null
          type: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_maintenance_date?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          service_type?: string | null
          status?: string | null
          type: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_maintenance_date?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          service_type?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          admin_announcements_enabled: boolean
          created_at: string
          geofence_alerts_enabled: boolean
          id: string
          mandatory_admin_announcements: boolean | null
          mandatory_geofence_alerts: boolean | null
          mandatory_shift_status: boolean | null
          notification_sound: Database["public"]["Enums"]["notification_sound"]
          shift_status_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_announcements_enabled?: boolean
          created_at?: string
          geofence_alerts_enabled?: boolean
          id?: string
          mandatory_admin_announcements?: boolean | null
          mandatory_geofence_alerts?: boolean | null
          mandatory_shift_status?: boolean | null
          notification_sound?: Database["public"]["Enums"]["notification_sound"]
          shift_status_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_announcements_enabled?: boolean
          created_at?: string
          geofence_alerts_enabled?: boolean
          id?: string
          mandatory_admin_announcements?: boolean | null
          mandatory_geofence_alerts?: boolean | null
          mandatory_shift_status?: boolean | null
          notification_sound?: Database["public"]["Enums"]["notification_sound"]
          shift_status_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_types: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          is_system: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          is_system?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          is_system?: boolean
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          body: string
          data: Json | null
          delivery_status: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          onesignal_id: string | null
          read_at: string | null
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json | null
          delivery_status?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          onesignal_id?: string | null
          read_at?: string | null
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          data?: Json | null
          delivery_status?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          onesignal_id?: string | null
          read_at?: string | null
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      overtime_notification_settings: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string | null
          id: string
          is_enabled: boolean
          notify_admins: boolean
          notify_employee: boolean
          threshold_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          is_enabled?: boolean
          notify_admins?: boolean
          notify_employee?: boolean
          threshold_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          is_enabled?: boolean
          notify_admins?: boolean
          notify_employee?: boolean
          threshold_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      overtime_notifications_sent: {
        Row: {
          employee_id: string
          id: string
          sent_at: string
          threshold_hours: number
          time_clock_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          sent_at?: string
          threshold_hours: number
          time_clock_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          sent_at?: string
          threshold_hours?: number
          time_clock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_notifications_sent_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_device_tokens: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          is_active: boolean
          platform: string
          player_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          platform: string
          player_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          player_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string
          data: Json | null
          employee_id: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          send_at: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          data?: Json | null
          employee_id?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          send_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          data?: Json | null
          employee_id?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          send_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shovel_work_logs: {
        Row: {
          account_id: string
          areas_cleared: string[] | null
          billed: boolean
          billing_status: string
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_time: string | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          check_out_time: string | null
          created_at: string
          employee_id: string | null
          ice_melt_used_lbs: number | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          service_type: Database["public"]["Enums"]["service_type"]
          snow_depth_inches: number | null
          status: Database["public"]["Enums"]["work_status"]
          team_member_ids: string[] | null
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          account_id: string
          areas_cleared?: string[] | null
          billed?: boolean
          billing_status?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string | null
          ice_melt_used_lbs?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          service_type?: Database["public"]["Enums"]["service_type"]
          snow_depth_inches?: number | null
          status?: Database["public"]["Enums"]["work_status"]
          team_member_ids?: string[] | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          account_id?: string
          areas_cleared?: string[] | null
          billed?: boolean
          billing_status?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string | null
          ice_melt_used_lbs?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          service_type?: Database["public"]["Enums"]["service_type"]
          snow_depth_inches?: number | null
          status?: Database["public"]["Enums"]["work_status"]
          team_member_ids?: string[] | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shovel_work_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shovel_work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock: {
        Row: {
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_time: string
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_time: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time: string
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time?: string
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          account_id: string
          billed: boolean
          billing_status: string
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_time: string | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          check_out_time: string | null
          created_at: string
          employee_id: string | null
          equipment_id: string | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          salt_used_lbs: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          snow_depth_inches: number | null
          status: Database["public"]["Enums"]["work_status"]
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          account_id: string
          billed?: boolean
          billing_status?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string | null
          equipment_id?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          salt_used_lbs?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          snow_depth_inches?: number | null
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          account_id?: string
          billed?: boolean
          billing_status?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string | null
          equipment_id?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          salt_used_lbs?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          snow_depth_inches?: number | null
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_employee_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_user_employee: {
        Args: { _employee_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "driver"
        | "shovel_crew"
        | "client"
        | "work_log_viewer"
      employee_category: "plow" | "shovel" | "both"
      notification_sound: "default" | "chime" | "bell" | "alert" | "none"
      notification_type:
        | "shift_status"
        | "geofence_alert"
        | "admin_announcement"
      service_type: "plow" | "salt" | "both" | "shovel" | "ice_melt"
      work_status: "pending" | "in_progress" | "completed" | "cancelled"
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
      app_role: [
        "admin",
        "manager",
        "driver",
        "shovel_crew",
        "client",
        "work_log_viewer",
      ],
      employee_category: ["plow", "shovel", "both"],
      notification_sound: ["default", "chime", "bell", "alert", "none"],
      notification_type: [
        "shift_status",
        "geofence_alert",
        "admin_announcement",
      ],
      service_type: ["plow", "salt", "both", "shovel", "ice_melt"],
      work_status: ["pending", "in_progress", "completed", "cancelled"],
    },
  },
} as const
