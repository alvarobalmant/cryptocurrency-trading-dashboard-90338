-- Adicionar o status 'no_show' à constraint de appointments
-- Isso corrige o erro quando tenta marcar "Cliente não apareceu"

ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'queue_reserved', 'no_show'));

COMMENT ON CONSTRAINT appointments_status_check ON appointments IS 
'Valid statuses: pending, confirmed, cancelled, queue_reserved (virtual queue provisional), no_show (client did not show up)';