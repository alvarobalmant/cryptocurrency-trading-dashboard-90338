-- Fase 1: Limpar duplicatas de employee_schedules e adicionar constraint

-- Deletar duplicatas mantendo apenas a entrada mais recente por (employee_id, day_of_week)
DELETE FROM employee_schedules
WHERE id NOT IN (
  SELECT DISTINCT ON (employee_id, day_of_week) id
  FROM employee_schedules
  ORDER BY employee_id, day_of_week, created_at DESC
);

-- Adicionar constraint para prevenir duplicatas futuras
ALTER TABLE employee_schedules
ADD CONSTRAINT unique_employee_day_schedule 
UNIQUE (employee_id, day_of_week);