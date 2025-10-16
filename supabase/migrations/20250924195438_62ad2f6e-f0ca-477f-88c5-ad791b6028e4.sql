-- Add avatar_url column and rename description to slogan in barbershops table
ALTER TABLE public.barbershops 
ADD COLUMN avatar_url TEXT;

-- Rename description column to slogan
ALTER TABLE public.barbershops 
RENAME COLUMN description TO slogan;