# Supabase requirements

Projeto oficial: `skull-gov` (`kctpcbgaescujhsacqmm`, `sa-east-1`). Nenhuma alteração foi aplicada automaticamente porque esta entrega não possui acesso administrativo ao projeto. O SQL abaixo deve ser revisado e executado pelo administrador no SQL Editor do projeto oficial.

## 1. Schema, índices e RLS

```sql
create extension if not exists pgcrypto;
create schema if not exists private;

do $$ begin
  create type public.app_role as enum ('skull_admin', 'gestor', 'cliente_admin', 'cliente_user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.recommendation as enum ('atacar', 'analisar', 'evitar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.working_capital as enum ('baixo', 'medio', 'alto', 'critico');
exception when duplicate_object then null; end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  role public.app_role not null default 'cliente_user',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text not null,
  trade_name text not null,
  cnpj text not null check (cnpj ~ '^\d{14}$'),
  cnaes text[] not null default '{}',
  city text not null,
  state text not null check (char_length(state) = 2),
  products text[] not null default '{}',
  services text[] not null default '{}',
  service_regions text[] not null default '{}',
  available_cash numeric(14,2),
  operational_capacity text,
  certificates jsonb not null default '[]',
  preferences jsonb not null default '{}',
  positive_keywords text[] not null default '{}',
  negative_keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cnpj)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  pncp_id text not null unique,
  agency_name text not null,
  agency_cnpj text not null,
  unit_name text,
  city text not null,
  state text not null,
  object text not null,
  modality text not null,
  dispute_mode text,
  estimated_value numeric(16,2),
  published_at timestamptz not null,
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null,
  pncp_url text not null,
  process_number text,
  purchase_number text,
  year integer not null,
  documents_available boolean,
  source_updated_at timestamptz,
  distance_km integer,
  remote_execution boolean not null default false,
  skull_score integer not null check (skull_score between 0 and 100),
  pay_risk integer check (pay_risk between 0 and 100),
  competition_risk integer not null check (competition_risk between 0 and 100),
  working_capital public.working_capital not null,
  recommendation public.recommendation not null,
  score_explanation jsonb not null default '[]',
  requirements jsonb not null default '{}',
  raw_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid not null references auth.users(id),
  status text not null check (status in ('running', 'completed', 'failed')),
  filters jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  found_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  error_message text
);

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null,
  status text not null check (status in ('valid', 'expiring', 'expired', 'missing')),
  expires_at date,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.participations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  stage text not null check (stage in ('watching', 'preparing', 'submitted', 'won', 'lost', 'withdrawn')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, opportunity_id)
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_closes_at_idx on public.opportunities (closes_at);
create index if not exists opportunities_published_at_idx on public.opportunities (published_at desc);
create index if not exists opportunities_radar_idx on public.opportunities (recommendation, working_capital, skull_score desc);
create index if not exists opportunities_geo_idx on public.opportunities (state, city, distance_km);
create index if not exists companies_tenant_idx on public.companies (tenant_id);
create index if not exists documents_company_idx on public.company_documents (company_id, expires_at);
create index if not exists participations_company_idx on public.participations (company_id, stage);
create index if not exists alerts_company_idx on public.alert_rules (company_id, enabled);

create or replace function private.current_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function private.current_tenant_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select tenant_id from public.profiles where id = (select auth.uid()) $$;

revoke all on function private.current_role() from public, anon;
revoke all on function private.current_tenant_id() from public, anon;
grant execute on function private.current_role() to authenticated;
grant execute on function private.current_tenant_id() to authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.opportunities enable row level security;
alter table public.sync_runs enable row level security;
alter table public.company_documents enable row level security;
alter table public.participations enable row level security;
alter table public.alert_rules enable row level security;

create policy "tenants_read_own" on public.tenants for select to authenticated
using (id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin');

create policy "profiles_read_scope" on public.profiles for select to authenticated
using (id = (select auth.uid()) or tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin');

create policy "companies_read_scope" on public.companies for select to authenticated
using (tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin');
create policy "companies_manage_scope" on public.companies for all to authenticated
using ((tenant_id = (select private.current_tenant_id()) and (select private.current_role()) in ('gestor','cliente_admin')) or (select private.current_role()) = 'skull_admin')
with check ((tenant_id = (select private.current_tenant_id()) and (select private.current_role()) in ('gestor','cliente_admin')) or (select private.current_role()) = 'skull_admin');

create policy "opportunities_read_scope" on public.opportunities for select to authenticated
using (tenant_id is null or tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin');
create policy "opportunities_admin_insert" on public.opportunities for insert to authenticated
with check ((select private.current_role()) = 'skull_admin');
create policy "opportunities_admin_update" on public.opportunities for update to authenticated
using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');

create policy "sync_runs_admin" on public.sync_runs for all to authenticated
using ((select private.current_role()) = 'skull_admin') with check ((select private.current_role()) = 'skull_admin');

create policy "documents_read_scope" on public.company_documents for select to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')));
create policy "documents_manage_scope" on public.company_documents for all to authenticated
using ((select private.current_role()) in ('skull_admin','gestor','cliente_admin') and exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')))
with check ((select private.current_role()) in ('skull_admin','gestor','cliente_admin') and exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')));

create policy "participations_read_scope" on public.participations for select to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')));
create policy "participations_manage_scope" on public.participations for all to authenticated
using ((select private.current_role()) in ('skull_admin','gestor','cliente_admin') and exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')))
with check ((select private.current_role()) in ('skull_admin','gestor','cliente_admin') and exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')));

create policy "alerts_read_scope" on public.alert_rules for select to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')));
create policy "alerts_manage_scope" on public.alert_rules for all to authenticated
using ((select private.current_role()) in ('skull_admin','gestor','cliente_admin') and exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')))
with check ((select private.current_role()) in ('skull_admin','gestor','cliente_admin') and exists (select 1 from public.companies c where c.id = company_id and (c.tenant_id = (select private.current_tenant_id()) or (select private.current_role()) = 'skull_admin')));

grant usage on schema public to authenticated;
grant select on public.tenants, public.profiles to authenticated;
grant select, insert, update on public.companies, public.opportunities, public.sync_runs, public.company_documents, public.participations, public.alert_rules to authenticated;
revoke all on all tables in schema public from anon;
```

