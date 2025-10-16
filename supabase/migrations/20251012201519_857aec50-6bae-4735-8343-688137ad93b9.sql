-- FASE 2: Adicionar campos críticos para analytics

-- 1. Appointments: rastrear cancelamentos e reagendamentos
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES appointments(id),
ADD COLUMN IF NOT EXISTS rescheduled_to UUID REFERENCES appointments(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_cancellation ON appointments(status, cancellation_reason) 
WHERE status IN ('cancelled', 'no_show');

CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled ON appointments(rescheduled_from) 
WHERE rescheduled_from IS NOT NULL;

-- 2. Client Subscriptions: rastrear churn
ALTER TABLE client_subscriptions 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_cancelled ON client_subscriptions(status, cancelled_at) 
WHERE status = 'cancelled';

-- FASE 3: Criar novas tabelas

-- 3. Client Feedback (NPS, satisfação, ratings)
CREATE TABLE IF NOT EXISTS client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  comments TEXT,
  feedback_type TEXT CHECK (feedback_type IN ('service', 'employee', 'overall', 'facility')) DEFAULT 'overall',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para client_feedback
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view barbershop feedback"
ON client_feedback FOR SELECT
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can manage barbershop feedback"
ON client_feedback FOR ALL
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Clients can insert their own feedback"
ON client_feedback FOR INSERT
WITH CHECK (
  client_profile_id IN (
    SELECT id FROM client_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Índices
CREATE INDEX idx_feedback_barbershop ON client_feedback(barbershop_id, created_at DESC);
CREATE INDEX idx_feedback_client ON client_feedback(client_profile_id);
CREATE INDEX idx_feedback_nps ON client_feedback(barbershop_id, nps_score) WHERE nps_score IS NOT NULL;

-- 4. Fixed Costs (custos fixos detalhados)
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  cost_type TEXT NOT NULL, -- ex: 'rent', 'electricity', 'water', 'internet', 'salary', 'insurance', 'taxes', 'other'
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'yearly', 'one_time')) DEFAULT 'monthly',
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID
);

-- RLS para fixed_costs
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage fixed costs"
ON fixed_costs FOR ALL
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

-- Índices
CREATE INDEX idx_fixed_costs_barbershop ON fixed_costs(barbershop_id, is_active);
CREATE INDEX idx_fixed_costs_dates ON fixed_costs(start_date, end_date) WHERE is_active = true;

-- Função para calcular custos fixos em um período
CREATE OR REPLACE FUNCTION calculate_fixed_costs_for_period(
  p_barbershop_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_cost NUMERIC := 0;
  cost_record RECORD;
  days_in_period INTEGER;
  cost_per_day NUMERIC;
BEGIN
  days_in_period := p_end_date - p_start_date + 1;
  
  FOR cost_record IN
    SELECT amount, recurrence, start_date, end_date
    FROM fixed_costs
    WHERE barbershop_id = p_barbershop_id
      AND is_active = true
      AND start_date <= p_end_date
      AND (end_date IS NULL OR end_date >= p_start_date)
  LOOP
    -- Calcular custo diário baseado na recorrência
    CASE cost_record.recurrence
      WHEN 'daily' THEN
        cost_per_day := cost_record.amount;
      WHEN 'weekly' THEN
        cost_per_day := cost_record.amount / 7.0;
      WHEN 'monthly' THEN
        cost_per_day := cost_record.amount / 30.0;
      WHEN 'yearly' THEN
        cost_per_day := cost_record.amount / 365.0;
      WHEN 'one_time' THEN
        -- Custo único aplica-se apenas se a data estiver no período
        IF cost_record.start_date >= p_start_date AND cost_record.start_date <= p_end_date THEN
          cost_per_day := cost_record.amount / days_in_period;
        ELSE
          cost_per_day := 0;
        END IF;
      ELSE
        cost_per_day := 0;
    END CASE;
    
    total_cost := total_cost + (cost_per_day * days_in_period);
  END LOOP;
  
  RETURN COALESCE(total_cost, 0);
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_fixed_costs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_fixed_costs_updated_at
BEFORE UPDATE ON fixed_costs
FOR EACH ROW
EXECUTE FUNCTION update_fixed_costs_updated_at();

-- Trigger para atualizar updated_at em client_feedback
CREATE TRIGGER trigger_update_client_feedback_updated_at
BEFORE UPDATE ON client_feedback
FOR EACH ROW
EXECUTE FUNCTION update_fixed_costs_updated_at();