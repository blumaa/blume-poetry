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
      comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          poem_id: string
          visitor_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          poem_id: string
          visitor_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          poem_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_poem_id_fkey"
            columns: ["poem_id"]
            isOneToOne: false
            referencedRelation: "poems"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          id: string
          poem_id: string | null
          recipient_count: number
          sent_at: string
          status: Database["public"]["Enums"]["email_log_status"]
          subject: string
        }
        Insert: {
          id?: string
          poem_id?: string | null
          recipient_count?: number
          sent_at?: string
          status?: Database["public"]["Enums"]["email_log_status"]
          subject: string
        }
        Update: {
          id?: string
          poem_id?: string | null
          recipient_count?: number
          sent_at?: string
          status?: Database["public"]["Enums"]["email_log_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_poem_id_fkey"
            columns: ["poem_id"]
            isOneToOne: false
            referencedRelation: "poems"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          poem_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poem_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poem_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_poem_id_fkey"
            columns: ["poem_id"]
            isOneToOne: false
            referencedRelation: "poems"
            referencedColumns: ["id"]
          },
        ]
      }
      poems: {
        Row: {
          content: string
          id: string
          notified_at: string | null
          pinned: boolean
          plain_text: string | null
          published_at: string
          slug: string
          status: Database["public"]["Enums"]["poem_status"]
          subtitle: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content: string
          id?: string
          notified_at?: string | null
          pinned?: boolean
          plain_text?: string | null
          published_at?: string
          slug: string
          status?: Database["public"]["Enums"]["poem_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string
          id?: string
          notified_at?: string | null
          pinned?: boolean
          plain_text?: string | null
          published_at?: string
          slug?: string
          status?: Database["public"]["Enums"]["poem_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          email: string
          id: string
          notify_new_poems: boolean
          status: Database["public"]["Enums"]["subscriber_status"]
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          notify_new_poems?: boolean
          status?: Database["public"]["Enums"]["subscriber_status"]
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          notify_new_poems?: boolean
          status?: Database["public"]["Enums"]["subscriber_status"]
          subscribed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      search_poems: {
        Args: { p_query: string }
        Returns: {
          id: string
          slug: string
          title: string
        }[]
      }
      toggle_like: {
        Args: { p_poem_id: string; p_visitor_id: string }
        Returns: {
          like_count: number
          liked: boolean
        }[]
      }
      upsert_subscriber: {
        Args: { p_email: string; p_notify_new_poems: boolean }
        Returns: {
          outcome: string
          subscriber: Database["public"]["Tables"]["subscribers"]["Row"]
        }[]
      }
    }
    Enums: {
      email_log_status: "sending" | "sent" | "partial" | "failed"
      poem_status: "draft" | "published"
      subscriber_status: "active" | "unsubscribed"
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
    Enums: {
      email_log_status: ["sending", "sent", "partial", "failed"],
      poem_status: ["draft", "published"],
      subscriber_status: ["active", "unsubscribed"],
    },
  },
} as const
