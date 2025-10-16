-- Refatorar tabela schedule_exceptions para o novo modelo
-- Onde salvamos apenas os horários DISPONÍVEIS para cada funcionário/dia

-- Adicionar coluna para armazenar slots disponíveis em formato JSON
ALTER TABLE schedule_exceptions 
ADD COLUMN IF NOT EXISTS available_slots JSONB DEFAULT '[]'::jsonb;

-- Remover a coluna exception_type pois não é mais necessária
ALTER TABLE schedule_exceptions 
DROP COLUMN IF EXISTS exception_type;

-- Adicionar índice composto para consulta rápida por funcionário e data
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_employee_date 
ON schedule_exceptions(employee_id, exception_date);

-- Comentário explicativo
COMMENT ON COLUMN schedule_exceptions.available_slots IS 
'Array de objetos { start: "HH:mm", end: "HH:mm" } representando os períodos DISPONÍVEIS do funcionário neste dia. Tudo que não está listado é considerado bloqueado/indisponível.';