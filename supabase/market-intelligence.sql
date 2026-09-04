-- Market Intelligence bounded context for official historical public procurement data.
-- Review and run in the official Supabase SQL Editor. This migration is intentionally
-- separate from tenant tables such as companies and participations.

create extension if not exists pgcrypto;

do $$ begin
  create type public.market_supplier_kind as enum ('pj', 'pf', 'foreign', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.market_source_system as enum ('compras_gov', 'pncp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.market_data_quality as enum ('official_structured', 'official_document', 'inferred', 'unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.market_coverage_status as enum ('complete', 'partial', 'unknown');
exception when duplicate_object then null; end $$;

create table if not exists public.market_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_kind public.market_supplier_kind not null,
  normalized_cnpj text check (normalized_cnpj is null or normalized_cnpj ~ '^\d{14}$'),
  masked_document text,
  legal_name text not null,
  trade_name text,
  city text,
  state text check (state is null or char_length(state) = 2),
  main_cnae text,
  source_updated_at timestamptz,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_suppliers_pj_cnpj_required check (supplier_kind <> 'pj' or normalized_cnpj is not null),
  constraint market_suppliers_pf_no_cpf check (supplier_kind <> 'pf' or normalized_cnpj is null)
);

create unique index if not exists market_suppliers_cnpj_uidx on public.market_suppliers (normalized_cnpj) where normalized_cnpj is not null;
create index if not exists market_suppliers_name_idx on public.market_suppliers (legal_name);
create index if not exists market_suppliers_geo_idx on public.market_suppliers (state, city);
create index if not exists market_suppliers_cnae_idx on public.market_suppliers (main_cnae);

create table if not exists public.market_supplier_source_ids (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.market_suppliers(id) on delete cascade,
  source_system public.market_source_system not null,
  source_key text not null,
  source_url text,
  source_updated_at timestamptz,
  raw_hash text,
  data_quality public.market_data_quality not null default 'official_structured',
  ingested_at timestamptz not null default now(),
  unique (source_system, source_key)
);

create table if not exists public.market_buyers (
  id uuid primary key default gen_random_uuid(),
  agency_cnpj text check (agency_cnpj is null or agency_cnpj ~ '^\d{14}$'),
  agency_name text not null,
  unit_name text,
  uasg text,
  city text,
  state text check (state is null or char_length(state) = 2),
  municipality_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists market_buyers_agency_unit_uidx on public.market_buyers (coalesce(agency_cnpj, ''), coalesce(uasg, ''), coalesce(unit_name, ''));
create index if not exists market_buyers_uasg_idx on public.market_buyers (uasg);
create index if not exists market_buyers_geo_idx on public.market_buyers (state, city);

create table if not exists public.market_procurements (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.market_buyers(id) on delete set null,
  title text,
  object text,
  modality text,
  process_number text,
  purchase_number text,
  year integer,
  coverage_status public.market_coverage_status not null default 'unknown',
  participant_coverage_status public.market_coverage_status not null default 'unknown',
  source_updated_at timestamptz,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_procurement_source_ids (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references public.market_procurements(id) on delete cascade,
  source_system public.market_source_system not null,
  source_key text not null,
  source_url text not null,
  source_updated_at timestamptz,
  raw_hash text,
  data_quality public.market_data_quality not null default 'official_structured',
  ingested_at timestamptz not null default now(),
  unique (source_system, source_key)
);

create table if not exists public.market_procurement_items (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references public.market_procurements(id) on delete cascade,
  source_system public.market_source_system not null,
  source_key text not null,
  item_number integer,
  description text not null,
  detailed_description text,
  material_or_service text,
  catalog_code text,
  class_code text,
  group_code text,
  unit text,
  quantity numeric,
  estimated_unit_value numeric(16,4),
  estimated_total_value numeric(16,2),
  has_structured_result boolean,
  source_url text not null,
  source_updated_at timestamptz,
  raw_hash text,
  data_quality public.market_data_quality not null default 'official_structured',
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_key)
);

create index if not exists market_items_procurement_idx on public.market_procurement_items (procurement_id);
create index if not exists market_items_catalog_idx on public.market_procurement_items (catalog_code, class_code, group_code);

create table if not exists public.market_results (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references public.market_procurements(id) on delete cascade,
  item_id uuid not null references public.market_procurement_items(id) on delete cascade,
  supplier_id uuid not null references public.market_suppliers(id) on delete restrict,
  source_system public.market_source_system not null,
  source_key text not null,
  homologated_quantity numeric,
  homologated_unit_value numeric(16,4),
  homologated_total_value numeric(16,2),
  discount_percent numeric(8,4),
  status text,
  result_date timestamptz,
  rank integer,
  source_url text not null,
  source_updated_at timestamptz,
  raw_hash text,
  data_quality public.market_data_quality not null default 'official_structured',
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_key)
);

create index if not exists market_results_supplier_idx on public.market_results (supplier_id, result_date desc);
create index if not exists market_results_procurement_idx on public.market_results (procurement_id);
create index if not exists market_results_item_idx on public.market_results (item_id);

create table if not exists public.market_participations (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references public.market_procurements(id) on delete cascade,
  item_id uuid references public.market_procurement_items(id) on delete cascade,
  supplier_id uuid not null references public.market_suppliers(id) on delete restrict,
  initial_proposal numeric(16,4),
  final_bid numeric(16,4),
  rank integer,
  outcome text,
  won boolean,
  disqualified boolean,
  disqualification_reason text,
  source_type text not null,
  source_document_id uuid,
  source_system public.market_source_system not null,
  source_key text not null,
  source_url text not null,
  raw_hash text,
  data_quality public.market_data_quality not null,
  ingested_at timestamptz not null default now(),
  unique (source_system, source_key)
);

create table if not exists public.market_contracts (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid references public.market_procurements(id) on delete set null,
  supplier_id uuid references public.market_suppliers(id) on delete restrict,
  buyer_id uuid references public.market_buyers(id) on delete set null,
  contract_number text,
  contracted_value numeric(16,2),
  starts_at date,
  ends_at date,
  source_system public.market_source_system not null,
  source_key text not null,
  source_url text not null,
  source_updated_at timestamptz,
  raw_hash text,
  data_quality public.market_data_quality not null default 'official_structured',
  ingested_at timestamptz not null default now(),
  unique (source_system, source_key)
);

create table if not exists public.market_source_documents (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid references public.market_procurements(id) on delete cascade,
  title text not null,
  document_type text,
  official_url text not null,
  mime_type text,
  checksum text,
  published_at timestamptz,
  fetched_at timestamptz,
  parse_status text not null default 'pending',
  parser_version text,
  storage_path text,
  created_at timestamptz not null default now(),
  unique (official_url)
);

alter table public.market_participations
  add constraint market_participations_document_fk
  foreign key (source_document_id) references public.market_source_documents(id) on delete set null;

create table if not exists public.market_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_system public.market_source_system not null,
  resource text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_by uuid references auth.users(id) on delete set null,
  filters jsonb not null default '{}'::jsonb,
  cursor_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  error_summary text
);

