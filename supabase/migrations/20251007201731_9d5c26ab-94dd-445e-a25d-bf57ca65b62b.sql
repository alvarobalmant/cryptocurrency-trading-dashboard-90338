-- Create chatwoot_inboxes table
CREATE TABLE IF NOT EXISTS public.chatwoot_inboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  chatwoot_inbox_id INTEGER NOT NULL,
  chatwoot_account_id INTEGER NOT NULL,
  inbox_name TEXT NOT NULL,
  inbox_identifier TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(barbershop_id)
);

-- Create chatwoot_users table (optional cache)
CREATE TABLE IF NOT EXISTS public.chatwoot_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chatwoot_user_id INTEGER NOT NULL,
  chatwoot_account_id INTEGER NOT NULL,
  role TEXT DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(barbershop_id, user_id)
);

-- Add chatwoot_inbox_id column to whatsapp_connections
ALTER TABLE public.whatsapp_connections 
ADD COLUMN IF NOT EXISTS chatwoot_inbox_id INTEGER;

-- Enable RLS
ALTER TABLE public.chatwoot_inboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatwoot_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatwoot_inboxes
CREATE POLICY "Owners can view their chatwoot inboxes"
ON public.chatwoot_inboxes
FOR SELECT
TO authenticated
USING (barbershop_id IN (
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
));

CREATE POLICY "Owners can manage their chatwoot inboxes"
ON public.chatwoot_inboxes
FOR ALL
TO authenticated
USING (barbershop_id IN (
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
))
WITH CHECK (barbershop_id IN (
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
));

CREATE POLICY "Service role can manage chatwoot inboxes"
ON public.chatwoot_inboxes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for chatwoot_users
CREATE POLICY "Owners can view their chatwoot users"
ON public.chatwoot_users
FOR SELECT
TO authenticated
USING (barbershop_id IN (
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
));

CREATE POLICY "Service role can manage chatwoot users"
ON public.chatwoot_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_chatwoot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatwoot_inboxes_updated_at
  BEFORE UPDATE ON public.chatwoot_inboxes
  FOR EACH ROW
  EXECUTE FUNCTION update_chatwoot_updated_at();

CREATE TRIGGER update_chatwoot_users_updated_at
  BEFORE UPDATE ON public.chatwoot_users
  FOR EACH ROW
  EXECUTE FUNCTION update_chatwoot_updated_at();