-- Clean up multiple barbershops per user - keep only the most recent one
-- First, create a temporary table with the most recent barbershop per user
WITH latest_barbershops AS (
  SELECT DISTINCT ON (owner_id) 
    id, owner_id, created_at
  FROM barbershops 
  ORDER BY owner_id, created_at DESC
)
-- Delete all barbershops except the most recent one per user
DELETE FROM barbershops 
WHERE id NOT IN (SELECT id FROM latest_barbershops);

-- Add unique constraint to enforce one barbershop per user
ALTER TABLE barbershops 
ADD CONSTRAINT unique_owner_barbershop UNIQUE (owner_id);