-- Add commission percentage to employees table
ALTER TABLE public.employees 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 0.00;

COMMENT ON COLUMN public.employees.commission_percentage IS 'Commission percentage for the employee (e.g., 30.00 for 30%)';