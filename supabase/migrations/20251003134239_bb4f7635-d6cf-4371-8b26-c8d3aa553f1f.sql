-- Create virtual_queue_settings table
CREATE TABLE IF NOT EXISTS public.virtual_queue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  buffer_percentage INTEGER NOT NULL DEFAULT 33,
  notification_minutes INTEGER NOT NULL DEFAULT 30,
  max_queue_size INTEGER NOT NULL DEFAULT 50,
  eta_weight NUMERIC(3,2) NOT NULL DEFAULT 0.60,
  position_weight NUMERIC(3,2) NOT NULL DEFAULT 0.40,
  wait_time_bonus NUMERIC(3,2) NOT NULL DEFAULT 0.20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(barbershop_id)
);

-- Create virtual_queue_entries table
CREATE TABLE IF NOT EXISTS public.virtual_queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  estimated_arrival_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'confirmed', 'cancelled', 'expired')),
  priority_score NUMERIC(10,4),
  notification_sent_at TIMESTAMPTZ,
  notification_expires_at TIMESTAMPTZ,
  reserved_slot_start TIMESTAMPTZ,
  reserved_slot_end TIMESTAMPTZ,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for virtual_queue_entries
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON public.virtual_queue_entries(barbershop_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_created ON public.virtual_queue_entries(barbershop_id, created_at);

-- Create virtual_queue_logs table
CREATE TABLE IF NOT EXISTS public.virtual_queue_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES public.virtual_queue_entries(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for virtual_queue_logs
CREATE INDEX IF NOT EXISTS idx_queue_logs_entry ON public.virtual_queue_logs(queue_entry_id);
CREATE INDEX IF NOT EXISTS idx_queue_logs_barbershop ON public.virtual_queue_logs(barbershop_id, created_at);

-- Add source and virtual_queue_entry_id to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'booking', 'virtual_queue', 'whatsapp')),
ADD COLUMN IF NOT EXISTS virtual_queue_entry_id UUID REFERENCES public.virtual_queue_entries(id) ON DELETE SET NULL;

-- Create index for appointments source
CREATE INDEX IF NOT EXISTS idx_appointments_source ON public.appointments(source);

-- Enable RLS
ALTER TABLE public.virtual_queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_queue_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for virtual_queue_settings
CREATE POLICY "Owners can manage queue settings"
ON public.virtual_queue_settings
FOR ALL
TO authenticated
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Public can view enabled queue settings"
ON public.virtual_queue_settings
FOR SELECT
TO public
USING (enabled = true);

-- RLS Policies for virtual_queue_entries
CREATE POLICY "Owners can view all queue entries"
ON public.virtual_queue_entries
FOR SELECT
TO authenticated
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can update queue entries"
ON public.virtual_queue_entries
FOR UPDATE
TO authenticated
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Service role can manage queue entries"
ON public.virtual_queue_entries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for virtual_queue_logs
CREATE POLICY "Owners can view queue logs"
ON public.virtual_queue_logs
FOR SELECT
TO authenticated
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Service role can insert queue logs"
ON public.virtual_queue_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_virtual_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_virtual_queue_settings_updated_at
  BEFORE UPDATE ON public.virtual_queue_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_virtual_queue_updated_at();

CREATE TRIGGER update_virtual_queue_entries_updated_at
  BEFORE UPDATE ON public.virtual_queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_virtual_queue_updated_at();