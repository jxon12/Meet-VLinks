// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env"
  );
}
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
