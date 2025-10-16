-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_services junction table
CREATE TABLE public.employee_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, service_id)
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Owners can manage services" 
ON public.services 
FOR ALL 
USING (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
) 
WITH CHECK (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
);

-- Employees policies
CREATE POLICY "Owners can manage employees" 
ON public.employees 
FOR ALL 
USING (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
) 
WITH CHECK (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
);

-- Employee services policies
CREATE POLICY "Owners can manage employee services" 
ON public.employee_services 
FOR ALL 
USING (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.barbershops b ON e.barbershop_id = b.id
    WHERE b.owner_id = auth.uid()
  )
) 
WITH CHECK (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.barbershops b ON e.barbershop_id = b.id
    WHERE b.owner_id = auth.uid()
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_services_barbershop_id ON public.services(barbershop_id);
CREATE INDEX idx_employees_barbershop_id ON public.employees(barbershop_id);
CREATE INDEX idx_employee_services_employee_id ON public.employee_services(employee_id);
CREATE INDEX idx_employee_services_service_id ON public.employee_services(service_id);