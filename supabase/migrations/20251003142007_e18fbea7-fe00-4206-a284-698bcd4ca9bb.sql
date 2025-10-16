-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run virtual-queue-monitor every 2 minutes
SELECT cron.schedule(
  'virtual-queue-monitor-every-2-minutes',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://oapyqafknhuvmuqumrcn.supabase.co/functions/v1/virtual-queue-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcHlxYWZrbmh1dm11cXVtcmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc1NjYsImV4cCI6MjA3NDMwMzU2Nn0.oUTY-zQ6I8VoVnROyFDRKv10Yih_HafLQei2ZwdInIw"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);