-- AHM AI — update 2. Run ONCE in Supabase > SQL Editor (safe to run again).

-- 1) Chats saved on the account (so they show on every phone and computer)
create table if not exists public.chats (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.chats enable row level security;

-- 2) Websites users publish with a link
create table if not exists public.sites (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text,
  html text not null,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sites enable row level security;
create index if not exists sites_user_idx on public.sites (user_id);

-- 3) Invite friends: bonus questions
alter table public.profiles add column if not exists bonus int not null default 0;
alter table public.profiles add column if not exists ref_code text unique;
alter table public.profiles add column if not exists referred_by uuid;
alter table public.profiles add column if not exists invites int not null default 0;
