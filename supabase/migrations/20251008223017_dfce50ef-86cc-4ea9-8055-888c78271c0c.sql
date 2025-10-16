-- Add custom_message_template field to appointment_notification_settings
ALTER TABLE public.appointment_notification_settings 
ADD COLUMN custom_message_template text DEFAULT 'Olá! Este é um lembrete do seu agendamento na nossa barbearia. Aguardamos você no horário marcado! Para confirmar ou remarcar, responda esta mensagem.';

COMMENT ON COLUMN public.appointment_notification_settings.custom_message_template IS 'Template de mensagem personalizada para o agente de IA usar ao enviar avisos de confirmação';