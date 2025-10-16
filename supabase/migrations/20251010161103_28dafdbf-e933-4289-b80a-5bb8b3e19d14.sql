-- Create commissions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('commissions', 'commissions', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for commissions bucket
CREATE POLICY "Owners can manage commission files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'commissions' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM barbershops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Employees can view their commission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'commissions' AND
  (storage.foldername(name))[3] IN (
    SELECT cp.id::text FROM commission_periods cp
    JOIN employees e ON e.id = cp.employee_id
    WHERE e.email = auth.jwt()->>'email'
  )
);

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configure cron job for automatic commission period generation
-- Runs daily at 00:00 UTC (21:00 Brasília time)
SELECT cron.schedule(
  'auto-generate-commission-periods-daily',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://oapyqafknhuvmuqumrcn.supabase.co/functions/v1/auto-generate-commission-periods',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcHlxYWZrbmh1dm11cXVtcmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc1NjYsImV4cCI6MjA3NDMwMzU2Nn0.oUTY-zQ6I8VoVnROyFDRKv10Yih_HafLQei2ZwdInIw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);