As funções `security definer` ficam no schema privado, têm `search_path` vazio, não são executáveis por `anon`/`public` e só retornam papel/tenant do próprio `auth.uid()`. Elas evitam recursão nas policies de `profiles`; não devem ser movidas para `public`.

## 2. Primeiro usuário e seed da SKULL

1. Crie o primeiro usuário em Authentication > Users.
2. Execute o bloco abaixo substituindo `<AUTH_USER_UUID>` pelo UUID real. Não use um UUID inventado.

```sql
do $$
declare skull_tenant uuid;
begin
  insert into public.tenants (name, slug)
  values ('SKULL GOV', 'skull-gov')
  on conflict (slug) do update set name = excluded.name
  returning id into skull_tenant;

  insert into public.profiles (id, tenant_id, role, display_name)
  values ('<AUTH_USER_UUID>', skull_tenant, 'skull_admin', 'SKULL Admin')
  on conflict (id) do update set tenant_id = excluded.tenant_id, role = excluded.role, display_name = excluded.display_name;

  insert into public.companies (
    tenant_id, legal_name, trade_name, cnpj, city, state, products, services,
    service_regions, positive_keywords, negative_keywords
  ) values (
    skull_tenant, 'SKULL Tecnologia', 'SKULL Tecnologia', '<CNPJ_REAL_14_DIGITOS>', 'Barrinha', 'SP',
    array['SaaS','PWA','aplicativos','portais','dashboards'],
    array['desenvolvimento de software','sistemas web','automação','integrações','APIs','digitalização','suporte de TI','cloud','banco de dados','IA'],
    array['Barrinha/SP','raio de 200 km','execução remota'],
    array['software','sistema','site','portal','aplicativo','dashboard','automação','integração','API','SaaS','hospedagem','cloud','suporte','desenvolvimento','digitalização','painel','plataforma web'],
    array['hardware','computador','notebook','impressora','toner','switch','roteador','câmera','servidor físico','mobiliário','estoque','material','equipamento','peças']
  ) on conflict (tenant_id, cnpj) do nothing;
end $$;
```

O CNPJ real não foi fornecido e por isso não foi inventado.

## 3. Storage privado

Crie um bucket privado chamado `company-documents`. Use caminhos no formato `{company_id}/{uuid}/{filename}`. Depois aplique policies em `storage.objects` que verifiquem se o primeiro segmento pertence a uma empresa visível pelo tenant. Upload/upsert precisa de `INSERT`, `SELECT` e `UPDATE`; delete deve ser restrito a `skull_admin`, `gestor` ou `cliente_admin` da empresa.

## 4. Auth e URLs

- Site URL de produção: URL final da Vercel.
- Redirect URLs: `http://localhost:3000/auth/callback` e `https://<dominio>/auth/callback`.
- Desabilite cadastro público se usuários forem convidados administrativamente.
- Use apenas a publishable key no app. Não configure `service_role` na Vercel.
- Rode os Security e Performance Advisors após aplicar o SQL.
