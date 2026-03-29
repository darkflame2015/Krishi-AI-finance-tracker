import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export let isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Please check your environment variables.');
}

let supabaseClient: SupabaseClient = null as unknown as SupabaseClient;

if (isSupabaseConfigured) {
    try {
        const formattedUrl = supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`;
        supabaseClient = createClient(formattedUrl, supabaseAnonKey);
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        isSupabaseConfigured = false;
    }
}

export const supabase = supabaseClient;
