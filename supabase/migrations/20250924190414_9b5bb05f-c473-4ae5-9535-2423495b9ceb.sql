-- Allow public read access to employee schedules for booking system
CREATE POLICY "Public can view employee schedules for booking" 
ON public.employee_schedules 
FOR SELECT 
TO anon
USING (is_active = true);