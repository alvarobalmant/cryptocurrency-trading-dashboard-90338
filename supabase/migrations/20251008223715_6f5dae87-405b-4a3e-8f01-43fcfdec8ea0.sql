-- Rename custom_message_template to custom_agent_prompt
ALTER TABLE public.appointment_notification_settings 
RENAME COLUMN custom_message_template TO custom_agent_prompt;

COMMENT ON COLUMN public.appointment_notification_settings.custom_agent_prompt IS 'Prompt personalizado para configurar o comportamento do agente de IA no WhatsApp';