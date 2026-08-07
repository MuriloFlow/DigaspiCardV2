-- Adicionar colunas novas à tabela 'records'

ALTER TABLE records 
ADD COLUMN IF NOT EXISTS amount_used_in_cents INTEGER NULL,
ADD COLUMN IF NOT EXISTS activated_later BOOLEAN NOT NULL DEFAULT FALSE;

-- Opcional: Atualizar registros antigos para refletir valores base se necessário
UPDATE records SET activated_later = FALSE WHERE activated_later IS NULL;

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

CREATE INDEX IF NOT EXISTS idx_daily_metrics_store_date ON daily_metrics(store_id, date_key);

-- Digitações do Caixa em lote: um registro pode representar varias tentativas.
ALTER TABLE digitacoes
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE digitacoes
DROP CONSTRAINT IF EXISTS digitacoes_quantity_check;

ALTER TABLE digitacoes
ADD CONSTRAINT digitacoes_quantity_check CHECK (quantity > 0);

CREATE INDEX IF NOT EXISTS idx_digitacoes_store_created ON digitacoes(store_id, created_at DESC);

-- Trocas do dia: contador auxiliar para quem ja usa daily_metrics.
ALTER TABLE daily_metrics
ADD COLUMN IF NOT EXISTS total_trocas INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_caixa INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;
