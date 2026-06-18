import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ].filter(Boolean);
  
  throw new Error(`Missing Environment Variables: ${missing.join(', ')}. Ensure .env.local exists in the root directory.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);