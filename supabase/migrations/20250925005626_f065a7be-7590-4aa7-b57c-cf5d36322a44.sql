-- Remove the unique constraint that prevents multiple barbershops per owner
ALTER TABLE public.barbershops DROP CONSTRAINT IF EXISTS unique_owner_barbershop;

-- Instead, we'll keep the unique constraint on slug only (which already exists)
-- This allows owners to have multiple barbershops with different slugs