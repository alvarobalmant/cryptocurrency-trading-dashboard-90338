-- Create tabs table (comandas)
CREATE TABLE IF NOT EXISTS public.tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  tab_number TEXT NOT NULL,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid')),
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create tab_items table (itens da comanda)
CREATE TABLE IF NOT EXISTS public.tab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'service', 'custom')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add tab_id and payment_source to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS tab_id UUID REFERENCES public.tabs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'direct' CHECK (payment_source IN ('tab', 'appointment', 'direct'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tabs_barbershop_id ON public.tabs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_tabs_status ON public.tabs(status);
CREATE INDEX IF NOT EXISTS idx_tabs_client_profile_id ON public.tabs(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_tabs_appointment_id ON public.tabs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_tab_items_tab_id ON public.tab_items(tab_id);
CREATE INDEX IF NOT EXISTS idx_payments_tab_id ON public.payments(tab_id);

-- Enable RLS on tabs
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tabs
CREATE POLICY "Owners can manage all tabs"
ON public.tabs FOR ALL
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view and create tabs"
ON public.tabs FOR SELECT
USING (is_active_employee_of_barbershop(barbershop_id));

CREATE POLICY "Employees can insert tabs"
ON public.tabs FOR INSERT
WITH CHECK (is_active_employee_of_barbershop(barbershop_id));

CREATE POLICY "Employees can update tabs"
ON public.tabs FOR UPDATE
USING (is_active_employee_of_barbershop(barbershop_id))
WITH CHECK (is_active_employee_of_barbershop(barbershop_id));

CREATE POLICY "Clients can view their own tabs"
ON public.tabs FOR SELECT
USING (
  client_profile_id IN (
    SELECT id FROM public.client_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Enable RLS on tab_items
ALTER TABLE public.tab_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tab_items
CREATE POLICY "Owners can manage all tab items"
ON public.tab_items FOR ALL
USING (
  tab_id IN (
    SELECT id FROM public.tabs WHERE is_barbershop_owner(barbershop_id)
  )
)
WITH CHECK (
  tab_id IN (
    SELECT id FROM public.tabs WHERE is_barbershop_owner(barbershop_id)
  )
);

CREATE POLICY "Employees can view tab items"
ON public.tab_items FOR SELECT
USING (
  tab_id IN (
    SELECT id FROM public.tabs WHERE is_active_employee_of_barbershop(barbershop_id)
  )
);

CREATE POLICY "Employees can manage tab items"
ON public.tab_items FOR ALL
USING (
  tab_id IN (
    SELECT id FROM public.tabs WHERE is_active_employee_of_barbershop(barbershop_id)
  )
)
WITH CHECK (
  tab_id IN (
    SELECT id FROM public.tabs WHERE is_active_employee_of_barbershop(barbershop_id)
  )
);

CREATE POLICY "Clients can view their own tab items"
ON public.tab_items FOR SELECT
USING (
  tab_id IN (
    SELECT id FROM public.tabs 
    WHERE client_profile_id IN (
      SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Create function to generate tab number
CREATE OR REPLACE FUNCTION generate_tab_number(p_barbershop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM tabs
  WHERE barbershop_id = p_barbershop_id
    AND DATE(created_at) = CURRENT_DATE;
  
  v_number := '#CMD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 3, '0');
  
  RETURN v_number;
END;
$$;

-- Create trigger to update updated_at on tabs
CREATE OR REPLACE FUNCTION update_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tabs_updated_at
BEFORE UPDATE ON public.tabs
FOR EACH ROW
EXECUTE FUNCTION update_tabs_updated_at();

-- Create trigger to update updated_at on tab_items
CREATE TRIGGER tab_items_updated_at
BEFORE UPDATE ON public.tab_items
FOR EACH ROW
EXECUTE FUNCTION update_tabs_updated_at();