-- AHM AI — update 4: cloud database for the apps and systems people build. Run ONCE in Supabase > SQL Editor.
create table if not exists public.app_sites (
  site text primary key,
  owner uuid not null,
  admin_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_data (
  site text not null references public.app_sites(site) on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (site, col, id)
);

alter table public.app_sites enable row level security;
alter table public.app_data enable row level security;
