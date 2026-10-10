import { createClient } from "@supabase/supabase-js";

// Browser client (public key) — used only for login.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
