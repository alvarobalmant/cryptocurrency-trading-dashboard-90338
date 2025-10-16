-- =====================================================
-- SISTEMA DE PERÍODOS DE COMISSÃO SIMPLIFICADO
-- Períodos apenas AGRUPAM comissões existentes
-- =====================================================

-- 1. TABELA DE CONFIGURAÇÕES DE PERÍODO
CREATE TABLE IF NOT EXISTS barbershop_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL UNIQUE REFERENCES barbershops(id) ON DELETE CASCADE,
  default_period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (default_period_type IN ('individual', 'weekly', 'monthly')),
  auto_generate_periods BOOLEAN NOT NULL DEFAULT false,
  weekly_close_day INTEGER CHECK (weekly_close_day >= 0 AND weekly_close_day <= 6),
  monthly_close_day INTEGER CHECK (monthly_close_day >= 1 AND monthly_close_day <= 28),
  require_signature BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE PERÍODOS (SEM VALORES - calculados dinamicamente)
CREATE TABLE IF NOT EXISTS commission_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL DEFAULT 'individual' CHECK (period_type IN ('individual', 'weekly', 'monthly', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_signature' CHECK (status IN ('draft', 'pending_signature', 'signed', 'paid', 'cancelled')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_notes TEXT,
  payment_receipt_urls TEXT[],
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_period_dates CHECK (period_end >= period_start)
);

-- 3. TABELA DE VÍNCULOS (associa comissões existentes aos períodos)
CREATE TABLE IF NOT EXISTS commission_period_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES commission_periods(id) ON DELETE CASCADE,
  commission_transaction_id UUID NOT NULL REFERENCES commissions_transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_id, commission_transaction_id)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- CONFIGURAÇÕES
ALTER TABLE barbershop_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage settings"
ON barbershop_commission_settings FOR ALL
USING (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
))
WITH CHECK (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
));

-- PERÍODOS
ALTER TABLE commission_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage periods"
ON commission_periods FOR ALL
USING (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
))
WITH CHECK (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
));

CREATE POLICY "Employees can view own periods"
ON commission_periods FOR SELECT
USING (employee_id IN (
  SELECT id FROM employees 
  WHERE email = COALESCE((auth.jwt() ->> 'email'), '') 
  AND status = 'active'
));

-- ITEMS
ALTER TABLE commission_period_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access through periods"
ON commission_period_items FOR ALL
USING (period_id IN (
  SELECT id FROM commission_periods
  WHERE barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
  OR employee_id IN (
    SELECT id FROM employees 
    WHERE email = COALESCE((auth.jwt() ->> 'email'), '') 
    AND status = 'active'
  )
))
WITH CHECK (period_id IN (
  SELECT id FROM commission_periods
  WHERE barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_commission_periods_updated_at
  BEFORE UPDATE ON commission_periods
  FOR EACH ROW EXECUTE FUNCTION update_commission_updated_at();

CREATE TRIGGER update_commission_settings_updated_at
  BEFORE UPDATE ON barbershop_commission_settings
  FOR EACH ROW EXECUTE FUNCTION update_commission_updated_at();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_commission_periods_barbershop ON commission_periods(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_periods_employee ON commission_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_commission_periods_status ON commission_periods(status);
CREATE INDEX IF NOT EXISTS idx_commission_periods_dates ON commission_periods(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_commission_period_items_period ON commission_period_items(period_id);
CREATE INDEX IF NOT EXISTS idx_commission_period_items_commission ON commission_period_items(commission_transaction_id);
CREATE INDEX IF NOT EXISTS idx_commission_settings_barbershop ON barbershop_commission_settings(barbershop_id);