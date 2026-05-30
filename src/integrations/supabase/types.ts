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
      admin_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_user_id: string
          created_at: string
          id: string
          ip_hash: string | null
          referral_code: string
          user_agent: string | null
        }
        Insert: {
          affiliate_user_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          referral_code: string
          user_agent?: string | null
        }
        Update: {
          affiliate_user_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          referral_code?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_user_id: string
          amount: number
          created_at: string
          id: string
          referral_id: string
          status: string
        }
        Insert: {
          affiliate_user_id: string
          amount: number
          created_at?: string
          id?: string
          referral_id: string
          status?: string
        }
        Update: {
          affiliate_user_id?: string
          amount?: number
          created_at?: string
          id?: string
          referral_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          clicks: number
          created_at: string
          id: string
          referral_code: string
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          referral_code: string
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          referral_code?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          affiliate_user_id: string
          amount: number
          id: string
          notes: string | null
          paid_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          affiliate_user_id: string
          amount: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          affiliate_user_id?: string
          amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      affiliate_profiles: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          email: string
          first_name: string
          i9_file_path: string | null
          i9_uploaded_at: string | null
          id: string
          last_name: string
          payout_details: string
          payout_method: string
          phone: string | null
          state: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          email: string
          first_name: string
          i9_file_path?: string | null
          i9_uploaded_at?: string | null
          id?: string
          last_name: string
          payout_details: string
          payout_method: string
          phone?: string | null
          state: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          i9_file_path?: string | null
          i9_uploaded_at?: string | null
          id?: string
          last_name?: string
          payout_details?: string
          payout_method?: string
          phone?: string | null
          state?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_user_id: string
          converted_at: string | null
          converted_to_pro: boolean
          created_at: string
          id: string
          referred_user_id: string
        }
        Insert: {
          affiliate_user_id: string
          converted_at?: string | null
          converted_to_pro?: boolean
          created_at?: string
          id?: string
          referred_user_id: string
        }
        Update: {
          affiliate_user_id?: string
          converted_at?: string | null
          converted_to_pro?: boolean
          created_at?: string
          id?: string
          referred_user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          business_name: string | null
          created_at: string
          current_deal: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          website_dev_price: string | null
          website_url: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          current_deal?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          website_dev_price?: string | null
          website_url?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          current_deal?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          website_dev_price?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      dfy_requests: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dfy_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      failed_signup_attempts: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          existing_user_id: string | null
          id: string
          ip: string | null
          reason: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          existing_user_id?: string | null
          id?: string
          ip?: string | null
          reason: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          existing_user_id?: string | null
          id?: string
          ip?: string | null
          reason?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          ai_audit: string | null
          ai_insight: string | null
          business_name: string
          category: string | null
          city: string | null
          competitor_insight: string | null
          contact_name: string | null
          contact_scrape_status: string | null
          contact_scraped_at: string | null
          contacted: boolean
          created_at: string
          email: string | null
          follow_up_date: string | null
          gmaps_hours: Json | null
          gmaps_photos: string[] | null
          gmaps_place_id: string | null
          gmaps_reviews: Json | null
          has_website: boolean
          id: string
          last_contacted_at: string | null
          no_ssl: boolean
          not_mobile_friendly: boolean
          notes: string | null
          outdated_copyright: boolean
          phone: string | null
          priority_label: string
          priority_score: number
          quality_score: number | null
          rating: number | null
          review_count: number | null
          score: string | null
          scraped_emails: string[]
          scraped_phones: string[]
          screenshot_captured_at: string | null
          screenshot_url: string | null
          state: string | null
          status: string
          tags: string[]
          updated_at: string
          user_id: string
          website: string | null
          website_error: boolean
          website_issues: string[] | null
          website_prompt: string | null
          website_prompt_generated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_audit?: string | null
          ai_insight?: string | null
          business_name: string
          category?: string | null
          city?: string | null
          competitor_insight?: string | null
          contact_name?: string | null
          contact_scrape_status?: string | null
          contact_scraped_at?: string | null
          contacted?: boolean
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          gmaps_hours?: Json | null
          gmaps_photos?: string[] | null
          gmaps_place_id?: string | null
          gmaps_reviews?: Json | null
          has_website?: boolean
          id?: string
          last_contacted_at?: string | null
          no_ssl?: boolean
          not_mobile_friendly?: boolean
          notes?: string | null
          outdated_copyright?: boolean
          phone?: string | null
          priority_label?: string
          priority_score?: number
          quality_score?: number | null
          rating?: number | null
          review_count?: number | null
          score?: string | null
          scraped_emails?: string[]
          scraped_phones?: string[]
          screenshot_captured_at?: string | null
          screenshot_url?: string | null
          state?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
          website?: string | null
          website_error?: boolean
          website_issues?: string[] | null
          website_prompt?: string | null
          website_prompt_generated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_audit?: string | null
          ai_insight?: string | null
          business_name?: string
          category?: string | null
          city?: string | null
          competitor_insight?: string | null
          contact_name?: string | null
          contact_scrape_status?: string | null
          contact_scraped_at?: string | null
          contacted?: boolean
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          gmaps_hours?: Json | null
          gmaps_photos?: string[] | null
          gmaps_place_id?: string | null
          gmaps_reviews?: Json | null
          has_website?: boolean
          id?: string
          last_contacted_at?: string | null
          no_ssl?: boolean
          not_mobile_friendly?: boolean
          notes?: string | null
          outdated_copyright?: boolean
          phone?: string | null
          priority_label?: string
          priority_score?: number
          quality_score?: number | null
          rating?: number | null
          review_count?: number | null
          score?: string | null
          scraped_emails?: string[]
          scraped_phones?: string[]
          screenshot_captured_at?: string | null
          screenshot_url?: string | null
          state?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          website?: string | null
          website_error?: boolean
          website_issues?: string[] | null
          website_prompt?: string | null
          website_prompt_generated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_mockups: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          created_at: string
          design_brief: string | null
          id: string
          image_prompt: string | null
          lead_id: string
          offer_premium: string | null
          offer_short: string | null
          offer_standard: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          created_at?: string
          design_brief?: string | null
          id?: string
          image_prompt?: string | null
          lead_id: string
          offer_premium?: string | null
          offer_short?: string | null
          offer_standard?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          created_at?: string
          design_brief?: string | null
          id?: string
          image_prompt?: string | null
          lead_id?: string
          offer_premium?: string | null
          offer_short?: string | null
          offer_standard?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_ip: string | null
          last_ip_at: string | null
          signup_ip: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_ip?: string | null
          last_ip_at?: string | null
          signup_ip?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_ip?: string | null
          last_ip_at?: string | null
          signup_ip?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          pdf_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      social_proof_city_pool: {
        Row: {
          active: boolean
          city: string
          created_at: string
          display_label: string
          id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city: string
          created_at?: string
          display_label: string
          id?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string
          created_at?: string
          display_label?: string
          id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_proof_events: {
        Row: {
          city: string
          click_action: string | null
          clicks: number
          created_at: string
          created_by: string | null
          custom_message: string | null
          display_location: string | null
          end_date: string | null
          event_type: string
          first_name: string
          id: string
          impressions: number
          is_active: boolean
          is_approved: boolean
          is_real_event: boolean
          last_initial: string
          linked_url: string | null
          priority: number
          rendered_message: string | null
          source_type: string
          start_date: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city: string
          click_action?: string | null
          clicks?: number
          created_at?: string
          created_by?: string | null
          custom_message?: string | null
          display_location?: string | null
          end_date?: string | null
          event_type: string
          first_name: string
          id?: string
          impressions?: number
          is_active?: boolean
          is_approved?: boolean
          is_real_event?: boolean
          last_initial: string
          linked_url?: string | null
          priority?: number
          rendered_message?: string | null
          source_type: string
          start_date?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          click_action?: string | null
          clicks?: number
          created_at?: string
          created_by?: string | null
          custom_message?: string | null
          display_location?: string | null
          end_date?: string | null
          event_type?: string
          first_name?: string
          id?: string
          impressions?: number
          is_active?: boolean
          is_approved?: boolean
          is_real_event?: boolean
          last_initial?: string
          linked_url?: string | null
          priority?: number
          rendered_message?: string | null
          source_type?: string
          start_date?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_proof_impressions_log: {
        Row: {
          clicked: boolean
          clicked_at: string | null
          event_id: string | null
          id: string
          session_id: string | null
          viewed_at: string
        }
        Insert: {
          clicked?: boolean
          clicked_at?: string | null
          event_id?: string | null
          id?: string
          session_id?: string | null
          viewed_at?: string
        }
        Update: {
          clicked?: boolean
          clicked_at?: string | null
          event_id?: string | null
          id?: string
          session_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_proof_impressions_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "social_proof_events"
            referencedColumns: ["id"]
          },
        ]
      }
      social_proof_name_pool: {
        Row: {
          active: boolean
          created_at: string
          first_name: string
          id: string
          last_initial: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          first_name: string
          id?: string
          last_initial: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          first_name?: string
          id?: string
          last_initial?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_proof_settings: {
        Row: {
          animation_type: string
          auto_approve_demo_bookings: boolean
          auto_approve_signups: boolean
          auto_approve_trials: boolean
          auto_expire_days: number | null
          auto_rotate: boolean
          click_action: string | null
          created_at: string
          delay_between_seconds: number
          display_duration_seconds: number
          enabled: boolean
          id: number
          loop_notifications: boolean
          mobile_enabled: boolean
          position: string
          randomize_order: boolean
          require_approval_client_wins: boolean
          require_approval_closed_leads: boolean
          show_city_state: boolean
          show_close_button: boolean
          source_mode: string
          updated_at: string
        }
        Insert: {
          animation_type?: string
          auto_approve_demo_bookings?: boolean
          auto_approve_signups?: boolean
          auto_approve_trials?: boolean
          auto_expire_days?: number | null
          auto_rotate?: boolean
          click_action?: string | null
          created_at?: string
          delay_between_seconds?: number
          display_duration_seconds?: number
          enabled?: boolean
          id?: number
          loop_notifications?: boolean
          mobile_enabled?: boolean
          position?: string
          randomize_order?: boolean
          require_approval_client_wins?: boolean
          require_approval_closed_leads?: boolean
          show_city_state?: boolean
          show_close_button?: boolean
          source_mode?: string
          updated_at?: string
        }
        Update: {
          animation_type?: string
          auto_approve_demo_bookings?: boolean
          auto_approve_signups?: boolean
          auto_approve_trials?: boolean
          auto_expire_days?: number | null
          auto_rotate?: boolean
          click_action?: string | null
          created_at?: string
          delay_between_seconds?: number
          display_duration_seconds?: number
          enabled?: boolean
          id?: number
          loop_notifications?: boolean
          mobile_enabled?: boolean
          position?: string
          randomize_order?: boolean
          require_approval_client_wins?: boolean
          require_approval_closed_leads?: boolean
          show_city_state?: boolean
          show_close_button?: boolean
          source_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_proof_templates: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_default: boolean
          template_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_default?: boolean
          template_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_default?: boolean
          template_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          admin_message: string | null
          admin_message_at: string | null
          bonus_saved_slots: number
          created_at: string
          frozen: boolean
          id: string
          last_search_date: string | null
          leads_remaining: number
          plan: Database["public"]["Enums"]["app_plan"]
          searches_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_message?: string | null
          admin_message_at?: string | null
          bonus_saved_slots?: number
          created_at?: string
          frozen?: boolean
          id?: string
          last_search_date?: string | null
          leads_remaining?: number
          plan?: Database["public"]["Enums"]["app_plan"]
          searches_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_message?: string | null
          admin_message_at?: string | null
          bonus_saved_slots?: number
          created_at?: string
          frozen?: boolean
          id?: string
          last_search_date?: string | null
          leads_remaining?: number
          plan?: Database["public"]["Enums"]["app_plan"]
          searches_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          source: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_affiliate_click: {
        Args: { _code: string; _ip_hash?: string; _user_agent?: string }
        Returns: string
      }
    }
    Enums: {
      app_plan: "free" | "pro"
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
      app_plan: ["free", "pro"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
