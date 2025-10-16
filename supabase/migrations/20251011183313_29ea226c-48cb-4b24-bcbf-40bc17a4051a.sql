-- Add barbershop_name column to analytics_snapshots
ALTER TABLE analytics_snapshots 
ADD COLUMN barbershop_name TEXT;

-- Update existing records with barbershop names
UPDATE analytics_snapshots 
SET barbershop_name = b.name
FROM barbershops b
WHERE analytics_snapshots.barbershop_id = b.id;