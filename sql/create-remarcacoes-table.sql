-- ============================================================
-- MÓDULO: Registro de Remarcação (Refatorado para Lotes)
-- Executa este script no Supabase SQL Editor
-- ============================================================

-- ── EXTENSÃO UUID ──────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABELA PRINCIPAL: remarcacoes (Cabeçalho/Lote)
-- ============================================================
-- Como a tabela remarcacoes já existe no projeto do usuário, é 
-- altamente recomendado recriá-la ou usar ALTER TABLE.
-- Para o ambiente de desenvolvimento, vamos dropar se existir.
DROP TABLE IF EXISTS public.remarcacao_itens CASCADE;
DROP TABLE IF EXISTS public.remarcacao_historico CASCADE;
DROP TABLE IF EXISTS public.remarcacoes CASCADE;

CREATE TABLE public.remarcacoes (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id              UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  collaborator_id       UUID          REFERENCES public.collaborators(id) ON DELETE SET NULL,
  operator_name         TEXT          NOT NULL,

  -- Aprovação (Somente no final)
  manager_id            UUID          REFERENCES public.app_users(id) ON DELETE SET NULL,
  manager_name          TEXT,
  manager_signature_b64 TEXT,

  -- Status
  -- draft            = rascunho (lote aberto, operador inserindo itens)
  -- pending_approval = lote finalizado pelo operador, aguardando gerente
  -- completed        = lote finalizado e assinado
  -- cancelled        = lote cancelado
  status                TEXT          NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'pending_approval', 'completed', 'cancelled')),

  -- Timestamps
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ   -- soft delete
);

CREATE INDEX idx_remarcacoes_store_id ON public.remarcacoes (store_id);
CREATE INDEX idx_remarcacoes_collaborator_id ON public.remarcacoes (collaborator_id);

-- ============================================================
-- 2. TABELA DE ITENS: remarcacao_itens
-- ============================================================
CREATE TABLE public.remarcacao_itens (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  remarcacao_id         UUID          NOT NULL REFERENCES public.remarcacoes(id) ON DELETE CASCADE,
  
  -- Produto
  barcode               TEXT          NOT NULL,
  internal_code         TEXT,
  
  -- Foto da etiqueta salva como base64
  label_photo_b64       TEXT          NOT NULL,
  
  -- Valores
  original_value_cents  INTEGER       NOT NULL CHECK (original_value_cents >= 0),
  remarked_value_cents  INTEGER       NOT NULL CHECK (remarked_value_cents >= 0),
  
  -- Complementares
  notes                 TEXT,
  
  -- Timestamps
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_remarcacao_itens_remarcacao_id ON public.remarcacao_itens (remarcacao_id);
CREATE INDEX idx_remarcacao_itens_barcode ON public.remarcacao_itens (barcode);

-- ============================================================
-- 3. TABELA DE HISTÓRICO / AUDITORIA
-- ============================================================
CREATE TABLE public.remarcacao_historico (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  remarcacao_id         UUID          NOT NULL REFERENCES public.remarcacoes(id) ON DELETE CASCADE,
  item_id               UUID          REFERENCES public.remarcacao_itens(id) ON DELETE CASCADE,
  
  changed_by_id         UUID          NOT NULL,
  changed_by_name       TEXT          NOT NULL,
  action                TEXT          NOT NULL, -- "created", "added_item", "updated_status", "deleted", "reopened"
  field_changed         TEXT,
  old_value             TEXT,
  new_value             TEXT,
  snapshot              JSONB,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_remarcacao_historico_remarcacao_id ON public.remarcacao_historico (remarcacao_id);
CREATE INDEX idx_remarcacao_historico_item_id ON public.remarcacao_historico (item_id);

-- ============================================================
-- 4. POLÍTICAS DE RLS E REALTIME
-- ============================================================
ALTER TABLE public.remarcacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarcacao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarcacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL on remarcacoes" ON public.remarcacoes FOR ALL USING (true);
CREATE POLICY "Allow ALL on remarcacao_itens" ON public.remarcacao_itens FOR ALL USING (true);
CREATE POLICY "Allow ALL on remarcacao_historico" ON public.remarcacao_historico FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.remarcacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.remarcacao_itens;
