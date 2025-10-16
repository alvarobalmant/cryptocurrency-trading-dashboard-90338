-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatar uploads
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add avatar_url to employees table
ALTER TABLE public.employees 
ADD COLUMN avatar_url TEXT;

-- Add slug column to employees for URL routing
ALTER TABLE public.employees 
ADD COLUMN slug TEXT;

-- Create function to generate employee slug
CREATE OR REPLACE FUNCTION public.generate_employee_slug(employee_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(trim(employee_name), '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Check if slug exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM employees WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update existing employees to have slugs
UPDATE public.employees 
SET slug = public.generate_employee_slug(name) 
WHERE slug IS NULL;

-- Make slug NOT NULL after updating existing records
ALTER TABLE public.employees 
ALTER COLUMN slug SET NOT NULL;

-- Create unique constraint on employee slug
ALTER TABLE public.employees 
ADD CONSTRAINT employees_slug_unique UNIQUE (slug);

-- Create employee schedules table
CREATE TABLE public.employee_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Enable RLS on employee_schedules
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_schedules
CREATE POLICY "Employees can manage their own schedules" 
ON public.employee_schedules 
FOR ALL 
USING (employee_id = get_employee_id_by_email());

CREATE POLICY "Owners can manage employee schedules" 
ON public.employee_schedules 
FOR ALL 
USING (employee_id IN (
  SELECT e.id FROM employees e 
  JOIN barbershops b ON e.barbershop_id = b.id 
  WHERE b.owner_id = auth.uid()
));

-- Create employee breaks table (for lunch breaks, specific day breaks, etc.)
CREATE TABLE public.employee_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  break_type TEXT NOT NULL CHECK (break_type IN ('daily', 'specific_date')), -- daily = recurring, specific_date = one-time
  title TEXT NOT NULL, -- e.g., "Almoço", "Consulta médica"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- Only for daily breaks
  specific_date DATE, -- Only for specific_date breaks
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_break_time_range CHECK (start_time < end_time),
  CONSTRAINT daily_break_needs_day_of_week CHECK (
    (break_type = 'daily' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (break_type = 'specific_date' AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

-- Enable RLS on employee_breaks
ALTER TABLE public.employee_breaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_breaks
CREATE POLICY "Employees can manage their own breaks" 
ON public.employee_breaks 
FOR ALL 
USING (employee_id = get_employee_id_by_email());

CREATE POLICY "Owners can manage employee breaks" 
ON public.employee_breaks 
FOR ALL 
USING (employee_id IN (
  SELECT e.id FROM employees e 
  JOIN barbershops b ON e.barbershop_id = b.id 
  WHERE b.owner_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_breaks_updated_at
  BEFORE UPDATE ON public.employee_breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to generate slug when creating employee
CREATE OR REPLACE FUNCTION public.set_employee_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := public.generate_employee_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employee_slug_trigger
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_employee_slug();