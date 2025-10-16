-- Enable pg_cron and pg_net extensions if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to capture analytics snapshots daily at 3:00 AM
SELECT cron.schedule(
  'capture-analytics-snapshots-daily',
  '0 3 * * *', -- Every day at 3:00 AM
  $$
  SELECT
    net.http_post(
      url:='https://oapyqafknhuvmuqumrcn.supabase.co/functions/v1/capture-analytics-snapshot',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcHlxYWZrbmh1dm11cXVtcmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc1NjYsImV4cCI6MjA3NDMwMzU2Nn0.oUTY-zQ6I8VoVnROyFDRKv10Yih_HafLQei2ZwdInIw"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);