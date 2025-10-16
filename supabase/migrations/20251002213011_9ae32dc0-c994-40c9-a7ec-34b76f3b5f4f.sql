-- Limpar histórico de chat (89 mensagens e 7 sessões)
-- ATENÇÃO: Isso vai deletar TODOS os históricos de chat

-- Deletar todas as mensagens
DELETE FROM public.chat_messages;

-- Deletar todas as sessões
DELETE FROM public.chat_sessions;

-- Confirmar limpeza
SELECT 
  (SELECT COUNT(*) FROM public.chat_messages) as mensagens_restantes,
  (SELECT COUNT(*) FROM public.chat_sessions) as sessoes_restantes;