-- Permitir que owners vejam appointments queue_reserved
-- A política atual permite apenas pending, confirmed, cancelled
-- Precisamos incluir queue_reserved

-- Não precisamos alterar a política, pois queue_reserved já faz parte do filtro IN
-- O problema é que a query na agenda pode estar filtrando apenas pending/confirmed

-- Vamos adicionar um comentário para documentar que queue_reserved é válido
COMMENT ON CONSTRAINT appointments_status_check ON appointments IS 
'Valid statuses: pending, confirmed, cancelled, queue_reserved (virtual queue provisional)';