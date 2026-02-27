import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          duration_days: number;
          price: number;
          stock_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      keys: {
        Row: {
          id: string;
          key_code: string;
          status: 'active' | 'used' | 'blocked' | 'expired';
          duration_days: number;
          price: number;
          hwid: string | null;
          hwid_reset_count: number;
          last_hwid_reset_at: string | null;
          user_id: string | null;
          user_name: string | null;
          product_id: string | null;
          created_at: string;
          expires_at: string | null;
          activated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['keys']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['keys']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          key_id: string | null;
          amount: number;
          payment_status: 'pending' | 'paid' | 'failed' | 'expired';
          payment_id: string | null;
          qris_url: string | null;
          created_at: string;
          paid_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      user_profiles: {
        Row: {
          id: string;
          display_name: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
    };
  };
};
