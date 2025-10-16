-- Allow public read access to barbershop basic info for booking system
CREATE POLICY "Public can view barbershops for booking" 
ON public.barbershops 
FOR SELECT 
TO anon
USING (active = true);

-- Allow public read access to active services for booking system
CREATE POLICY "Public can view active services for booking" 
ON public.services 
FOR SELECT 
TO anon
USING (active = true);

-- Allow public read access to active employees for booking system
CREATE POLICY "Public can view active employees for booking" 
ON public.employees 
FOR SELECT 
TO anon
USING (status = 'active');

-- Allow public read access to employee services for booking system
CREATE POLICY "Public can view employee services for booking" 
ON public.employee_services 
FOR SELECT 
TO anon
USING (true);