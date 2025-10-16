-- FASE 1: Limpar períodos duplicados
-- Como não temos coluna de valores, deletar períodos duplicados sem verificar valor
DELETE FROM commission_periods
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY employee_id, period_start, period_end 
        ORDER BY created_at DESC
      ) as rn
    FROM commission_periods
  ) t
  WHERE rn > 1
);

-- FASE 6: Adicionar constraint para evitar duplicação
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_employee_period'
  ) THEN
    ALTER TABLE commission_periods
    ADD CONSTRAINT unique_employee_period 
    UNIQUE (employee_id, period_start, period_end);
  END IF;
END $$;

-- FASE 6: Criar função para prevenir períodos sem comissões vinculadas
-- Esta função será chamada após tentar vincular as comissões
CREATE OR REPLACE FUNCTION check_period_has_commissions()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verificar se há itens vinculados a este período
  SELECT COUNT(*) INTO v_count
  FROM commission_period_items
  WHERE period_id = NEW.id;
  
  IF v_count = 0 AND TG_OP = 'INSERT' THEN
    RAISE WARNING 'Tentando criar período sem comissões para employee_id %. Período não será criado.', NEW.employee_id;
    RETURN NULL; -- Não inserir
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nota: O trigger será aplicado DEPOIS da inserção de itens, então não usaremos aqui
-- A validação será feita no código da aplicação