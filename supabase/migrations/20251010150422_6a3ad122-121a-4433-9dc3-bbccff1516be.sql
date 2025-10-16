-- ==================================================================
-- SISTEMA DE COMISSÕES V2 - PERÍODOS, DESCONTOS E RELATÓRIOS
-- ==================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE commission_period_status AS ENUM ('draft', 'pending_signature', 'signed', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE period_type AS ENUM ('individual', 'weekly', 'monthly', 'custom');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deduction_type AS ENUM ('advance', 'product_purchase', 'split_payment', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. BARBERSHOP COMMISSION SETTINGS
CREATE TABLE IF NOT EXISTS public.barbershop_commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
  default_period_type period_type NOT NULL DEFAULT 'individual',
  weekly_close_day integer CHECK (weekly_close_day >= 0 AND weekly_close_day <= 6),
  monthly_close_day integer CHECK (monthly_close_day >= 1 AND monthly_close_day <= 31),
  auto_generate_periods boolean NOT NULL DEFAULT false,
  require_signature boolean NOT NULL DEFAULT true,
  signature_required_for_payment boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. COMMISSION PERIODS
CREATE TABLE IF NOT EXISTS public.commission_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_type period_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status commission_period_status NOT NULL DEFAULT 'draft',
  total_services_value numeric(10,2) NOT NULL DEFAULT 0,
  total_commission_value numeric(10,2) NOT NULL DEFAULT 0,
  total_deductions numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL DEFAULT 0,
  document_pdf_url text,
  signature_images text[] DEFAULT ARRAY[]::text[],
  payment_receipt_urls text[] DEFAULT ARRAY[]::text[],
  generated_at timestamp with time zone,
  signed_at timestamp with time zone,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT max_5_signatures CHECK (array_length(signature_images, 1) IS NULL OR array_length(signature_images, 1) <= 5),
  CONSTRAINT max_5_receipts CHECK (array_length(payment_receipt_urls, 1) IS NULL OR array_length(payment_receipt_urls, 1) <= 5)
);

-- 4. COMMISSION PERIOD SERVICES
CREATE TABLE IF NOT EXISTS public.commission_period_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_period_id uuid NOT NULL REFERENCES public.commission_periods(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_price numeric(10,2) NOT NULL,
  commission_percentage numeric(5,2) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  performed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. COMMISSION DEDUCTIONS
CREATE TABLE IF NOT EXISTS public.commission_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_period_id uuid REFERENCES public.commission_periods(id) ON DELETE SET NULL,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  deduction_type deduction_type NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  deduction_date date NOT NULL DEFAULT CURRENT_DATE,
  applied_to_period_id uuid REFERENCES public.commission_periods(id) ON DELETE SET NULL,
  created_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. COMMISSION AUDIT LOG
CREATE TABLE IF NOT EXISTS public.commission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7. UPDATE EXISTING commission_payments TABLE
ALTER TABLE public.commission_payments 
ADD COLUMN IF NOT EXISTS commission_period_id uuid REFERENCES public.commission_periods(id) ON DELETE SET NULL;

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_commission_periods_barbershop ON public.commission_periods(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_periods_employee ON public.commission_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_commission_periods_status ON public.commission_periods(status);
CREATE INDEX IF NOT EXISTS idx_commission_periods_dates ON public.commission_periods(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_commission_period_services_period ON public.commission_period_services(commission_period_id);
CREATE INDEX IF NOT EXISTS idx_commission_deductions_employee ON public.commission_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_commission_deductions_period ON public.commission_deductions(applied_to_period_id);
CREATE INDEX IF NOT EXISTS idx_commission_audit_log_barbershop ON public.commission_audit_log(barbershop_id);

-- 9. TRIGGERS FOR updated_at
CREATE OR REPLACE FUNCTION public.update_commission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_barbershop_commission_settings_updated_at ON public.barbershop_commission_settings;
CREATE TRIGGER update_barbershop_commission_settings_updated_at
  BEFORE UPDATE ON public.barbershop_commission_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_commission_updated_at();

DROP TRIGGER IF EXISTS update_commission_periods_updated_at ON public.commission_periods;
CREATE TRIGGER update_commission_periods_updated_at
  BEFORE UPDATE ON public.commission_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_commission_updated_at();

DROP TRIGGER IF EXISTS update_commission_deductions_updated_at ON public.commission_deductions;
CREATE TRIGGER update_commission_deductions_updated_at
  BEFORE UPDATE ON public.commission_deductions
  FOR EACH ROW EXECUTE FUNCTION public.update_commission_updated_at();

-- 10. RLS POLICIES

-- barbershop_commission_settings
ALTER TABLE public.barbershop_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their commission settings"
  ON public.barbershop_commission_settings
  FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

-- commission_periods
ALTER TABLE public.commission_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage commission periods"
  ON public.commission_periods
  FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view their own periods"
  ON public.commission_periods
  FOR SELECT
  USING (employee_id = get_employee_id_by_email());

-- commission_period_services
ALTER TABLE public.commission_period_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view period services"
  ON public.commission_period_services
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.commission_periods cp
    WHERE cp.id = commission_period_services.commission_period_id
    AND is_barbershop_owner(cp.barbershop_id)
  ));

CREATE POLICY "Employees can view their period services"
  ON public.commission_period_services
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.commission_periods cp
    WHERE cp.id = commission_period_services.commission_period_id
    AND cp.employee_id = get_employee_id_by_email()
  ));

-- commission_deductions
ALTER TABLE public.commission_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage deductions"
  ON public.commission_deductions
  FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view their deductions"
  ON public.commission_deductions
  FOR SELECT
  USING (employee_id = get_employee_id_by_email());

-- commission_audit_log
ALTER TABLE public.commission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view audit logs"
  ON public.commission_audit_log
  FOR SELECT
  USING (is_barbershop_owner(barbershop_id));

-- 11. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('commission-reports', 'commission-reports', false, 10485760, ARRAY['application/pdf']),
  ('commission-signatures', 'commission-signatures', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 12. STORAGE RLS POLICIES
CREATE POLICY "Owners can manage commission reports"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'commission-reports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.barbershops WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'commission-reports' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view their commission reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'commission-reports' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.employees WHERE email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active'
    )
  );

CREATE POLICY "Owners can manage commission signatures"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'commission-signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.barbershops WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'commission-signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view their commission signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'commission-signatures' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.employees WHERE email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active'
    )
  );