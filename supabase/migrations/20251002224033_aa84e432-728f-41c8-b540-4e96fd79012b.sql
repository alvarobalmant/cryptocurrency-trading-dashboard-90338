-- Migration: Adicionar campo current_appointment_date em chat_sessions
-- Mantém contexto de data entre mensagens do chatbot

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS current_appointment_date DATE;

COMMENT ON COLUMN chat_sessions.current_appointment_date IS 
'Data do agendamento em andamento. Mantém contexto entre mensagens.';

-- Índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_chat_sessions_appointment_date 
ON chat_sessions(current_appointment_date) 
WHERE current_appointment_date IS NOT NULL;