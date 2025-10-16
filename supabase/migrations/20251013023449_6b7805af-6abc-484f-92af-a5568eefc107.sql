-- Adicionar colunas para análise de visitantes na tabela analytics_snapshots
ALTER TABLE analytics_snapshots 
ADD COLUMN IF NOT EXISTS visitor_detailed_analytics jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS visitor_metrics jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN analytics_snapshots.visitor_detailed_analytics IS 
'Análise detalhada de visitantes (clientes sem client_profile_id)';

COMMENT ON COLUMN analytics_snapshots.visitor_metrics IS 
'Métricas agregadas dos visitantes: total, receita, conversão, etc';