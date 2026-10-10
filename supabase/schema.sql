-- AHM AI database. Run this ONCE in Supabase > SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  plan text not null default 'free',
  plan_until timestamptz,
  used int not null default 0,
  period_key text,
  total_count int not null default 0,
  telegram_chat_id bigint,
  created_at timestamptz not null default now()
);

-- Only the server (secret key) can read/write this table.
alter table public.profiles enable row level security;
