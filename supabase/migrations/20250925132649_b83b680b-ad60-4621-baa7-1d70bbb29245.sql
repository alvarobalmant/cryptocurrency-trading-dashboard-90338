-- Add 'deleted' as a valid status option to the employees table
-- First, let's check the current constraint
-- Then modify it to include 'deleted' status

-- Update the check constraint to allow 'deleted' status
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_status_check;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_status_check 
CHECK (status IN ('active', 'inactive', 'pending', 'deleted'));