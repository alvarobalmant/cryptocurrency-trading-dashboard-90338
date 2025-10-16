-- Tabela de sessões de chat
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_phone TEXT,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  session_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_barbershop ON public.chat_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_phone ON public.chat_sessions(client_phone);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON public.chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at);

-- Trigger para updated_at
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Owners podem ver todas as sessões da barbearia
CREATE POLICY "Owners can view barbershop chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (is_barbershop_owner(barbershop_id));

-- Owners podem gerenciar mensagens das sessões da barbearia
CREATE POLICY "Owners can view barbershop chat messages"
  ON public.chat_messages FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.chat_sessions WHERE is_barbershop_owner(barbershop_id)
  ));

-- Service role pode fazer tudo (para edge functions)
CREATE POLICY "Service role can manage chat sessions"
  ON public.chat_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);