import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Browser client (public key) — used only for login.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
