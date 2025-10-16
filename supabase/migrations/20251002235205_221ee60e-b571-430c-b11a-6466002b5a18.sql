-- Enable realtime for appointments table
-- This allows the app to receive live updates when appointments change

-- Enable replica identity to capture all columns in realtime updates
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- Add appointments table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;