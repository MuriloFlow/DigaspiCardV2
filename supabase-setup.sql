-- ==============================================================================
-- SUPABASE — Setup de Banco de Dados Enterprise (V5 Final)
-- Multi-Tenant, RBAC, RLS, Performance Indexes, Audit Logs
-- Rode em um banco ZERADO. Só cria o Admin Global — sem lojas ou funcionários.
-- ==============================================================================

-- 1) Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2) Função auto updated_at
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ==============================================================================
-- 3) TABELAS
-- ==============================================================================

-- Lojas/Unidades da Rede
create table if not exists stores (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Usuários do Sistema (RBAC)
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete restrict,   -- NULL para GLOBAL_ADMIN
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('EMPLOYEE', 'MANAGER', 'GLOBAL_ADMIN')),
  name text,
  is_active boolean default true not null,
  is_primary boolean default false not null,  -- Gerente Principal da unidade
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Colaboradores — store_id obrigatório (NOT NULL enforcement via constraint)
create table if not exists collaborators (
  id uuid default gen_random_uuid() primary key,
  store_id uuid not null references stores(id) on delete restrict, -- OBRIGATÓRIO
  name text not null,
  sub_role text not null default 'Funcionario Operacional'
    check (sub_role in ('Funcionario Operacional', 'Caixa', 'Lider de Caixa', 'VM')),
  merged_into_id uuid references collaborators(id) on delete set null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table collaborators
  add column if not exists sub_role text not null default 'Funcionario Operacional';

alter table collaborators
  drop constraint if exists collaborators_sub_role_check;

alter table collaborators
  add constraint collaborators_sub_role_check
  check (sub_role in ('Funcionario Operacional', 'Caixa', 'Lider de Caixa', 'VM'));

-- Registros de Cartões — store_id obrigatório
create table if not exists records (
  id uuid default gen_random_uuid() primary key,
  store_id uuid not null references stores(id) on delete restrict, -- OBRIGATÓRIO
  collaborator_id uuid not null references collaborators(id) on delete restrict,
  operator_name text not null,
  client_name text not null,
  amount_in_cents integer not null check (amount_in_cents > 0),
  activated boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auditoria de Ações Administrativas
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  user_name text not null,
  user_role text not null,
  action text not null,                -- ex: 'create_collaborator', 'delete_record'
  entity_type text not null,           -- ex: 'collaborator', 'record'
  entity_id uuid,
  payload jsonb,
  ip_address text,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- 4) TRIGGERS
-- ==============================================================================
drop trigger if exists t_stores_modtime on stores;
create trigger t_stores_modtime before update on stores for each row execute function update_modified_column();

drop trigger if exists t_app_users_modtime on app_users;
create trigger t_app_users_modtime before update on app_users for each row execute function update_modified_column();

drop trigger if exists t_collaborators_modtime on collaborators;
create trigger t_collaborators_modtime before update on collaborators for each row execute function update_modified_column();

drop trigger if exists t_records_modtime on records;
create trigger t_records_modtime before update on records for each row execute function update_modified_column();

-- ==============================================================================
-- 5) USUÁRIO INICIAL — Somente Admin Global (sem loja, sem funcionário)
-- ==============================================================================
insert into app_users (username, password_hash, role, name, store_id)
values (
  'operacao@adm',
  crypt('lojadigaspi', gen_salt('bf')),
  'GLOBAL_ADMIN',
  'CEO / Administrador Global',
  null
) on conflict (username) do nothing;

-- ==============================================================================
-- 6) ÍNDICES DE PERFORMANCE (Preparado para milhões de registros)
-- ==============================================================================
-- records: filtros mais comuns
create index if not exists idx_records_store_id         on records(store_id);
create index if not exists idx_records_collaborator_id  on records(collaborator_id);
create index if not exists idx_records_created_at       on records(created_at desc);
create index if not exists idx_records_activated        on records(activated);
-- Índice composto para dashboard diário por loja (query mais frequente)
create index if not exists idx_records_store_date       on records(store_id, created_at desc);

-- collaborators
create index if not exists idx_collaborators_store_id   on collaborators(store_id);
create index if not exists idx_collaborators_is_active  on collaborators(is_active);
create index if not exists idx_collaborators_name       on collaborators(name);

-- audit_logs
create index if not exists idx_audit_logs_created_at    on audit_logs(created_at desc);
create index if not exists idx_audit_logs_store_id      on audit_logs(store_id);

-- app_users
create index if not exists idx_app_users_store_id       on app_users(store_id);

-- ==============================================================================
-- 7) ROW LEVEL SECURITY (Elimina Advisors de Segurança do Supabase)
-- O Next.js usa Service Role Key que bypassa RLS nativamente.
-- Estas policies bloqueiam qualquer acesso direto anônimo ou de cliente.
-- ==============================================================================
alter table stores       enable row level security;
alter table app_users    enable row level security;
alter table collaborators enable row level security;
alter table records       enable row level security;
alter table audit_logs    enable row level security;

-- Remove policies antigas se existirem
drop policy if exists "deny_all_anon" on stores;
drop policy if exists "deny_all_anon" on app_users;
drop policy if exists "deny_all_anon" on collaborators;
drop policy if exists "deny_all_anon" on records;
drop policy if exists "deny_all_anon" on audit_logs;

-- Cria políticas de negação total para acesso público/anônimo
create policy "deny_all_anon" on stores        for all to anon using (false);
create policy "deny_all_anon" on app_users     for all to anon using (false);
create policy "deny_all_anon" on collaborators for all to anon using (false);
create policy "deny_all_anon" on records       for all to anon using (false);
create policy "deny_all_anon" on audit_logs    for all to anon using (false);

-- ==============================================================================
-- 8) RELOAD DO CACHE (PostgREST / Supabase API)
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
