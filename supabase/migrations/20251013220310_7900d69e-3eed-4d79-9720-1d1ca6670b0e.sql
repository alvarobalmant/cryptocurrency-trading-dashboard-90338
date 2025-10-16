-- ==========================================
-- SISTEMA DE COMISSÕES AUTOMÁTICAS
-- ==========================================

-- 1. Criar função para gerar comissão automaticamente
CREATE OR REPLACE FUNCTION auto_generate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_commission_pct NUMERIC;
  v_service_price NUMERIC;
  v_commission_value NUMERIC;
  v_existing_transaction_id UUID;
BEGIN
  -- Só processa se o agendamento foi confirmado E pago
  IF NEW.status = 'confirmed' AND NEW.payment_status = 'paid' THEN
    
    -- Verifica se já existe comissão para este agendamento
    SELECT id INTO v_existing_transaction_id
    FROM commissions_transactions
    WHERE appointment_id = NEW.id
    LIMIT 1;
    
    -- Se já existe, não cria duplicada
    IF v_existing_transaction_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Busca a porcentagem de comissão do funcionário
    SELECT COALESCE(commission_percentage, 0) INTO v_employee_commission_pct
    FROM employees
    WHERE id = NEW.employee_id;
    
    -- Busca o preço do serviço
    SELECT price INTO v_service_price
    FROM services
    WHERE id = NEW.service_id;
    
    -- Se tiver comissão configurada e preço do serviço, calcula
    IF v_employee_commission_pct > 0 AND v_service_price > 0 THEN
      v_commission_value := (v_service_price * v_employee_commission_pct) / 100;
      
      -- Insere na tabela de transações de comissão
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
      );
      
      -- Atualiza o resumo de comissões
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
$$;

-- 2. Criar o trigger para gerar comissões automaticamente
DROP TRIGGER IF EXISTS trigger_auto_commission ON appointments;
CREATE TRIGGER trigger_auto_commission
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_commission();

-- 3. Gerar comissões retroativas para agendamentos já pagos
DO $$
DECLARE
  v_appointment RECORD;
  v_employee_commission_pct NUMERIC;
  v_service_price NUMERIC;
  v_commission_value NUMERIC;
  v_existing_transaction_id UUID;
BEGIN
  -- Loop em todos os agendamentos confirmados e pagos sem comissão
  FOR v_appointment IN 
    SELECT a.* 
    FROM appointments a
    LEFT JOIN commissions_transactions ct ON ct.appointment_id = a.id
    WHERE a.status = 'confirmed' 
      AND a.payment_status = 'paid'
      AND ct.id IS NULL
  LOOP
    -- Busca a porcentagem de comissão do funcionário
    SELECT COALESCE(commission_percentage, 0) INTO v_employee_commission_pct
    FROM employees
    WHERE id = v_appointment.employee_id;
    
    -- Busca o preço do serviço
    SELECT price INTO v_service_price
    FROM services
    WHERE id = v_appointment.service_id;
    
    -- Se tiver comissão configurada e preço do serviço, calcula
    IF v_employee_commission_pct > 0 AND v_service_price > 0 THEN
      v_commission_value := (v_service_price * v_employee_commission_pct) / 100;
      
      -- Insere na tabela de transações de comissão
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
        v_appointment.barbershop_id,
        v_appointment.employee_id,
        v_appointment.id,
        v_appointment.service_id,
        v_service_price,
        v_employee_commission_pct,
        v_commission_value,
        'pending'
      );
      
      -- Atualiza o resumo de comissões
      INSERT INTO commissions_summary (
        barbershop_id,
        employee_id,
        total_commission_due,
        total_commission_paid
      ) VALUES (
        v_appointment.barbershop_id,
        v_appointment.employee_id,
        v_commission_value,
        0
      )
      ON CONFLICT (barbershop_id, employee_id)
      DO UPDATE SET
        total_commission_due = commissions_summary.total_commission_due + v_commission_value,
        last_updated = NOW();
      
      RAISE NOTICE 'Comissão gerada para agendamento %: R$ %', v_appointment.id, v_commission_value;
    END IF;
  END LOOP;
END $$;