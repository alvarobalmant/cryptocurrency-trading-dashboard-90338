-- Primeiro, remover o check constraint antigo e criar um novo que aceite 'period'
ALTER TABLE commission_payments DROP CONSTRAINT IF EXISTS commission_payments_commission_type_check;

ALTER TABLE commission_payments ADD CONSTRAINT commission_payments_commission_type_check 
  CHECK (commission_type IN ('confirmed', 'adjustment', 'period'));

-- Função para criar/atualizar commission_payment quando período é marcado como pago
CREATE OR REPLACE FUNCTION public.sync_commission_payment_on_period_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- Só atua quando status muda para 'paid' e paid_at é preenchido
  IF NEW.status = 'paid' AND NEW.paid_at IS NOT NULL AND 
     (OLD.status IS NULL OR OLD.status != 'paid' OR OLD.paid_at IS NULL) THEN
    
    -- Verificar se já existe um payment para este período
    SELECT id INTO v_payment_id
    FROM commission_payments
    WHERE commission_period_id = NEW.id;
    
    IF v_payment_id IS NULL THEN
      -- Criar novo commission_payment
      INSERT INTO commission_payments (
        employee_id,
        barbershop_id,
        amount,
        period_start,
        period_end,
        payment_date,
        status,
        commission_type,
        commission_period_id,
        notes,
        payment_receipt_urls,
        created_by_user_id
      ) VALUES (
        NEW.employee_id,
        NEW.barbershop_id,
        NEW.net_amount,
        NEW.period_start,
        NEW.period_end,
        NEW.paid_at::date,
        'paid',
        'period',
        NEW.id,
        'Pagamento automático vinculado ao período ' || NEW.period_type,
        NEW.payment_receipt_urls,
        auth.uid()
      );
    ELSE
      -- Atualizar payment existente
      UPDATE commission_payments
      SET 
        amount = NEW.net_amount,
        payment_date = NEW.paid_at::date,
        status = 'paid',
        payment_receipt_urls = NEW.payment_receipt_urls,
        updated_at = now()
      WHERE id = v_payment_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_commission_payment ON commission_periods;
CREATE TRIGGER trigger_sync_commission_payment
  AFTER INSERT OR UPDATE ON commission_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_commission_payment_on_period_paid();

COMMENT ON FUNCTION public.sync_commission_payment_on_period_paid() IS 
  'Sincroniza automaticamente commission_payments quando um commission_period é marcado como pago';

-- Migrar períodos já pagos que não têm payment correspondente
INSERT INTO commission_payments (
  employee_id,
  barbershop_id,
  amount,
  period_start,
  period_end,
  payment_date,
  status,
  commission_type,
  commission_period_id,
  notes,
  payment_receipt_urls,
  created_at,
  updated_at
)
SELECT 
  cp.employee_id,
  cp.barbershop_id,
  cp.net_amount,
  cp.period_start,
  cp.period_end,
  cp.paid_at::date,
  'paid',
  'period',
  cp.id,
  'Migração automática de período pago - ' || cp.period_type,
  cp.payment_receipt_urls,
  cp.paid_at,
  now()
FROM commission_periods cp
LEFT JOIN commission_payments cpm ON cpm.commission_period_id = cp.id
WHERE cp.status = 'paid' 
  AND cp.paid_at IS NOT NULL
  AND cpm.id IS NULL;