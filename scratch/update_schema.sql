-- 1. Adicionar coluna activated_later se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='activated_later') THEN
        ALTER TABLE public.records ADD COLUMN activated_later BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Adicionar coluna amount_used_in_cents se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='amount_used_in_cents') THEN
        ALTER TABLE public.records ADD COLUMN amount_used_in_cents BIGINT;
    END IF;
END $$;

-- Obs: Rode este script no Editor SQL do Supabase.
