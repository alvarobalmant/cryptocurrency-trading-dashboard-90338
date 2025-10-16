-- Create enum for notification timing options
CREATE TYPE notification_timing AS ENUM ('30_minutes', '1_hour', '1_day');

-- Create appointment notification settings table
CREATE TABLE public.appointment_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  notification_timing notification_timing NOT NULL DEFAULT '1_hour',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(barbershop_id)
);

-- Enable RLS
ALTER TABLE public.appointment_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can view their notification settings"
  ON public.appointment_notification_settings
  FOR SELECT
  USING (public.is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can insert their notification settings"
  ON public.appointment_notification_settings
  FOR INSERT
  WITH CHECK (public.is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can update their notification settings"
  ON public.appointment_notification_settings
  FOR UPDATE
  USING (public.is_barbershop_owner(barbershop_id))
  WITH CHECK (public.is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can delete their notification settings"
  ON public.appointment_notification_settings
  FOR DELETE
  USING (public.is_barbershop_owner(barbershop_id));

-- Create trigger for updated_at
CREATE TRIGGER update_appointment_notification_settings_updated_at
  BEFORE UPDATE ON public.appointment_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_appointment_notification_settings_barbershop ON public.appointment_notification_settings(barbershop_id);

COMMENT ON TABLE public.appointment_notification_settings IS 'Configurações de notificações automáticas de confirmação de agendamentos';
COMMENT ON COLUMN public.appointment_notification_settings.notification_timing IS 'Tempo de antecedência para envio da notificação: 30 minutos, 1 hora ou 1 dia antes do agendamento';