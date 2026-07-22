-- Adicionar colunas novas à tabela 'records'

ALTER TABLE records 
ADD COLUMN IF NOT EXISTS amount_used_in_cents INTEGER NULL,
ADD COLUMN IF NOT EXISTS activated_later BOOLEAN NOT NULL DEFAULT FALSE;

-- Opcional: Atualizar registros antigos para refletir valores base se necessário
UPDATE records SET activated_later = FALSE WHERE activated_later IS NULL;
