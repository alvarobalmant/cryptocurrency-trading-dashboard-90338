-- Permitir que clientes (público) atualizem appointments queue_reserved para pending
-- quando é a confirmação da fila virtual

DROP POLICY IF EXISTS "Public can confirm queue reserved appointments" ON appointments;

CREATE POLICY "Public can confirm queue reserved appointments"
ON appointments
FOR UPDATE
TO public
USING (
  status = 'queue_reserved' 
  AND virtual_queue_entry_id IS NOT NULL
)
WITH CHECK (
  status IN ('pending', 'cancelled')
  AND virtual_queue_entry_id IS NOT NULL
);