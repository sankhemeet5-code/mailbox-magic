export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          org_id: string;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          template_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          org_id: string;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          template_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          org_id?: string;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          template_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: {
          created_at: string;
          email_id: string;
          event: Database["public"]["Enums"]["email_log_event"];
          id: string;
          message: string | null;
        };
        Insert: {
          created_at?: string;
          email_id: string;
          event: Database["public"]["Enums"]["email_log_event"];
          id?: string;
          message?: string | null;
        };
        Update: {
          created_at?: string;
          email_id?: string;
          event?: Database["public"]["Enums"]["email_log_event"];
          id?: string;
          message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_logs_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
        ];
      };
      emails: {
        Row: {
          campaign_id: string | null;
          created_at: string;
          html_body: string;
          id: string;
          org_id: string;
          retry_count: number;
          sent_at: string | null;
          status: Database["public"]["Enums"]["email_status"];
          subject: string;
          to_email: string;
          to_name: string | null;
          user_id: string;
        };
        Insert: {
          campaign_id?: string | null;
          created_at?: string;
          html_body: string;
          id?: string;
          org_id: string;
          retry_count?: number;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject: string;
          to_email: string;
          to_name?: string | null;
          user_id: string;
        };
        Update: {
          campaign_id?: string | null;
          created_at?: string;
          html_body?: string;
          id?: string;
          org_id?: string;
          retry_count?: number;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject?: string;
          to_email?: string;
          to_name?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emails_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          org_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          org_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          org_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      recipient_lists: {
        Row: {
          campaign_id: string;
          created_at: string;
          email: string;
          extra_fields: Json;
          id: string;
          name: string | null;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          email: string;
          extra_fields?: Json;
          id?: string;
          name?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          email?: string;
          extra_fields?: Json;
          id?: string;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipient_lists_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      smtp_accounts: {
        Row: {
          created_at: string;
          encrypted_password: string;
          from_email: string;
          from_name: string;
          host: string;
          id: string;
          is_active: boolean;
          org_id: string;
          port: number;
          username: string;
        };
        Insert: {
          created_at?: string;
          encrypted_password: string;
          from_email: string;
          from_name: string;
          host: string;
          id?: string;
          is_active?: boolean;
          org_id: string;
          port?: number;
          username: string;
        };
        Update: {
          created_at?: string;
          encrypted_password?: string;
          from_email?: string;
          from_name?: string;
          host?: string;
          id?: string;
          is_active?: boolean;
          org_id?: string;
          port?: number;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "smtp_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          created_at: string;
          html_body: string;
          id: string;
          name: string;
          org_id: string;
          subject: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          html_body: string;
          id?: string;
          name: string;
          org_id: string;
          subject: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          html_body?: string;
          id?: string;
          name?: string;
          org_id?: string;
          subject?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "templates_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_org_id: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      campaign_status: "draft" | "scheduled" | "running" | "completed";
      email_log_event: "queued" | "sent" | "failed" | "retried";
      email_status: "draft" | "pending" | "sent" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      campaign_status: ["draft", "scheduled", "running", "completed"],
      email_log_event: ["queued", "sent", "failed", "retried"],
      email_status: ["draft", "pending", "sent", "failed"],
    },
  },
} as const;
