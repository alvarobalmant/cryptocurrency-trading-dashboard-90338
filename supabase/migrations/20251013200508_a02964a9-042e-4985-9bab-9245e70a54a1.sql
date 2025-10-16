-- Criar nova tabela de comissões simplificada
CREATE TABLE IF NOT EXISTS public.employee_commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_price NUMERIC(10, 2) NOT NULL,
  commission_percentage NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_commission_entries_barbershop ON public.employee_commission_entries(barbershop_id);
CREATE INDEX idx_commission_entries_employee ON public.employee_commission_entries(employee_id);
CREATE INDEX idx_commission_entries_status ON public.employee_commission_entries(status);
CREATE INDEX idx_commission_entries_employee_status ON public.employee_commission_entries(employee_id, status);

-- Habilitar RLS
ALTER TABLE public.employee_commission_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can manage commission entries"
  ON public.employee_commission_entries
  FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view their own commission entries"
  ON public.employee_commission_entries
  FOR SELECT
  USING (employee_id = get_employee_id_by_email());

-- Função trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_commission_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_commission_entries_timestamp
  BEFORE UPDATE ON public.employee_commission_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_entries_updated_at();

-- Função para registrar comissão automaticamente
CREATE OR REPLACE FUNCTION public.auto_register_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_commission_percentage NUMERIC;
  v_service_price NUMERIC;
  v_service_name TEXT;
  v_commission_amount NUMERIC;
BEGIN
  -- Apenas processar se mudou para pago e está confirmado
  IF NEW.payment_status = 'paid' AND NEW.status = 'confirmed' AND 
     (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Verificar se já existe entrada para este agendamento
    IF EXISTS (SELECT 1 FROM employee_commission_entries WHERE appointment_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Buscar percentual de comissão do funcionário
    SELECT commission_percentage INTO v_employee_commission_percentage
    FROM employees
    WHERE id = NEW.employee_id;
    
    -- Se não tem comissão configurada, não registrar
    IF v_employee_commission_percentage IS NULL OR v_employee_commission_percentage = 0 THEN
      RETURN NEW;
    END IF;
    
    -- Buscar preço e nome do serviço
    SELECT price, name INTO v_service_price, v_service_name
    FROM services
    WHERE id = NEW.service_id;
    
    -- Calcular comissão
    v_commission_amount := (v_service_price * v_employee_commission_percentage / 100);
    
    -- Inserir registro de comissão
    INSERT INTO employee_commission_entries (
      barbershop_id,
      employee_id,
      appointment_id,
      service_name,
      service_price,
      commission_percentage,
      commission_amount,
      status
    ) VALUES (
      NEW.barbershop_id,
      NEW.employee_id,
      NEW.id,
      v_service_name,
      v_service_price,
      v_employee_commission_percentage,
      v_commission_amount,
      'due'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela appointments
DROP TRIGGER IF EXISTS trigger_auto_register_commission ON public.appointments;
CREATE TRIGGER trigger_auto_register_commission
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_register_commission();