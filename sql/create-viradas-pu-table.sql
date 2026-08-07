-- ==============================================================================
-- VIRADAS PU – Módulo de Registro de Conversão Produto Único (Caixas)
-- Execute no Editor SQL do Supabase
-- ==============================================================================

-- 1. Tabela de Viradas de PU
CREATE TABLE IF NOT EXISTS viradas_pu (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  collaborator_id   uuid NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
  collaborator_name text NOT NULL,
  date_key          text NOT NULL, -- formato YYYY-MM-DD
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_viradas_pu_store_id        ON viradas_pu(store_id);
CREATE INDEX IF NOT EXISTS idx_viradas_pu_collaborator_id ON viradas_pu(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_viradas_pu_date_key        ON viradas_pu(date_key);
CREATE INDEX IF NOT EXISTS idx_viradas_pu_created_at      ON viradas_pu(created_at DESC);

-- 3. RLS
ALTER TABLE viradas_pu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viradas_pu_select" ON viradas_pu;
CREATE POLICY "viradas_pu_select"
  ON viradas_pu FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "viradas_pu_insert" ON viradas_pu;
CREATE POLICY "viradas_pu_insert"
  ON viradas_pu FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "viradas_pu_delete" ON viradas_pu;
CREATE POLICY "viradas_pu_delete"
  ON viradas_pu FOR DELETE
  USING (true);

-- Ativar Realtime para a tabela viradas_pu, para que o dashboard atualize sozinho
alter publication supabase_realtime add table viradas_pu;
