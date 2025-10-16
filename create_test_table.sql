-- ==========================================
-- TABELA DE TESTE PARA SUPABASE
-- ==========================================
-- Execute este SQL no Supabase Studio > SQL Editor

-- Criar tabela de teste
CREATE TABLE IF NOT EXISTS public.test_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  value DECIMAL(10,2),
  category TEXT DEFAULT 'geral',
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.test_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários só podem ver/editar seus próprios itens
CREATE POLICY "Users can view own test items" ON public.test_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test items" ON public.test_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test items" ON public.test_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test items" ON public.test_items
  FOR DELETE USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_test_items_user_id ON public.test_items(user_id);
CREATE INDEX IF NOT EXISTS idx_test_items_category ON public.test_items(category);
CREATE INDEX IF NOT EXISTS idx_test_items_created_at ON public.test_items(created_at);

-- Inserir alguns dados de exemplo (opcional)
-- Nota: Estes dados só serão visíveis para o usuário que os criar
INSERT INTO public.test_items (name, description, value, category, user_id) VALUES
  ('Produto A', 'Descrição do produto A', 29.90, 'produtos', auth.uid()),
  ('Serviço B', 'Descrição do serviço B', 150.00, 'servicos', auth.uid()),
  ('Item C', 'Descrição do item C', 75.50, 'diversos', auth.uid());

-- Para verificar se foi criada corretamente:
-- SELECT * FROM public.test_items;