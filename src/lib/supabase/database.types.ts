/**
 * TypeScript types for Supabase database
 * Auto-generated types can be created with: supabase gen types typescript
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      diagrams: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          data: Json; // JSONB
          hash: string;
          created_at: string;
          updated_at: string;
          device_id: string;
          size: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          data: Json;
          hash: string;
          created_at?: string;
          updated_at?: string;
          device_id: string;
          size?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          data?: Json;
          hash?: string;
          created_at?: string;
          updated_at?: string;
          device_id?: string;
          size?: number;
        };
      };
      sync_metadata: {
        Row: {
          id: string;
          user_id: string;
          diagram_id: string;
          device_id: string;
          last_synced: string;
          sync_count: number;
          last_error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          diagram_id: string;
          device_id: string;
          last_synced?: string;
          sync_count?: number;
          last_error?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          diagram_id?: string;
          device_id?: string;
          last_synced?: string;
          sync_count?: number;
          last_error?: string | null;
        };
      };
    };
  };
}
