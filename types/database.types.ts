/**
 * types/database.types.ts
 *
 * Supabase Postgres schema types for Viewora.
 * Matches migration 012_viewora_unified_schema.sql.
 *
 * To regenerate:
 *   npx supabase gen types typescript --project-id tpfxwybnywojwqjxtvcr > types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ─────────────────────────────────────────────────────────────────

export type PropertyVisibility = 'private' | 'public'
export type SubStatus =
  | 'trial'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'expired'
  | 'canceled'
  | 'unpaid'
  | 'pending_payment'

// ── Database Interface ────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {

      // ── profiles ────────────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          company_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          updated_at?: string
        }
      }

      // ── plans ────────────────────────────────────────────────────────────
      plans: {
        Row: {
          id: string
          name: string
          price_monthly_kes: number
          price_yearly_kes: number
          max_active_properties: number
          max_storage_bytes: number
          qr_download_enabled: boolean
          qr_svg_enabled: boolean
          embeds_enabled: boolean
          advanced_embeds_enabled: boolean
          lead_capture_enabled: boolean
          advanced_analytics_enabled: boolean
          branding_customization_enabled: boolean
          max_team_members: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price_monthly_kes?: number
          price_yearly_kes?: number
          max_active_properties?: number
          max_storage_bytes?: number
          qr_download_enabled?: boolean
          qr_svg_enabled?: boolean
          embeds_enabled?: boolean
          advanced_embeds_enabled?: boolean
          lead_capture_enabled?: boolean
          advanced_analytics_enabled?: boolean
          branding_customization_enabled?: boolean
          max_team_members?: number
        }
        Update: {
          name?: string
          price_monthly_kes?: number
          price_yearly_kes?: number
          max_active_properties?: number
          max_storage_bytes?: number
          qr_download_enabled?: boolean
          qr_svg_enabled?: boolean
          embeds_enabled?: boolean
          advanced_embeds_enabled?: boolean
          lead_capture_enabled?: boolean
          advanced_analytics_enabled?: boolean
          branding_customization_enabled?: boolean
          max_team_members?: number
          updated_at?: string
        }
      }

      // ── subscriptions ─────────────────────────────────────────────────────
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          provider: string
          provider_customer_code: string | null
          provider_subscription_code: string | null
          provider_reference: string | null
          status: SubStatus
          billing_cycle: string
          current_period_start: string
          current_period_end: string | null
          grace_period_ends_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          provider?: string
          provider_customer_code?: string | null
          provider_subscription_code?: string | null
          provider_reference?: string | null
          status?: SubStatus
          billing_cycle?: string
          current_period_start?: string
          current_period_end?: string | null
          grace_period_ends_at?: string | null
          cancelled_at?: string | null
        }
        Update: {
          plan_id?: string
          provider?: string
          provider_customer_code?: string | null
          provider_subscription_code?: string | null
          provider_reference?: string | null
          status?: SubStatus
          billing_cycle?: string
          current_period_start?: string
          current_period_end?: string | null
          grace_period_ends_at?: string | null
          cancelled_at?: string | null
          updated_at?: string
        }
      }

      // ── properties ───────────────────────────────────────────────────────
      properties: {
        Row: {
          id: string
          user_id: string
          title: string
          slug: string | null
          description: string | null
          property_type: string | null
          location_text: string | null
          cover_image_url: string | null
          has_360: boolean
          has_gallery: boolean
          is_published: boolean
          published_at: string | null
          visibility: PropertyVisibility
          lead_form_enabled: boolean
          branding_enabled: boolean
          custom_logo_url: string | null
          theme_settings_json: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          slug?: string | null
          description?: string | null
          property_type?: string | null
          location_text?: string | null
          cover_image_url?: string | null
          has_360?: boolean
          has_gallery?: boolean
          is_published?: boolean
          published_at?: string | null
          visibility?: PropertyVisibility
          lead_form_enabled?: boolean
          branding_enabled?: boolean
          custom_logo_url?: string | null
          theme_settings_json?: Record<string, unknown>
        }
        Update: {
          title?: string
          slug?: string | null
          description?: string | null
          property_type?: string | null
          location_text?: string | null
          cover_image_url?: string | null
          has_360?: boolean
          has_gallery?: boolean
          is_published?: boolean
          published_at?: string | null
          visibility?: PropertyVisibility
          lead_form_enabled?: boolean
          branding_enabled?: boolean
          custom_logo_url?: string | null
          theme_settings_json?: Record<string, unknown>
          updated_at?: string
        }
      }

      // ── property_media ───────────────────────────────────────────────────
      property_media: {
        Row: {
          id: string
          property_id: string
          media_type: string          // 'image' | 'panorama' | 'thumbnail'
          storage_key: string
          public_url: string
          width: number | null
          height: number | null
          file_size_bytes: number | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          media_type: string
          storage_key: string
          public_url: string
          width?: number | null
          height?: number | null
          file_size_bytes?: number | null
          sort_order?: number
          is_primary?: boolean
        }
        Update: {
          media_type?: string
          storage_key?: string
          public_url?: string
          width?: number | null
          height?: number | null
          file_size_bytes?: number | null
          sort_order?: number
          is_primary?: boolean
        }
      }

      // ── property_360_settings ────────────────────────────────────────────
      property_360_settings: {
        Row: {
          id: string
          property_id: string
          panorama_media_id: string | null
          hfov_default: number
          pitch_default: number
          yaw_default: number
          auto_rotate_enabled: boolean
          hotspots_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          panorama_media_id?: string | null
          hfov_default?: number
          pitch_default?: number
          yaw_default?: number
          auto_rotate_enabled?: boolean
          hotspots_json?: Json
        }
        Update: {
          panorama_media_id?: string | null
          hfov_default?: number
          pitch_default?: number
          yaw_default?: number
          auto_rotate_enabled?: boolean
          hotspots_json?: Json
          updated_at?: string
        }
      }

      // ── leads ─────────────────────────────────────────────────────────────
      leads: {
        Row: {
          id: string
          property_id: string
          name: string | null
          phone: string | null
          email: string | null
          message: string | null
          source: 'direct' | 'qr' | 'embed'
          status: 'new' | 'contacted' | 'qualified' | 'closed'
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          property_id: string
          name?: string | null
          phone?: string | null
          email?: string | null
          message?: string | null
          source?: 'direct' | 'qr' | 'embed'
          status?: 'new' | 'contacted' | 'qualified' | 'closed'
        }
        Update: {
          name?: string | null
          phone?: string | null
          email?: string | null
          message?: string | null
          source?: 'direct' | 'qr' | 'embed'
          status?: 'new' | 'contacted' | 'qualified' | 'closed'
          updated_at?: string
          archived_at?: string | null
        }
      }

      // ── usage_counters ───────────────────────────────────────────────────
      usage_counters: {
        Row: {
          id: string
          user_id: string
          active_properties_count: number
          storage_used_bytes: number
          monthly_views_count: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          active_properties_count?: number
          storage_used_bytes?: number
          monthly_views_count?: number
        }
        Update: {
          active_properties_count?: number
          storage_used_bytes?: number
          monthly_views_count?: number
          updated_at?: string
        }
      }

      // ── analytics_daily ──────────────────────────────────────────────────
      analytics_daily: {
        Row: {
          id: string
          property_id: string
          date: string               // YYYY-MM-DD
          total_views: number
          qr_views: number
          direct_views: number
          embed_views: number
          leads_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          date?: string
          total_views?: number
          qr_views?: number
          direct_views?: number
          embed_views?: number
          leads_count?: number
        }
        Update: {
          total_views?: number
          qr_views?: number
          direct_views?: number
          embed_views?: number
          leads_count?: number
          updated_at?: string
        }
      }

    }
    Views: Record<string, never>
    Functions: {
      increment_property_count:      { Args: { p_user_id: string };          Returns: void }
      decrement_property_count:      { Args: { p_user_id: string };          Returns: void }
      increment_active_properties:   { Args: { u_id: string };               Returns: void }
      decrement_active_properties:   { Args: { u_id: string };               Returns: void }
      increment_storage_usage:       { Args: { u_id: string; bytes: number }; Returns: void }
      decrement_storage_usage:       { Args: { u_id: string; bytes: number }; Returns: void }
      increment_daily_views:         { Args: { prop_id: string; event_date: string; view_source: string }; Returns: void }
      increment_daily_leads:         { Args: { prop_id: string; event_date: string };                       Returns: void }
    }
    Enums: {
      property_visibility: PropertyVisibility
      sub_status: SubStatus
    }
  }
}
