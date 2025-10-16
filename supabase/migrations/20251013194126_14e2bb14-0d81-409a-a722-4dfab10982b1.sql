-- Limpeza de dados de comissões vinculados a PERÍODOS PAGOS para a barbearia específica
-- Mantemos pagamentos diretos (sem período) e demais dados intocados

DO $$
DECLARE
  v_barbershop_id uuid := '7ce557e7-2850-475d-aa71-77be87c9ec90'::uuid;
BEGIN
  -- 1) Remover ajustes ligados a payments de períodos pagos
  DELETE FROM commission_adjustments ca
  USING commission_payments cp
  JOIN commission_periods p ON p.id = cp.commission_period_id
  WHERE cp.barbershop_id = v_barbershop_id
    AND p.barbershop_id = v_barbershop_id
    AND p.status = 'paid';

  -- 2) Remover deduções aplicadas a períodos pagos
  DELETE FROM commission_deductions cd
  WHERE cd.barbershop_id = v_barbershop_id
    AND (
      cd.applied_to_period_id IN (
        SELECT id FROM commission_periods WHERE barbershop_id = v_barbershop_id AND status = 'paid'
      )
      OR cd.commission_period_id IN (
        SELECT id FROM commission_periods WHERE barbershop_id = v_barbershop_id AND status = 'paid'
      )
    );

  -- 3) Remover services dos períodos pagos
  DELETE FROM commission_period_services cps
  USING commission_periods p
  WHERE cps.commission_period_id = p.id
    AND p.barbershop_id = v_barbershop_id
    AND p.status = 'paid';

  -- 4) Remover commission_payments associados a períodos pagos
  DELETE FROM commission_payments cp
  WHERE cp.barbershop_id = v_barbershop_id
    AND cp.commission_period_id IN (
      SELECT id FROM commission_periods WHERE barbershop_id = v_barbershop_id AND status = 'paid'
    );

  -- 5) (Opcional) Remover logs de auditoria relacionados
  DELETE FROM commission_audit_log cal
  WHERE cal.barbershop_id = v_barbershop_id
    AND cal.entity_type IN ('commission_period','commission_payment','commission_deduction','commission_adjustment');

  -- 6) Remover os próprios períodos pagos
  DELETE FROM commission_periods p
  WHERE p.barbershop_id = v_barbershop_id
    AND p.status = 'paid';
END $$;