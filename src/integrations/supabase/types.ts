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
      achievements: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          icon: string | null
          id: string
          name: string
          rarity: string | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          name: string
          rarity?: string | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          name?: string
          rarity?: string | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      activity_reactions: {
        Row: {
          anime_entry_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          anime_entry_id: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          anime_entry_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anime_catalog: {
        Row: {
          created_at: string | null
          episodes: number | null
          genres: Json | null
          id: string
          image_url: string | null
          kitsu_id: number | null
          kitsu_link_checked_at: string | null
          kitsu_link_status: string | null
          kitsu_metadata_checked_at: string | null
          kitsu_metadata_result: string | null
          last_synced_at: string | null
          local_image_url: string | null
          mal_id: number
          members: number | null
          metadata_sources: Json
          popularity: number | null
          rank: number | null
          rating: string | null
          score: number | null
          scored_by: number | null
          season: string | null
          status: string | null
          studios: Json | null
          synopsis: string | null
          synopsis_pt: string | null
          title: string
          title_english: string | null
          title_japanese: string | null
          type: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          episodes?: number | null
          genres?: Json | null
          id?: string
          image_url?: string | null
          kitsu_id?: number | null
          kitsu_link_checked_at?: string | null
          kitsu_link_status?: string | null
          kitsu_metadata_checked_at?: string | null
          kitsu_metadata_result?: string | null
          last_synced_at?: string | null
          local_image_url?: string | null
          mal_id: number
          members?: number | null
          metadata_sources?: Json
          popularity?: number | null
          rank?: number | null
          rating?: string | null
          score?: number | null
          scored_by?: number | null
          season?: string | null
          status?: string | null
          studios?: Json | null
          synopsis?: string | null
          synopsis_pt?: string | null
          title: string
          title_english?: string | null
          title_japanese?: string | null
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          episodes?: number | null
          genres?: Json | null
          id?: string
          image_url?: string | null
          kitsu_id?: number | null
          kitsu_link_checked_at?: string | null
          kitsu_link_status?: string | null
          kitsu_metadata_checked_at?: string | null
          kitsu_metadata_result?: string | null
          last_synced_at?: string | null
          local_image_url?: string | null
          mal_id?: number
          members?: number | null
          metadata_sources?: Json
          popularity?: number | null
          rank?: number | null
          rating?: string | null
          score?: number | null
          scored_by?: number | null
          season?: string | null
          status?: string | null
          studios?: Json | null
          synopsis?: string | null
          synopsis_pt?: string | null
          title?: string
          title_english?: string | null
          title_japanese?: string | null
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      anime_entries: {
        Row: {
          completed_at: string | null
          created_at: string
          episodes_watched: number | null
          id: string
          image_url: string | null
          is_archived: boolean | null
          is_favorite: boolean | null
          mal_id: number
          notes: string | null
          notes_has_spoilers: boolean | null
          rating: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["anime_status"]
          title: string
          total_episodes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          episodes_watched?: number | null
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          is_favorite?: boolean | null
          mal_id: number
          notes?: string | null
          notes_has_spoilers?: boolean | null
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["anime_status"]
          title: string
          total_episodes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          episodes_watched?: number | null
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          is_favorite?: boolean | null
          mal_id?: number
          notes?: string | null
          notes_has_spoilers?: boolean | null
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["anime_status"]
          title?: string
          total_episodes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anime_entries_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anime_image_url_repair_backup: {
        Row: {
          mal_id: number
          new_url: string
          old_url: string
          repaired_at: string
        }
        Insert: {
          mal_id: number
          new_url: string
          old_url: string
          repaired_at?: string
        }
        Update: {
          mal_id?: number
          new_url?: string
          old_url?: string
          repaired_at?: string
        }
        Relationships: []
      }
      anime_recommendations: {
        Row: {
          anime_image: string | null
          anime_title: string
          created_at: string | null
          from_user_id: string
          id: string
          mal_id: number
          message: string | null
          status: string | null
          to_user_id: string
          watched_at: string | null
        }
        Insert: {
          anime_image?: string | null
          anime_title: string
          created_at?: string | null
          from_user_id: string
          id?: string
          mal_id: number
          message?: string | null
          status?: string | null
          to_user_id: string
          watched_at?: string | null
        }
        Update: {
          anime_image?: string | null
          anime_title?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          mal_id?: number
          message?: string | null
          status?: string | null
          to_user_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anime_recommendations_from_user_id_profiles_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anime_recommendations_to_user_id_profiles_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ann_metadata_audit: {
        Row: {
          after_values: Json
          ann_id: number
          applied_at: string
          before_values: Json
          fields: string[]
          mal_id: number
        }
        Insert: {
          after_values: Json
          ann_id: number
          applied_at?: string
          before_values: Json
          fields: string[]
          mal_id: number
        }
        Update: {
          after_values?: Json
          ann_id?: number
          applied_at?: string
          before_values?: Json
          fields?: string[]
          mal_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ann_metadata_audit_mal_id_fkey"
            columns: ["mal_id"]
            isOneToOne: true
            referencedRelation: "anime_catalog"
            referencedColumns: ["mal_id"]
          },
        ]
      }
      aod_metadata_audit: {
        Row: {
          after_values: Json
          applied_at: string
          before_values: Json
          fields: string[]
          mal_id: number
          source_version: string
        }
        Insert: {
          after_values: Json
          applied_at?: string
          before_values: Json
          fields: string[]
          mal_id: number
          source_version?: string
        }
        Update: {
          after_values?: Json
          applied_at?: string
          before_values?: Json
          fields?: string[]
          mal_id?: number
          source_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "aod_metadata_audit_mal_id_fkey"
            columns: ["mal_id"]
            isOneToOne: false
            referencedRelation: "anime_catalog"
            referencedColumns: ["mal_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          message_type: string
          metadata: Json | null
          reply_to: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          message_type?: string
          metadata?: Json | null
          reply_to?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          message_type?: string
          metadata?: Json | null
          reply_to?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_pinned: boolean
          joined_at: string
          last_read_at: string | null
          pinned_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          pinned_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          pinned_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cron_token_hashes: {
        Row: {
          created_at: string
          name: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          name: string
          token_hash: string
        }
        Update: {
          created_at?: string
          name?: string
          token_hash?: string
        }
        Relationships: []
      }
      custom_lists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_lists_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_progress_history: {
        Row: {
          anime_entry_id: string
          created_at: string
          episodes_from: number
          episodes_to: number
          id: string
          user_id: string
        }
        Insert: {
          anime_entry_id: string
          created_at?: string
          episodes_from?: number
          episodes_to: number
          id?: string
          user_id: string
        }
        Update: {
          anime_entry_id?: string
          created_at?: string
          episodes_from?: number
          episodes_to?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_progress_history_anime_entry_id_fkey"
            columns: ["anime_entry_id"]
            isOneToOne: false
            referencedRelation: "anime_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_progress_history_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_context: Json | null
          error_message: string
          error_stack: string | null
          id: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_context?: Json | null
          error_message: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_context?: Json | null
          error_message?: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_profiles_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_profiles_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jikan_import_history: {
        Row: {
          cover_failures: number
          covers_count: number
          created_count: number
          duration_ms: number
          error_message: string | null
          finished_at: string
          id: string
          mode: string
          page: number
          resolved_after_ms: number | null
          resolved_at: string | null
          retryable: boolean | null
          started_at: string
          status: string
          triggered_by: string | null
          updated_count: number
        }
        Insert: {
          cover_failures?: number
          covers_count?: number
          created_count?: number
          duration_ms?: number
          error_message?: string | null
          finished_at?: string
          id?: string
          mode: string
          page: number
          resolved_after_ms?: number | null
          resolved_at?: string | null
          retryable?: boolean | null
          started_at?: string
          status: string
          triggered_by?: string | null
          updated_count?: number
        }
        Update: {
          cover_failures?: number
          covers_count?: number
          created_count?: number
          duration_ms?: number
          error_message?: string | null
          finished_at?: string
          id?: string
          mode?: string
          page?: number
          resolved_after_ms?: number | null
          resolved_at?: string | null
          retryable?: boolean | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          updated_count?: number
        }
        Relationships: []
      }
      jikan_import_logs: {
        Row: {
          base: string | null
          created_at: string
          detalhes: Json | null
          evento: string
          id: string
          modo: string | null
          pagina: number | null
          resultado: string
        }
        Insert: {
          base?: string | null
          created_at?: string
          detalhes?: Json | null
          evento: string
          id?: string
          modo?: string | null
          pagina?: number | null
          resultado?: string
        }
        Update: {
          base?: string | null
          created_at?: string
          detalhes?: Json | null
          evento?: string
          id?: string
          modo?: string | null
          pagina?: number | null
          resultado?: string
        }
        Relationships: []
      }
      jikan_server_run: {
        Row: {
          attempt: number
          finished_at: string | null
          id: string
          last_error: string | null
          lease_id: string | null
          lease_until: string | null
          mode: string
          next_attempt_at: string
          pause_requested: boolean
          requested_by: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt?: number
          finished_at?: string | null
          id: string
          last_error?: string | null
          lease_id?: string | null
          lease_until?: string | null
          mode: string
          next_attempt_at?: string
          pause_requested?: boolean
          requested_by?: string | null
          started_at?: string
          status: string
          updated_at?: string
        }
        Update: {
          attempt?: number
          finished_at?: string | null
          id?: string
          last_error?: string | null
          lease_id?: string | null
          lease_until?: string | null
          mode?: string
          next_attempt_at?: string
          pause_requested?: boolean
          requested_by?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jikan_server_run_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kitsu_import_history: {
        Row: {
          cover_failures: number
          covers_count: number
          created_count: number
          duration_ms: number
          error_message: string | null
          finished_at: string
          id: string
          mode: string
          page: number
          resolved_after_ms: number | null
          resolved_at: string | null
          retryable: boolean | null
          started_at: string
          status: string
          triggered_by: string | null
          updated_count: number
        }
        Insert: {
          cover_failures?: number
          covers_count?: number
          created_count?: number
          duration_ms: number
          error_message?: string | null
          finished_at: string
          id?: string
          mode: string
          page: number
          resolved_after_ms?: number | null
          resolved_at?: string | null
          retryable?: boolean | null
          started_at: string
          status: string
          triggered_by?: string | null
          updated_count?: number
        }
        Update: {
          cover_failures?: number
          covers_count?: number
          created_count?: number
          duration_ms?: number
          error_message?: string | null
          finished_at?: string
          id?: string
          mode?: string
          page?: number
          resolved_after_ms?: number | null
          resolved_at?: string | null
          retryable?: boolean | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          updated_count?: number
        }
        Relationships: []
      }
      kitsu_import_items: {
        Row: {
          acao: string
          campos: Json
          capa: boolean
          created_at: string
          id: string
          kitsu_id: number | null
          mal_id: number
          mode: string
          page: number
          title: string | null
        }
        Insert: {
          acao: string
          campos?: Json
          capa?: boolean
          created_at?: string
          id?: string
          kitsu_id?: number | null
          mal_id: number
          mode: string
          page: number
          title?: string | null
        }
        Update: {
          acao?: string
          campos?: Json
          capa?: boolean
          created_at?: string
          id?: string
          kitsu_id?: number | null
          mal_id?: number
          mode?: string
          page?: number
          title?: string | null
        }
        Relationships: []
      }
      list_items: {
        Row: {
          anime_entry_id: string
          created_at: string
          id: string
          list_id: string
          position: number | null
        }
        Insert: {
          anime_entry_id: string
          created_at?: string
          id?: string
          list_id: string
          position?: number | null
        }
        Update: {
          anime_entry_id?: string
          created_at?: string
          id?: string
          list_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "list_items_anime_entry_id_fkey"
            columns: ["anime_entry_id"]
            isOneToOne: false
            referencedRelation: "anime_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "custom_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievements: boolean
          created_at: string
          do_not_disturb_enabled: boolean
          do_not_disturb_end: string
          do_not_disturb_start: string
          friend_accepted: boolean
          friend_added_anime: boolean
          friend_requests: boolean
          friend_started_watching: boolean
          id: string
          recommendations: boolean
          review_likes: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: boolean
          created_at?: string
          do_not_disturb_enabled?: boolean
          do_not_disturb_end?: string
          do_not_disturb_start?: string
          friend_accepted?: boolean
          friend_added_anime?: boolean
          friend_requests?: boolean
          friend_started_watching?: boolean
          id?: string
          recommendations?: boolean
          review_likes?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: boolean
          created_at?: string
          do_not_disturb_enabled?: boolean
          do_not_disturb_end?: string
          do_not_disturb_start?: string
          friend_accepted?: boolean
          friend_added_anime?: boolean
          friend_requests?: boolean
          friend_started_watching?: boolean
          id?: string
          recommendations?: boolean
          review_likes?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_until: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean | null
          updated_at: string
          username: string | null
          warn_count: number | null
          warned_at: string | null
          welcome_seen: boolean
        }
        Insert: {
          avatar_url?: string | null
          ban_until?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_public?: boolean | null
          updated_at?: string
          username?: string | null
          warn_count?: number | null
          warned_at?: string | null
          welcome_seen?: boolean
        }
        Update: {
          avatar_url?: string | null
          ban_until?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string
          username?: string | null
          warn_count?: number | null
          warned_at?: string | null
          welcome_seen?: boolean
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
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      review_reactions: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reactions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string
          created_at: string
          has_spoilers: boolean | null
          id: string
          is_hidden: boolean | null
          likes_count: number | null
          mal_id: number
          rating: number | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          has_spoilers?: boolean | null
          id?: string
          is_hidden?: boolean | null
          likes_count?: number | null
          mal_id: number
          rating?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          has_spoilers?: boolean | null
          id?: string
          is_hidden?: boolean | null
          likes_count?: number | null
          mal_id?: number
          rating?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          created_at: string
          current_page: number
          id: string
          is_running: boolean | null
          last_error: string | null
          last_run_at: string | null
          max_page: number | null
          mode: string
          total_synced: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_page?: number
          id?: string
          is_running?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          max_page?: number | null
          mode?: string
          total_synced?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_page?: number
          id?: string
          is_running?: boolean | null
          last_error?: string | null
          last_run_at?: string | null
          max_page?: number | null
          mode?: string
          total_synced?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_tests: {
        Row: {
          category: string
          created_at: string | null
          criticality: string | null
          description: string | null
          enabled: boolean | null
          expected_behavior: string | null
          id: string
          module: string
          name: string
          test_function: string
          timeout_ms: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          criticality?: string | null
          description?: string | null
          enabled?: boolean | null
          expected_behavior?: string | null
          id?: string
          module: string
          name: string
          test_function: string
          timeout_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          criticality?: string | null
          description?: string | null
          enabled?: boolean | null
          expected_behavior?: string | null
          id?: string
          module?: string
          name?: string
          test_function?: string
          timeout_ms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          assertions: Json | null
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          id: string
          logs: string[] | null
          run_id: string
          status: string
          test_id: string
        }
        Insert: {
          assertions?: Json | null
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          logs?: string[] | null
          run_id: string
          status: string
          test_id: string
        }
        Update: {
          assertions?: Json | null
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          logs?: string[] | null
          run_id?: string
          status?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "system_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          environment: string | null
          failed: number | null
          id: string
          metadata: Json | null
          passed: number | null
          skipped: number | null
          started_at: string | null
          status: string | null
          total_tests: number | null
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          environment?: string | null
          failed?: number | null
          id?: string
          metadata?: Json | null
          passed?: number | null
          skipped?: number | null
          started_at?: string | null
          status?: string | null
          total_tests?: number | null
          trigger_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          environment?: string | null
          failed?: number | null
          id?: string
          metadata?: Json | null
          passed?: number | null
          skipped?: number | null
          started_at?: string | null
          status?: string | null
          total_tests?: number | null
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_suggestions: {
        Row: {
          created_at: string
          current_pt: string | null
          id: string
          mal_id: number
          origin: string
          reason: string
          reviewed_at: string | null
          source_text: string
          status: string
          suggested_text: string
          title: string
        }
        Insert: {
          created_at?: string
          current_pt?: string | null
          id?: string
          mal_id: number
          origin?: string
          reason?: string
          reviewed_at?: string | null
          source_text: string
          status?: string
          suggested_text: string
          title: string
        }
        Update: {
          created_at?: string
          current_pt?: string | null
          id?: string
          mal_id?: number
          origin?: string
          reason?: string
          reviewed_at?: string | null
          source_text?: string
          status?: string
          suggested_text?: string
          title?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_code: string
          invited_email: string | null
          invited_user_id: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code: string
          invited_email?: string | null
          invited_user_id?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invited_email?: string | null
          invited_user_id?: string | null
          inviter_id?: string
          status?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_remove_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: boolean
      }
      admin_set_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: boolean
      }
      apply_ann_metadata: { Args: { p_items: Json }; Returns: Json }
      apply_aod_metadata: { Args: { p_items: Json }; Returns: Json }
      apply_kitsu_metadata: {
        Args: {
          p_genres: Json
          p_mal_id: number
          p_result: string
          p_season: string
          p_studios: Json
          p_year: number
        }
        Returns: Json
      }
      can_add_conversation_participant: {
        Args: { _conversation_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      check_and_unlock_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      discover_catalog: {
        Args: {
          p: Json
          p_limit?: number
          p_order?: string
          p_page?: number
          p_sort?: string
        }
        Returns: Json
      }
      discover_facets: { Args: never; Returns: Json }
      discover_filtered: {
        Args: { p: Json }
        Returns: {
          created_at: string | null
          episodes: number | null
          genres: Json | null
          id: string
          image_url: string | null
          kitsu_id: number | null
          kitsu_link_checked_at: string | null
          kitsu_link_status: string | null
          kitsu_metadata_checked_at: string | null
          kitsu_metadata_result: string | null
          last_synced_at: string | null
          local_image_url: string | null
          mal_id: number
          members: number | null
          metadata_sources: Json
          popularity: number | null
          rank: number | null
          rating: string | null
          score: number | null
          scored_by: number | null
          season: string | null
          status: string | null
          studios: Json | null
          synopsis: string | null
          synopsis_pt: string | null
          title: string
          title_english: string | null
          title_japanese: string | null
          type: string | null
          updated_at: string | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "anime_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_catalog_stats: { Args: never; Returns: Json }
      get_public_list_owner_info: {
        Args: { list_id: string }
        Returns: {
          display_name: string
          username: string
        }[]
      }
      get_site_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_admin: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_friend_with: {
        Args: { _friend_id: string; _user_id: string }
        Returns: boolean
      }
      is_moderator_or_admin: { Args: { _user_id: string }; Returns: boolean }
      jikan_server_claim: { Args: never; Returns: Json }
      jikan_server_command: {
        Args: { p_action: string; p_mode: string; p_user_id: string }
        Returns: Json
      }
      jikan_server_finish: {
        Args: {
          p_error: string
          p_lease: string
          p_page: number
          p_retryable: boolean
          p_wait_ms?: number
        }
        Returns: Json
      }
      jikan_server_schedule: {
        Args: { p_active: boolean; p_wake?: boolean }
        Returns: undefined
      }
      kitsu_link_candidates: {
        Args: { p_limit?: number }
        Returns: {
          mal_id: number
          remaining: number
        }[]
      }
      kitsu_metadata_candidates: {
        Args: { p_limit?: number }
        Returns: {
          kitsu_id: number
          mal_id: number
          remaining: number
        }[]
      }
      log_audit_action: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: string
      }
      log_error: {
        Args: {
          p_error_context?: Json
          p_error_message: string
          p_error_stack?: string
          p_url?: string
          p_user_agent?: string
        }
        Returns: string
      }
      register_system_test: {
        Args: {
          p_category: string
          p_criticality?: string
          p_description: string
          p_expected_behavior?: string
          p_module: string
          p_name: string
          p_test_function: string
        }
        Returns: string
      }
      set_kitsu_link: {
        Args: { p_kitsu_id: number; p_mal_id: number; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      anime_status:
        | "not_started"
        | "watching"
        | "completed"
        | "paused"
        | "dropped"
      app_role: "admin" | "moderator" | "user"
      friendship_status: "pending" | "accepted" | "rejected" | "blocked"
      notification_type:
        | "friend_request"
        | "friend_accepted"
        | "review_like"
        | "achievement"
        | "system"
        | "moderation"
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
      anime_status: [
        "not_started",
        "watching",
        "completed",
        "paused",
        "dropped",
      ],
      app_role: ["admin", "moderator", "user"],
      friendship_status: ["pending", "accepted", "rejected", "blocked"],
      notification_type: [
        "friend_request",
        "friend_accepted",
        "review_like",
        "achievement",
        "system",
        "moderation",
      ],
    },
  },
} as const
