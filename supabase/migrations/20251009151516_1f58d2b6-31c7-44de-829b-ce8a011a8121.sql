-- Enable realtime for product_variants table
ALTER TABLE product_variants REPLICA IDENTITY FULL;

-- Add product_variants to realtime publication (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'product_variants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE product_variants;
  END IF;
END $$;