create table if not exists public.market_ingestion_cursors (
  id uuid primary key default gen_random_uuid(),
  source_system public.market_source_system not null,
  resource text not null,
  cursor_key text not null,
  cursor_value jsonb not null default '{}'::jsonb,
  coverage_start date,
  coverage_end date,
  updated_at timestamptz not null default now(),
  unique (source_system, resource, cursor_key)
);

create table if not exists public.market_supplier_metrics (
  supplier_id uuid primary key references public.market_suppliers(id) on delete cascade,
  procurements_identified integer not null default 0,
  items_identified integer not null default 0,
  procurements_won integer not null default 0,
  items_won integer not null default 0,
  win_rate_procurements numeric(8,6),
  win_rate_items numeric(8,6),
  homologated_value numeric(18,2) not null default 0,
  contracted_value numeric(18,2),
  distinct_buyers integer not null default 0,
  distinct_categories integer not null default 0,
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  participant_coverage_status public.market_coverage_status not null default 'unknown',
  calculated_at timestamptz not null default now()
);

create table if not exists public.market_lead_scores (
  supplier_id uuid primary key references public.market_suppliers(id) on delete cascade,
  total_score integer,
  activity_score integer not null default 0,
  loss_opportunity_score integer,
  buyer_concentration_score integer not null default 0,
  market_fit_score integer not null default 0,
  recency_score integer not null default 0,
  coverage_score integer not null default 0,
  score_version text not null,
  explanation jsonb not null default '[]'::jsonb,
  coverage_start date,
  coverage_end date,
  covered_sources text[] not null default '{}',
  calculated_at timestamptz not null default now()
);

alter table public.market_suppliers enable row level security;
alter table public.market_supplier_source_ids enable row level security;
alter table public.market_buyers enable row level security;
alter table public.market_procurements enable row level security;
alter table public.market_procurement_source_ids enable row level security;
alter table public.market_procurement_items enable row level security;
alter table public.market_results enable row level security;
alter table public.market_participations enable row level security;
alter table public.market_contracts enable row level security;
alter table public.market_source_documents enable row level security;
alter table public.market_ingestion_runs enable row level security;
alter table public.market_ingestion_cursors enable row level security;
alter table public.market_supplier_metrics enable row level security;
alter table public.market_lead_scores enable row level security;

create policy "market_intelligence_admin_only_suppliers" on public.market_suppliers for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_supplier_sources" on public.market_supplier_source_ids for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_buyers" on public.market_buyers for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_procurements" on public.market_procurements for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_procurement_sources" on public.market_procurement_source_ids for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_items" on public.market_procurement_items for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_results" on public.market_results for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_participations" on public.market_participations for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_contracts" on public.market_contracts for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_documents" on public.market_source_documents for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_runs" on public.market_ingestion_runs for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_cursors" on public.market_ingestion_cursors for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_metrics" on public.market_supplier_metrics for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');
create policy "market_intelligence_admin_only_scores" on public.market_lead_scores for all to authenticated using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');

grant select, insert, update on
  public.market_suppliers,
  public.market_supplier_source_ids,
  public.market_buyers,
  public.market_procurements,
  public.market_procurement_source_ids,
  public.market_procurement_items,
  public.market_results,
  public.market_participations,
  public.market_contracts,
  public.market_source_documents,
  public.market_ingestion_runs,
  public.market_ingestion_cursors,
  public.market_supplier_metrics,
  public.market_lead_scores
to authenticated;

