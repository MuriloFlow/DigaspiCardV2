-- Habilita o Realtime para a tabela de mensagens do chat
begin;
  -- Garante que a tabela está na publicação supabase_realtime
  alter publication supabase_realtime add table ticket_messages;
commit;

-- Cria uma política para permitir leitura para que o Realtime possa enviar os eventos para o Client SDK
-- Sem essa política, o Supabase bloqueia o websocket no frontend.
CREATE POLICY "Enable read for realtime chat"
    ON public.ticket_messages
    FOR SELECT
    USING (true);
