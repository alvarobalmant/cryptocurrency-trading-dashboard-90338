-- Add 'free' as a valid plan type to the barbershops table
ALTER TABLE public.barbershops 
DROP CONSTRAINT IF EXISTS barbershops_plan_type_check;

ALTER TABLE public.barbershops 
ADD CONSTRAINT barbershops_plan_type_check 
CHECK (plan_type IN ('free', 'basic', 'pro', 'premium'));