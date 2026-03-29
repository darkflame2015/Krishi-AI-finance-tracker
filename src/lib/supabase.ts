import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Please check your environment variables.');
}

export const supabase: SupabaseClient = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : (null as unknown as SupabaseClient);
