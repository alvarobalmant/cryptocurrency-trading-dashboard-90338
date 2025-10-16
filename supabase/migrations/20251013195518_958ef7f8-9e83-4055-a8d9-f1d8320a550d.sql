-- Criar dados de teste de comissões para a barbearia do Álvaro
DO $$
DECLARE
  v_barbershop_id uuid := '7ce557e7-2850-475d-aa71-77be87c9ec90'::uuid;
  v_matheus_id uuid := 'f8b68172-235d-4fc7-81fe-9b8b975b53eb'::uuid;
  v_period_id_1 uuid;
  v_period_id_2 uuid;
BEGIN
  -- Período 1: 01/10 a 07/10 (PAGO)
  INSERT INTO commission_periods (
    barbershop_id,
    employee_id,
    period_type,
    period_start,
    period_end,
    status,
    total_services_value,
    total_commission_value,
    total_deductions,
    net_amount,
    generated_at,
    signed_at,
    paid_at,
    notes
  ) VALUES (
    v_barbershop_id,
    v_matheus_id,
    'weekly',
    '2025-10-01',
    '2025-10-07',
    'paid',
    33.00,  -- R$ 33 em serviços (3 cortes de R$ 1 + 30 de outros)
    16.50,  -- 50% de comissão
    0,
    16.50,
    '2025-10-08 10:00:00',
    '2025-10-08 14:00:00',
    '2025-10-09 09:00:00',
    'Período semanal - pago via PIX'
  ) RETURNING id INTO v_period_id_1;

  -- Popular serviços do período 1 (os 3 agendamentos confirmados e pagos de Clara)
  INSERT INTO commission_period_services (
    commission_period_id,
    appointment_id,
    service_id,
    service_name,
    service_price,
    commission_percentage,
    commission_amount,
    performed_at
  )
  SELECT 
    v_period_id_1,
    a.id,
    s.id,
    s.name,
    s.price,
    50.0,
    s.price * 0.5,
    a.appointment_date::timestamp
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  WHERE a.employee_id = v_matheus_id
    AND a.barbershop_id = v_barbershop_id
    AND a.status = 'confirmed'
    AND a.payment_status = 'paid'
    AND a.appointment_date BETWEEN '2025-10-01' AND '2025-10-07'
  LIMIT 3;

  -- Período 2: 08/10 a 12/10 (PENDENTE - aguardando assinatura)
  INSERT INTO commission_periods (
    barbershop_id,
    employee_id,
    period_type,
    period_start,
    period_end,
    status,
    total_services_value,
    total_commission_value,
    total_deductions,
    net_amount,
    generated_at,
    notes
  ) VALUES (
    v_barbershop_id,
    v_matheus_id,
    'weekly',
    '2025-10-08',
    '2025-10-12',
    'pending_signature',
    2.00,  -- R$ 2 em serviços (2 cortes de R$ 1)
    1.00,  -- 50% de comissão
    0,
    1.00,
    NOW(),
    'Período semanal - aguardando assinatura do colaborador'
  ) RETURNING id INTO v_period_id_2;

  -- Simular alguns serviços no período 2 (inventados para exemplo)
  -- Como não temos agendamentos reais nesse período, vamos criar entradas fictícias
  INSERT INTO commission_period_services (
    commission_period_id,
    appointment_id,
    service_id,
    service_name,
    service_price,
    commission_percentage,
    commission_amount,
    performed_at
  ) VALUES 
  (
    v_period_id_2,
    '1308e8ba-6798-4d39-a3bd-fbe13e3afade'::uuid, -- appointment da Clara
    'f3be84b2-059f-4404-b323-f3a7048a228c'::uuid,
    'The Sims 3',
    1.00,
    50.0,
    0.50,
    '2025-10-13 16:30:00'
  );

END $$;