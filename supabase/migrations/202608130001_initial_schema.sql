create extension if not exists pgcrypto;

create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  marketplace text not null default 'Amazon US',
  product_category text,
  own_asin text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null check (source in ('sellersprite_product','sellersprite_keyword','manual','amazon_sp_api')),
  source_file_name text,
  source_asin text,
  imported_rows integer not null default 0,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asin text not null,
  parent_asin text,
  brand text,
  sku text,
  title text,
  bullets jsonb not null default '[]'::jsonb,
  main_image_url text,
  product_url text,
  category_path text,
  main_category text,
  subcategory text,
  detail_parameters text,
  relation_type text not null default 'unclassified',
  review_status text not null default 'pending',
  latest_snapshot_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, asin)
);

create table if not exists public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  observed_at timestamptz not null default now(),
  price numeric(12,2),
  prime_price numeric(12,2),
  coupon text,
  rating numeric(3,2),
  review_count integer,
  monthly_review_growth integer,
  monthly_sales integer,
  monthly_sales_growth numeric(12,4),
  monthly_revenue numeric(14,2),
  main_bsr integer,
  subcategory_bsr integer,
  variant_count integer,
  questions_count integer,
  fba_fee numeric(12,2),
  gross_margin numeric(12,4),
  listed_at date,
  delivery_method text,
  seller_name text,
  seller_country text,
  raw_data jsonb not null default '{}'::jsonb
);

create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  keyword text not null,
  translation text,
  created_at timestamptz not null default now(),
  unique(project_id, keyword)
);

create table if not exists public.keyword_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_asin text,
  observed_at timestamptz not null default now(),
  traffic_share numeric(12,6),
  weekly_impressions integer,
  keyword_type text,
  traffic_type text,
  organic_rank integer,
  ad_rank integer,
  aba_weekly_rank integer,
  monthly_search_volume integer,
  purchases integer,
  purchase_rate numeric(12,6),
  impressions integer,
  clicks integer,
  product_count integer,
  supply_demand_ratio numeric(14,4),
  ad_competitor_count integer,
  ppc_price numeric(12,2),
  bid_range text,
  top_asins text[] not null default '{}',
  raw_data jsonb not null default '{}'::jsonb
);

create table if not exists public.competitor_images (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position integer not null default 1,
  image_type text not null default 'gallery',
  source_url text,
  storage_path text,
  ocr_text text,
  selling_points jsonb not null default '[]'::jsonb,
  ai_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  analysis_type text not null,
  provider text,
  model text,
  prompt_version text,
  input_snapshot jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists competitors_project_idx on public.competitors(project_id);
create index if not exists competitor_snapshots_lookup_idx on public.competitor_snapshots(competitor_id, observed_at desc);
create index if not exists keywords_project_idx on public.keywords(project_id);
create index if not exists keyword_snapshots_lookup_idx on public.keyword_snapshots(keyword_id, source_asin, observed_at desc);
create index if not exists competitor_images_order_idx on public.competitor_images(competitor_id, position);

alter table public.research_projects enable row level security;
alter table public.import_batches enable row level security;
alter table public.competitors enable row level security;
alter table public.competitor_snapshots enable row level security;
alter table public.keywords enable row level security;
alter table public.keyword_snapshots enable row level security;
alter table public.competitor_images enable row level security;
alter table public.ai_analyses enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['research_projects','import_batches','competitors','competitor_snapshots','keywords','keyword_snapshots','competitor_images','ai_analyses']
  loop
    execute format('drop policy if exists owner_all on public.%I', table_name);
    execute format('create policy owner_all on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('competitor-images', 'competitor-images', false)
on conflict (id) do nothing;

drop policy if exists competitor_images_owner_select on storage.objects;
drop policy if exists competitor_images_owner_insert on storage.objects;
drop policy if exists competitor_images_owner_update on storage.objects;
drop policy if exists competitor_images_owner_delete on storage.objects;

create policy competitor_images_owner_select on storage.objects for select using (bucket_id = 'competitor-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy competitor_images_owner_insert on storage.objects for insert with check (bucket_id = 'competitor-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy competitor_images_owner_update on storage.objects for update using (bucket_id = 'competitor-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy competitor_images_owner_delete on storage.objects for delete using (bucket_id = 'competitor-images' and (storage.foldername(name))[1] = auth.uid()::text);
