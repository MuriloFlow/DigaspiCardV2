-- ============================================================
-- MÓDULO: Registro de Remarcação
-- Executa este script no Supabase SQL Editor
-- Sem necessidade de Storage — tudo salvo como base64 na tabela
-- ============================================================

-- ── EXTENSÃO UUID (já deve estar ativa, mas garante) ──────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA PRINCIPAL: remarcacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.remarcacoes (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id              UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  collaborator_id       UUID          REFERENCES public.collaborators(id) ON DELETE SET NULL,
  operator_name         TEXT          NOT NULL,

  -- Produto
  barcode               TEXT,
  internal_code         TEXT,

  -- Foto da etiqueta salva como base64 diretamente na tabela
  -- Formato: "data:image/jpeg;base64,/9j/4AAQ..."
  label_photo_b64       TEXT,

  -- Valores
  original_value_cents  INTEGER       CHECK (original_value_cents >= 0),
  remarked_value_cents  INTEGER       CHECK (remarked_value_cents >= 0),

  -- Complementares
  notes                 TEXT,

  -- Aprovação
  manager_id            UUID          REFERENCES public.app_users(id) ON DELETE SET NULL,
  manager_name          TEXT,

  -- Assinatura do gerente salva como base64 diretamente na tabela
  -- Formato: "data:image/png;base64,iVBOR..."
  manager_signature_b64 TEXT,

  -- Status
  -- draft            = rascunho (auto-save em progresso)
  -- pending_approval = aguardando assinatura do gerente
  -- completed        = finalizada e assinada
  -- cancelled        = cancelada
  status                TEXT          NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'pending_approval', 'completed', 'cancelled')),

  -- Timestamps
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ   -- soft delete

);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_remarcacoes_store_id        ON public.remarcacoes (store_id);
CREATE INDEX IF NOT EXISTS idx_remarcacoes_collaborator_id ON public.remarcacoes (collaborator_id);
CREATE INDEX IF NOT EXISTS idx_remarcacoes_status          ON public.remarcacoes (status);
CREATE INDEX IF NOT EXISTS idx_remarcacoes_barcode         ON public.remarcacoes (barcode);
CREATE INDEX IF NOT EXISTS idx_remarcacoes_created_at      ON public.remarcacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remarcacoes_deleted_at      ON public.remarcacoes (deleted_at) WHERE deleted_at IS NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_remarcacoes_updated_at ON public.remarcacoes;
CREATE TRIGGER trg_remarcacoes_updated_at
  BEFORE UPDATE ON public.remarcacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABELA DE HISTÓRICO: remarcacoes_historico
-- Auditoria completa de todas as alterações
-- ============================================================
CREATE TABLE IF NOT EXISTS public.remarcacoes_historico (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  remarcacao_id     UUID        NOT NULL REFERENCES public.remarcacoes(id) ON DELETE CASCADE,
  changed_by_id     UUID        REFERENCES public.app_users(id) ON DELETE SET NULL,
  changed_by_name   TEXT        NOT NULL,
  action            TEXT        NOT NULL, -- 'created' | 'updated' | 'photo_added' | 'barcode_scanned' | 'values_set' | 'completed' | 'cancelled'
  field_changed     TEXT,                 -- campo alterado
  old_value         TEXT,                 -- valor anterior
  new_value         TEXT,                 -- novo valor
  snapshot          JSONB,               -- snapshot completo no momento da alteração
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remhist_remarcacao_id ON public.remarcacoes_historico (remarcacao_id);
CREATE INDEX IF NOT EXISTS idx_remhist_created_at    ON public.remarcacoes_historico (created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.remarcacoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarcacoes_historico ENABLE ROW LEVEL SECURITY;

-- service_role tem acesso total (usado pelo backend com supabaseAdmin)
CREATE POLICY "service_role_all_remarcacoes"
  ON public.remarcacoes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_remarcacoes_historico"
  ON public.remarcacoes_historico
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- REALTIME — Habilitar publicação de mudanças em tempo real
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.remarcacoes;

-- ============================================================
-- COMENTÁRIOS (documentação inline)
-- ============================================================
COMMENT ON TABLE  public.remarcacoes IS 'Registros de remarcação de preço de produtos — sem Storage externo';
COMMENT ON COLUMN public.remarcacoes.label_photo_b64       IS 'Foto da etiqueta em base64 (data:image/jpeg;base64,...) — salvo direto na tabela';
COMMENT ON COLUMN public.remarcacoes.manager_signature_b64 IS 'Assinatura do gerente em base64 (data:image/png;base64,...) — salvo direto na tabela';
COMMENT ON COLUMN public.remarcacoes.status                IS 'draft | pending_approval | completed | cancelled';
COMMENT ON COLUMN public.remarcacoes.deleted_at            IS 'Soft delete — NULL = não deletado';
COMMENT ON TABLE  public.remarcacoes_historico IS 'Auditoria completa de todas as alterações nas remarcações';
