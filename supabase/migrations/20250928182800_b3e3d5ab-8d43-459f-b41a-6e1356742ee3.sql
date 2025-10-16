-- Adicionar o novo status 'no_show' para agendamentos
-- Este status representa quando o cliente não aparece para o agendamento

-- Primeiro, vamos verificar e atualizar possíveis valores no enum de status
-- Como não temos um enum explícito, vamos apenas documentar os novos valores permitidos

-- Comentário sobre os status de agendamentos:
-- 'pending' -> "Marcado" 
-- 'confirmed' -> "Feito"
-- 'cancelled' -> "Cancelado"  
-- 'no_show' -> "Cliente não apareceu" (novo status)

-- Não há necessidade de alterar a estrutura da tabela, apenas adicionar o novo valor
-- que será usado nos componentes