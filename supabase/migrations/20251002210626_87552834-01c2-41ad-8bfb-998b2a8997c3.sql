-- Adicionar coluna client_profile_id à tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_appointments_client_profile 
ON public.appointments(client_profile_id);

-- Atualizar agendamentos existentes (match por telefone + barbearia)
UPDATE public.appointments a
SET client_profile_id = cp.id
FROM public.client_profiles cp
WHERE a.client_phone = cp.phone 
  AND a.barbershop_id = cp.barbershop_id
  AND a.client_profile_id IS NULL;