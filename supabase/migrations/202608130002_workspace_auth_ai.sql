create table if not exists public.project_workspaces (
  project_id uuid primary key references public.research_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_snapshots_project_idx on public.workspace_snapshots(project_id, created_at desc);

alter table public.project_workspaces enable row level security;
alter table public.workspace_snapshots enable row level security;

drop policy if exists owner_all on public.project_workspaces;
drop policy if exists owner_all on public.workspace_snapshots;
create policy owner_all on public.project_workspaces for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on public.workspace_snapshots for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
