-- Enable realtime for tabs system (setting REPLICA IDENTITY FULL)
ALTER TABLE tabs REPLICA IDENTITY FULL;
ALTER TABLE tab_items REPLICA IDENTITY FULL;

-- Enable realtime for other critical tables
ALTER TABLE employees REPLICA IDENTITY FULL;
ALTER TABLE services REPLICA IDENTITY FULL;
ALTER TABLE client_profiles REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE virtual_queue_entries REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE inventory_batches REPLICA IDENTITY FULL;
ALTER TABLE commission_payments REPLICA IDENTITY FULL;
ALTER TABLE client_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE service_categories REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only if not already added)
DO $$
BEGIN
  -- tabs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tabs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tabs;
  END IF;

  -- tab_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tab_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tab_items;
  END IF;

  -- employees
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'employees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE employees;
  END IF;

  -- services
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'services'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE services;
  END IF;

  -- client_profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_profiles;
  END IF;

  -- payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;

  -- virtual_queue_entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'virtual_queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE virtual_queue_entries;
  END IF;

  -- products
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;

  -- inventory_batches
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_batches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_batches;
  END IF;

  -- commission_payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'commission_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE commission_payments;
  END IF;

  -- client_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_subscriptions;
  END IF;

  -- service_categories
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE service_categories;
  END IF;
END $$;