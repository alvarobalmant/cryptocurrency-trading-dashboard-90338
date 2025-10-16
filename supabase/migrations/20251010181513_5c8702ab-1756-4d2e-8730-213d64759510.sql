-- Limpar dados de comissões mantendo estrutura das tabelas

-- Deletar na ordem correta devido às foreign keys
DELETE FROM public.commission_period_services;
DELETE FROM public.commission_adjustments;
DELETE FROM public.commission_deductions;
DELETE FROM public.commission_periods;
DELETE FROM public.commission_payments;
DELETE FROM public.commission_audit_log;