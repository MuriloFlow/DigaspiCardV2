-- ==============================================================================
-- TROCAS — Módulo de Registro de Trocas por Gerente
-- Execute no Editor SQL do Supabase
-- ==============================================================================

-- 1. Tabela de Trocas
CREATE TABLE IF NOT EXISTS trocas (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  manager_id      uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  manager_name    text NOT NULL,
  date_key        text NOT NULL, -- formato YYYY-MM-DD
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_trocas_store_id   ON trocas(store_id);
CREATE INDEX IF NOT EXISTS idx_trocas_manager_id ON trocas(manager_id);
CREATE INDEX IF NOT EXISTS idx_trocas_date_key   ON trocas(date_key);
CREATE INDEX IF NOT EXISTS idx_trocas_created_at ON trocas(created_at DESC);

-- 3. RLS
ALTER TABLE trocas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trocas_select" ON trocas;
CREATE POLICY "trocas_select"
  ON trocas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "trocas_insert" ON trocas;
CREATE POLICY "trocas_insert"
  ON trocas FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "trocas_delete" ON trocas;
CREATE POLICY "trocas_delete"
  ON trocas FOR DELETE
  USING (true);

-- 4. Adicionar coluna total_trocas na tabela daily_metrics (se ainda não existir)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date_key text NOT NULL,
  total_customers integer NOT NULL DEFAULT 0,
  total_caixa integer NOT NULL DEFAULT 0,
  total_trocas integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (store_id, date_key)
);

ALTER TABLE daily_metrics
  ADD COLUMN IF NOT EXISTS total_trocas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_caixa integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_metrics_store_date ON daily_metrics(store_id, date_key);

-- Verificação
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('trocas', 'daily_metrics');
