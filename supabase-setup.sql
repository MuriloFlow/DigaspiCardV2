-- ============================================
-- SUPABASE — Setup de Banco de Dados Profissional (V3)
-- Inclui: Multi-Tenant (Lojas), Autenticação (RBAC), Auditoria e Soft Merge
-- ============================================

-- 1) Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- Para hash de senhas

-- 2) Função genérica para atualizar o updated_at
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ============================================
-- 3) Tabela de Lojas (Unidades / Multi-Tenant)
-- ============================================
create table if not exists stores (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Garantir trigger
drop trigger if exists update_stores_modtime on stores;
create trigger update_stores_modtime before update on stores for each row execute function update_modified_column();

-- Inserir loja padrão
insert into stores (name) values ('Digaspi 41') on conflict do nothing;

-- ============================================
-- 4) Tabela de Usuários do App (RBAC)
-- ============================================
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id), -- Nullable para GLOBAL_ADMIN
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('EMPLOYEE', 'GLOBAL_ADMIN', 'MANAGER')),
  name text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Migrar tabelas existentes para ter store_id caso não tenha
alter table app_users add column if not exists store_id uuid references stores(id);

-- Inserir usuários iniciais
do $$
declare
  v_store_id uuid;
begin
  select id into v_store_id from stores where name = 'Digaspi 41' limit 1;

  insert into app_users (username, password_hash, role, name, store_id)
  values 
    ('operacao.41', crypt('digaspi41', gen_salt('bf')), 'EMPLOYEE', 'Funcionários', v_store_id),
    ('operacao@adm', crypt('digaspi41', gen_salt('bf')), 'GLOBAL_ADMIN', 'Admin Global', null)
  on conflict (username) do nothing;
end $$;

drop trigger if exists update_app_users_modtime on app_users;
create trigger update_app_users_modtime before update on app_users for each row execute function update_modified_column();


-- ============================================
-- 5) Tabela de Colaboradores (Com suporte a Soft Merge)
-- ============================================
create table if not exists collaborators (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id),
  name text not null,
  merged_into_id uuid references collaborators(id),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table collaborators add column if not exists store_id uuid references stores(id);
-- Preencher store_id para colaboradores antigos
do $$
declare v_store_id uuid;
begin
  select id into v_store_id from stores where name = 'Digaspi 41' limit 1;
  update collaborators set store_id = v_store_id where store_id is null;
end $$;

drop trigger if exists update_collaborators_modtime on collaborators;
create trigger update_collaborators_modtime before update on collaborators for each row execute function update_modified_column();


-- ============================================
-- 6) Tabela de registros de cartões
-- ============================================
create table if not exists records (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id),
  collaborator_id uuid not null references collaborators(id) on delete restrict,
  operator_name text not null,
  client_name text not null,
  amount_in_cents integer not null check (amount_in_cents > 0),
  activated boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table records add column if not exists store_id uuid references stores(id);
-- Preencher store_id para registros antigos
do $$
declare v_store_id uuid;
begin
  select id into v_store_id from stores where name = 'Digaspi 41' limit 1;
  update records set store_id = v_store_id where store_id is null;
end $$;

drop trigger if exists update_records_modtime on records;
create trigger update_records_modtime before update on records for each row execute function update_modified_column();


-- ============================================
-- 7) Auditoria
-- ============================================
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id),
  user_id uuid references app_users(id),
  user_name text not null,
  user_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  ip_address text,
  created_at timestamptz default now() not null
);
alter table audit_logs add column if not exists store_id uuid references stores(id);

-- ============================================
-- 8) Índices de Performance
-- ============================================
create index if not exists idx_records_store_id on records(store_id);
create index if not exists idx_records_collaborator_id on records(collaborator_id);
create index if not exists idx_records_created_at on records(created_at desc);
create index if not exists idx_collaborators_store_id on collaborators(store_id);

-- 9) FORÇAR ATUALIZAÇÃO DO CACHE DE SCHEMA
NOTIFY pgrst, 'reload schema';
