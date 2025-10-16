-- Create barbershop_subscriptions table
CREATE TABLE public.barbershop_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free',
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT,
  mercadopago_payment_id TEXT,
  mercadopago_preference_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barbershop_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owners can view their own barbershop subscriptions
CREATE POLICY "Owners can view their barbershop subscriptions"
ON public.barbershop_subscriptions
FOR SELECT
TO authenticated
USING (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
);

-- Owners can insert their own barbershop subscriptions
CREATE POLICY "Owners can insert their barbershop subscriptions"
ON public.barbershop_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_barbershop_subscriptions_barbershop_id ON public.barbershop_subscriptions(barbershop_id);
CREATE INDEX idx_barbershop_subscriptions_status ON public.barbershop_subscriptions(status);

-- Add trigger for updated_at
CREATE TRIGGER update_barbershop_subscriptions_updated_at
BEFORE UPDATE ON public.barbershop_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();