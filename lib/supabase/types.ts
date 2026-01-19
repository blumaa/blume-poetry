export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      poems: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          content: string;
          plain_text: string | null;
          published_at: string;
          updated_at: string;
          status: 'draft' | 'published';
          url: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          content: string;
          plain_text?: string | null;
          published_at?: string;
          updated_at?: string;
          status?: 'draft' | 'published';
          url?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          subtitle?: string | null;
          content?: string;
          plain_text?: string | null;
          published_at?: string;
          updated_at?: string;
          status?: 'draft' | 'published';
          url?: string | null;
        };
        Relationships: [];
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          subscribed_at: string;
          status: 'active' | 'unsubscribed';
          verified: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          subscribed_at?: string;
          status?: 'active' | 'unsubscribed';
          verified?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          subscribed_at?: string;
          status?: 'active' | 'unsubscribed';
          verified?: boolean;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          sent_at: string;
          subject: string;
          poem_id: string | null;
          recipient_count: number | null;
          status: string;
          resend_email_id: string | null;
          open_count: number;
          click_count: number;
          unique_opens: number;
          unique_clicks: number;
        };
        Insert: {
          id?: string;
          sent_at?: string;
          subject: string;
          poem_id?: string | null;
          recipient_count?: number | null;
          status?: string;
          resend_email_id?: string | null;
          open_count?: number;
          click_count?: number;
          unique_opens?: number;
          unique_clicks?: number;
        };
        Update: {
          id?: string;
          sent_at?: string;
          subject?: string;
          poem_id?: string | null;
          recipient_count?: number | null;
          status?: string;
          resend_email_id?: string | null;
          open_count?: number;
          click_count?: number;
          unique_opens?: number;
          unique_clicks?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'email_logs_poem_id_fkey';
            columns: ['poem_id'];
            isOneToOne: false;
            referencedRelation: 'poems';
            referencedColumns: ['id'];
          }
        ];
      };
      email_events: {
        Row: {
          id: string;
          email_log_id: string | null;
          resend_email_id: string | null;
          event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
          recipient_email: string | null;
          link_url: string | null;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email_log_id?: string | null;
          resend_email_id?: string | null;
          event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
          recipient_email?: string | null;
          link_url?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email_log_id?: string | null;
          resend_email_id?: string | null;
          event_type?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
          recipient_email?: string | null;
          link_url?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_events_email_log_id_fkey';
            columns: ['email_log_id'];
            isOneToOne: false;
            referencedRelation: 'email_logs';
            referencedColumns: ['id'];
          }
        ];
      };
      likes: {
        Row: {
          id: string;
          poem_id: string;
          visitor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poem_id: string;
          visitor_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poem_id?: string;
          visitor_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_poem_id_fkey';
            columns: ['poem_id'];
            isOneToOne: false;
            referencedRelation: 'poems';
            referencedColumns: ['id'];
          }
        ];
      };
      comments: {
        Row: {
          id: string;
          poem_id: string;
          visitor_id: string;
          author_name: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poem_id: string;
          visitor_id: string;
          author_name: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poem_id?: string;
          visitor_id?: string;
          author_name?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_poem_id_fkey';
            columns: ['poem_id'];
            isOneToOne: false;
            referencedRelation: 'poems';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Poem = Database['public']['Tables']['poems']['Row'];
export type NewPoem = Database['public']['Tables']['poems']['Insert'];
export type UpdatePoem = Database['public']['Tables']['poems']['Update'];

export type Subscriber = Database['public']['Tables']['subscribers']['Row'];
export type NewSubscriber = Database['public']['Tables']['subscribers']['Insert'];

export type EmailLog = Database['public']['Tables']['email_logs']['Row'];
export type EmailEvent = Database['public']['Tables']['email_events']['Row'];
export type NewEmailEvent = Database['public']['Tables']['email_events']['Insert'];

export type Like = Database['public']['Tables']['likes']['Row'];
export type NewLike = Database['public']['Tables']['likes']['Insert'];

export type Comment = Database['public']['Tables']['comments']['Row'];
export type NewComment = Database['public']['Tables']['comments']['Insert'];
