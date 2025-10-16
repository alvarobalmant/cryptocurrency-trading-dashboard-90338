-- Fase 1: Expandir status dos agendamentos
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show'));

-- Fase 2: Criar tabela de pagamentos de comissão
CREATE TABLE public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  appointment_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID
);

-- Enable RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Policies para commission_payments
CREATE POLICY "Owners can manage commission payments" 
ON public.commission_payments 
FOR ALL
USING (barbershop_id IN (
  SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()
))
WITH CHECK (barbershop_id IN (
  SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()
));

CREATE POLICY "Employees can view their commission payments" 
ON public.commission_payments 
FOR SELECT
USING (employee_id = get_employee_id_by_email());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_commission_payments_updated_at
BEFORE UPDATE ON public.commission_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance (apenas os que não existem)
CREATE INDEX IF NOT EXISTS idx_commission_payments_employee_id ON public.commission_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_barbershop_id ON public.commission_payments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_period ON public.commission_payments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(appointment_date, status);