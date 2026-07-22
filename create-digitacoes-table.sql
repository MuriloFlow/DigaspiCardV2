-- ==============================================================================
-- DIGITAÇÕES — Módulo de Cartões Não Aprovados (Tentativas)
-- Execute no Editor SQL do Supabase
-- ==============================================================================

-- 1. Tabela de Digitações
CREATE TABLE IF NOT EXISTS digitacoes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
  operator_name text NOT NULL,
  client_name   text NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_digitacoes_store_id      ON digitacoes(store_id);
CREATE INDEX IF NOT EXISTS idx_digitacoes_collab_id     ON digitacoes(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_digitacoes_created_at    ON digitacoes(created_at DESC);

-- 3. RLS
ALTER TABLE digitacoes ENABLE ROW LEVEL SECURITY;

-- Leitura: usuário vê apenas sua loja; admin global vê tudo
DROP POLICY IF EXISTS "digitacoes_select" ON digitacoes;
CREATE POLICY "digitacoes_select"
  ON digitacoes FOR SELECT
  USING (true);   -- controle feito no JWT/middleware Next.js

-- Inserção: qualquer usuário autenticado (server-side, storeId vem do JWT)
DROP POLICY IF EXISTS "digitacoes_insert" ON digitacoes;
CREATE POLICY "digitacoes_insert"
  ON digitacoes FOR INSERT
  WITH CHECK (true);

-- Verificação
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'digitacoes';
