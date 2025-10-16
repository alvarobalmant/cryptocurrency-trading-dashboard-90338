-- ==========================================
-- LIMPEZA: Remover triggers obsoletas que causam erro
-- ==========================================

-- Remover trigger e função obsoletas que referenciam tabela inexistente
DROP TRIGGER IF EXISTS trigger_auto_register_commission ON appointments;
DROP FUNCTION IF EXISTS auto_register_commission() CASCADE;

-- ==========================================
-- FASE 1: Criar Trigger de Sincronização Automática
-- ==========================================

-- Função que sincroniza appointments.payment_status quando payments.status muda para 'paid'
CREATE OR REPLACE FUNCTION sync_appointment_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Só processar se status mudou para 'paid' e tem appointment_id
  IF NEW.status = 'paid' AND 
     (OLD.status IS NULL OR OLD.status != 'paid') AND 
     NEW.appointment_id IS NOT NULL THEN
    
    -- Verificar se appointment existe
    IF EXISTS (SELECT 1 FROM appointments WHERE id = NEW.appointment_id) THEN
      
      -- Atualizar appointment
      UPDATE appointments
      SET 
        payment_status = 'paid',
        payment_method = NEW.payment_method,
        status = CASE 
          WHEN status = 'pending' THEN 'confirmed'
          WHEN status = 'queue_reserved' THEN 'confirmed'
          ELSE status 
        END,
        mercadopago_payment_id = COALESCE(mercadopago_payment_id, NEW.mercadopago_payment_id),
        updated_at = NOW()
      WHERE id = NEW.appointment_id
        AND payment_status != 'paid';
      
      RAISE LOG '[TRIGGER] Appointment % synced with payment %: status=paid', 
        NEW.appointment_id, NEW.id;
    ELSE
      RAISE WARNING '[TRIGGER] Payment % references non-existent appointment %', 
        NEW.id, NEW.appointment_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_appointment_on_payment ON payments;

CREATE TRIGGER trigger_sync_appointment_on_payment
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointment_payment_status();

-- ==========================================
-- FASE 2: Correção Retroativa de Appointments Inconsistentes
-- ==========================================

WITH paid_payments AS (
  SELECT DISTINCT
    p.appointment_id,
    p.payment_method,
    p.paid_at,
    p.mercadopago_payment_id
  FROM payments p
  WHERE p.status = 'paid'
    AND p.appointment_id IS NOT NULL
)
UPDATE appointments a
SET 
  payment_status = 'paid',
  payment_method = COALESCE(a.payment_method, pp.payment_method),
  status = CASE 
    WHEN a.status = 'pending' THEN 'confirmed'
    WHEN a.status = 'queue_reserved' THEN 'confirmed'
    ELSE a.status 
  END,
  mercadopago_payment_id = COALESCE(a.mercadopago_payment_id, pp.mercadopago_payment_id),
  updated_at = NOW()
FROM paid_payments pp
WHERE a.id = pp.appointment_id
  AND a.payment_status != 'paid';