-- Primeiro, atualizar qualquer status inválido para 'pending'
UPDATE appointments 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'cancelled');

-- Agora adicionar o novo status 'queue_reserved'
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'queue_reserved'));