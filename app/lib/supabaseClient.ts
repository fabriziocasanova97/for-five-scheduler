import { createClient } from '@supabase/supabase-js';

// --- SHARED SUPABASE CLIENT ---
// A single browser client for the whole app. Supabase warns against
// creating multiple GoTrueClient instances in the same tab, so every
// component imports this one instance instead of calling createClient itself.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
