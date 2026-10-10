// Reads settings safely: removes spaces / new lines that sneak in when keys are copied on a phone.
const clean = (v) => (v || "").replace(/[\s​-‏‪-‮⁦-⁩﻿]+/g, "");

const DEFAULT_SUPABASE_URL = "https://lvfuasdufrrlpkloztzf.supabase.co";

function fixUrl(v) {
  let u = clean(v).replace(/[.,/]+$/, "");
  if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(u) ? u : DEFAULT_SUPABASE_URL;
}

// NEXT_PUBLIC_* must be written out literally so Next.js can put them in the browser bundle.
export const SUPABASE_URL = fixUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const TELEGRAM_BOT = clean(process.env.NEXT_PUBLIC_TELEGRAM_BOT).replace(/^@/, "");

// Server-only values (read lazily so they never end up in the browser).
export const serverEnv = (name) => clean(process.env[name]);
