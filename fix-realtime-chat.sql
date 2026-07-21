-- ============================================================
-- SCRIPT DEFINITIVO: Habilita Realtime 100% no Chat de Suporte
-- Execute este script no Editor SQL do seu Supabase
-- ============================================================

-- 1. Garante que a tabela está na publicação (sem erro se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
  END IF;
END $$;

-- 2. CRÍTICO: Habilita REPLICA IDENTITY FULL para que os filtros
--    por coluna (filter: ticket_id=eq.xxx) funcionem corretamente
ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;

-- 3. Drop e recria a policy de leitura (obrigatória para o Realtime enviar eventos ao client)
DROP POLICY IF EXISTS "Enable read for realtime chat" ON public.ticket_messages;
CREATE POLICY "Enable read for realtime chat"
    ON public.ticket_messages
    FOR SELECT
    USING (true);

-- 4. Garante que RLS está habilitado na tabela
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Verificação: deve retornar true se tudo estiver certo
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'ticket_messages';
