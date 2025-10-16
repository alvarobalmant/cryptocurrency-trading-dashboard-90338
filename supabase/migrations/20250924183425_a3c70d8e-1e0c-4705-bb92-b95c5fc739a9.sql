-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  service_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Owners can manage all appointments" 
ON public.appointments 
FOR ALL 
USING (barbershop_id IN (
  SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()
));

CREATE POLICY "Employees can view their appointments" 
ON public.appointments 
FOR SELECT 
USING (employee_id = get_employee_id_by_email());

CREATE POLICY "Public can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_appointments_barbershop_date ON public.appointments(barbershop_id, appointment_date);
CREATE INDEX idx_appointments_employee_date ON public.appointments(employee_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);