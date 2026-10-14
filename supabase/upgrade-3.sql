-- AHM AI — update 3. Run ONCE in Supabase > SQL Editor (safe to run again).
-- Answers keep being made even when the user leaves the app; they are saved here and shown when the user comes back.
create table if not exists public.jobs (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  status text not null default 'running',
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
create index if not exists jobs_user_idx on public.jobs (user_id, created_at desc);
