-- Solução 1: Função trigger para atualizar commissions_summary automaticamente
CREATE OR REPLACE FUNCTION update_commissions_summary_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_pending NUMERIC;
BEGIN
  -- Se status mudou para 'paid' ou inserido como 'paid'
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Calcular totais atuais do funcionário
    SELECT 
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'paid'), 0),
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'pending'), 0)
    INTO v_total_paid, v_total_pending
    FROM commissions_transactions
    WHERE employee_id = NEW.employee_id
      AND barbershop_id = NEW.barbershop_id;
    
    -- Atualizar ou criar registro em commissions_summary
    INSERT INTO commissions_summary (
      barbershop_id,
      employee_id,
      total_commission_paid,
      total_commission_due,
      last_updated
    ) VALUES (
      NEW.barbershop_id,
      NEW.employee_id,
      v_total_paid,
      v_total_pending,
      NOW()
    )
    ON CONFLICT (barbershop_id, employee_id)
    DO UPDATE SET
      total_commission_paid = v_total_paid,
      total_commission_due = v_total_pending,
      last_updated = NOW();
      
  -- Se status mudou de 'paid' para outro (ex: cancelamento/estorno)
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status != 'paid' THEN
    
    -- Recalcular totais
    SELECT 
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'paid'), 0),
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'pending'), 0)
    INTO v_total_paid, v_total_pending
    FROM commissions_transactions
    WHERE employee_id = NEW.employee_id
      AND barbershop_id = NEW.barbershop_id;
    
    UPDATE commissions_summary
    SET 
      total_commission_paid = v_total_paid,
      total_commission_due = v_total_pending,
      last_updated = NOW()
    WHERE employee_id = NEW.employee_id
      AND barbershop_id = NEW.barbershop_id;
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_update_summary_on_payment ON commissions_transactions;
CREATE TRIGGER trigger_update_summary_on_payment
  AFTER UPDATE OF status ON commissions_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_commissions_summary_on_payment();

DROP TRIGGER IF EXISTS trigger_update_summary_on_insert ON commissions_transactions;
CREATE TRIGGER trigger_update_summary_on_insert
  AFTER INSERT ON commissions_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION update_commissions_summary_on_payment();

-- Solução 2: Função RPC para recalcular summary manualmente
CREATE OR REPLACE FUNCTION recalculate_commissions_summary(
  p_barbershop_id UUID,
  p_employee_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_employee_id IS NOT NULL THEN
    -- Recalcular para um funcionário específico
    INSERT INTO commissions_summary (
      barbershop_id,
      employee_id,
      total_commission_paid,
      total_commission_due,
      last_updated
    )
    SELECT 
      p_barbershop_id,
      p_employee_id,
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'paid'), 0),
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'pending'), 0),
      NOW()
    FROM commissions_transactions
    WHERE employee_id = p_employee_id
      AND barbershop_id = p_barbershop_id
    ON CONFLICT (barbershop_id, employee_id)
    DO UPDATE SET
      total_commission_paid = EXCLUDED.total_commission_paid,
      total_commission_due = EXCLUDED.total_commission_due,
      last_updated = NOW();
  ELSE
    -- Recalcular para todos os funcionários da barbearia
    INSERT INTO commissions_summary (
      barbershop_id,
      employee_id,
      total_commission_paid,
      total_commission_due,
      last_updated
    )
    SELECT 
      p_barbershop_id,
      employee_id,
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'paid'), 0),
      COALESCE(SUM(commission_value) FILTER (WHERE status = 'pending'), 0),
      NOW()
    FROM commissions_transactions
    WHERE barbershop_id = p_barbershop_id
    GROUP BY employee_id
    ON CONFLICT (barbershop_id, employee_id)
    DO UPDATE SET
      total_commission_paid = EXCLUDED.total_commission_paid,
      total_commission_due = EXCLUDED.total_commission_due,
      last_updated = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Correção imediata: Recalcular summary do Matheus e de todos os funcionários
SELECT recalculate_commissions_summary('7ce557e7-2850-475d-aa71-77be87c9ec90', NULL);