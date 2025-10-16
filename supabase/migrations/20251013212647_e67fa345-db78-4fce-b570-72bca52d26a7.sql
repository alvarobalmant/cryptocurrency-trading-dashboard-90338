-- =====================================================
-- SISTEMA DE COMISSÕES SIMPLIFICADO
-- =====================================================

-- 1. Tabela de Transações de Comissões
CREATE TABLE IF NOT EXISTS commissions_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  service_value DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_value DECIMAL(10,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_notes TEXT,
  
  CONSTRAINT unique_commission_per_appointment UNIQUE(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_commissions_barbershop ON commissions_transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commissions_employee ON commissions_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions_transactions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions_transactions(created_at);

-- 2. Tabela de Resumo de Comissões
CREATE TABLE IF NOT EXISTS commissions_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  total_commission_due DECIMAL(10,2) DEFAULT 0 NOT NULL,
  total_commission_paid DECIMAL(10,2) DEFAULT 0 NOT NULL,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_summary_per_employee UNIQUE(barbershop_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_summary_barbershop ON commissions_summary(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_summary_employee ON commissions_summary(employee_id);

-- 3. Trigger: Auto-gerar comissão quando appointment é pago
CREATE OR REPLACE FUNCTION auto_generate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_service_price DECIMAL(10,2);
  v_employee_commission_pct DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
BEGIN
  -- Só gera comissão se mudou para 'paid' e está confirmado
  IF NEW.payment_status = 'paid' AND NEW.status = 'confirmed' 
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Buscar preço do serviço
    SELECT price INTO v_service_price
    FROM services
    WHERE id = NEW.service_id;
    
    -- Buscar % de comissão do funcionário
    SELECT COALESCE(commission_percentage, 0) INTO v_employee_commission_pct
    FROM employees
    WHERE id = NEW.employee_id;
    
    -- Calcular valor da comissão
    v_commission_value := (v_service_price * v_employee_commission_pct / 100);
    
    -- Só inserir se houver comissão a gerar
    IF v_commission_value > 0 THEN
      -- Inserir registro de comissão
      INSERT INTO commissions_transactions (
        barbershop_id,
        employee_id,
        appointment_id,
        service_id,
        service_value,
        commission_percentage,
        commission_value,
        status
      ) VALUES (
        NEW.barbershop_id,
        NEW.employee_id,
        NEW.id,
        NEW.service_id,
        v_service_price,
        v_employee_commission_pct,
        v_commission_value,
        'pending'
      )
      ON CONFLICT (appointment_id) DO NOTHING;
      
      -- Atualizar resumo (ou criar se não existir)
      INSERT INTO commissions_summary (
        barbershop_id,
        employee_id,
        total_commission_due,
        total_commission_paid
      ) VALUES (
        NEW.barbershop_id,
        NEW.employee_id,
        v_commission_value,
        0
      )
      ON CONFLICT (barbershop_id, employee_id) 
      DO UPDATE SET
        total_commission_due = commissions_summary.total_commission_due + v_commission_value,
        last_updated = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_commission ON appointments;
CREATE TRIGGER trigger_auto_commission
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION auto_generate_commission();

-- 4. Função: Marcar comissão como paga
CREATE OR REPLACE FUNCTION mark_commission_as_paid(
  p_transaction_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_payment_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_commission_value DECIMAL(10,2);
  v_barbershop_id UUID;
  v_employee_id UUID;
BEGIN
  -- Buscar dados da transação
  SELECT commission_value, barbershop_id, employee_id
  INTO v_commission_value, v_barbershop_id, v_employee_id
  FROM commissions_transactions
  WHERE id = p_transaction_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already paid';
  END IF;
  
  -- Atualizar transação para 'paid'
  UPDATE commissions_transactions
  SET 
    status = 'paid',
    paid_at = NOW(),
    payment_method = p_payment_method,
    payment_notes = p_payment_notes
  WHERE id = p_transaction_id;
  
  -- Atualizar resumo
  UPDATE commissions_summary
  SET
    total_commission_due = total_commission_due - v_commission_value,
    total_commission_paid = total_commission_paid + v_commission_value,
    last_updated = NOW()
  WHERE barbershop_id = v_barbershop_id 
    AND employee_id = v_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Função: Obter resumo de comissão de um funcionário
CREATE OR REPLACE FUNCTION get_employee_commission_summary(
  p_employee_id UUID,
  p_barbershop_id UUID
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  total_due DECIMAL(10,2),
  total_paid DECIMAL(10,2),
  total_all_time DECIMAL(10,2),
  pending_transactions_count BIGINT,
  last_payment_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.employee_id,
    e.name AS employee_name,
    cs.total_commission_due AS total_due,
    cs.total_commission_paid AS total_paid,
    (cs.total_commission_due + cs.total_commission_paid) AS total_all_time,
    COUNT(ct.id) FILTER (WHERE ct.status = 'pending') AS pending_transactions_count,
    MAX(ct.paid_at) AS last_payment_date
  FROM commissions_summary cs
  JOIN employees e ON e.id = cs.employee_id
  LEFT JOIN commissions_transactions ct ON ct.employee_id = cs.employee_id AND ct.barbershop_id = cs.barbershop_id
  WHERE cs.employee_id = p_employee_id
    AND cs.barbershop_id = p_barbershop_id
  GROUP BY cs.employee_id, e.name, cs.total_commission_due, cs.total_commission_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RLS Policies para commissions_transactions
ALTER TABLE commissions_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view transactions" ON commissions_transactions;
CREATE POLICY "Owners can view transactions"
ON commissions_transactions FOR SELECT
USING (is_barbershop_owner(barbershop_id));

DROP POLICY IF EXISTS "Employees can view their own transactions" ON commissions_transactions;
CREATE POLICY "Employees can view their own transactions"
ON commissions_transactions FOR SELECT
USING (employee_id IN (
  SELECT id FROM employees 
  WHERE email = COALESCE((auth.jwt() ->> 'email'), '') AND status = 'active'
));

DROP POLICY IF EXISTS "Owners can update transactions" ON commissions_transactions;
CREATE POLICY "Owners can update transactions"
ON commissions_transactions FOR UPDATE
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

-- 7. RLS Policies para commissions_summary
ALTER TABLE commissions_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view summary" ON commissions_summary;
CREATE POLICY "Owners can view summary"
ON commissions_summary FOR SELECT
USING (is_barbershop_owner(barbershop_id));

DROP POLICY IF EXISTS "Employees can view their own summary" ON commissions_summary;
CREATE POLICY "Employees can view their own summary"
ON commissions_summary FOR SELECT
USING (employee_id IN (
  SELECT id FROM employees 
  WHERE email = COALESCE((auth.jwt() ->> 'email'), '') AND status = 'active'
));