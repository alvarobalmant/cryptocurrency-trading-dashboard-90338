import { MetricHelpContent } from '@/components/analytics/v2/MetricTooltip';

export const analyticsTooltips: Record<string, MetricHelpContent> = {
  // CLIENT METRICS
  clv: {
    title: 'CLV - Customer Lifetime Value',
    definition: 'Valor total que um cliente gera durante todo o relacionamento com sua barbearia.',
    formula: 'CLV = Receita Total do Cliente / Total de Clientes Únicos',
    example: 'Se você teve R$ 50.000 em receitas e 50 clientes únicos, o CLV médio é R$ 1.000.',
    dataSource: 'Calculado com base em todos os agendamentos pagos e receitas reais dos últimos 6 meses.',
    calculation: `1. Soma toda a receita de agendamentos confirmados e pagos
2. Divide pelo número total de clientes únicos
3. Resultado: quanto cada cliente vale em média`
  },

  cac: {
    title: 'CAC - Custo de Aquisição de Cliente',
    definition: 'Quanto você gasta em média para conquistar um novo cliente.',
    formula: 'CAC = Custos Totais de Marketing / Número de Novos Clientes',
    example: 'Se você gastou R$ 500 em marketing e conquistou 10 novos clientes, seu CAC é R$ 50.',
    dataSource: 'Baseado em custos operacionais e número de novos clientes por mês.',
    calculation: `1. Soma todos os custos relacionados a marketing e aquisição
2. Divide pelo número de clientes novos no período
3. Para análise histórica, compara mês a mês`
  },

  retention: {
    title: 'Taxa de Retenção',
    definition: 'Percentual de clientes que continuam voltando à sua barbearia.',
    formula: 'Retenção = (Clientes Recorrentes / Total de Clientes) × 100',
    example: 'Se você tem 80 clientes e 60 voltaram no período, sua taxa de retenção é 75%.',
    dataSource: 'Calculado analisando clientes com mais de um agendamento nos últimos meses.',
    calculation: `1. Identifica clientes que fizeram mais de 1 agendamento
2. Divide pelo total de clientes únicos
3. Multiplica por 100 para obter a porcentagem`
  },

  retentionCurve: {
    title: 'Curva de Retenção',
    definition: 'Mostra quantos clientes continuam ativos ao longo dos meses.',
    formula: 'Retenção no Mês N = (Clientes Ativos no Mês N / Clientes Iniciais da Cohort) × 100',
    example: 'Se 100 clientes começaram em Janeiro e 80 ainda estão ativos em Março, a retenção no mês 2 é 80%.',
    dataSource: 'Baseado na cohort mais recente dos últimos 6 meses de agendamentos.',
    calculation: `1. Pega a cohort mais recente (clientes que entraram no mesmo mês)
2. Acompanha quantos continuam ativos a cada mês
3. Calcula o percentual de retenção mês a mês
4. Exibe até 6 meses de acompanhamento`
  },

  cohortAnalysis: {
    title: 'Análise de Cohort',
    definition: 'Acompanha grupos de clientes que entraram no mesmo mês e mostra quantos % continuam ativos nos meses seguintes.',
    formula: 'Cohort = Clientes com 1º agendamento no mesmo mês\nRetenção Mês N = (Clientes ativos no Mês N / Total inicial do cohort) × 100',
    example: 'Cohort de Julho (100 clientes novos):\n• Mês 0: 100% (baseline - todos ativos)\n• Mês 1: 75% voltaram em Agosto\n• Mês 2: 60% voltaram em Setembro\n• Mês 3: 50% voltaram em Outubro\n\nVerde escuro indica alta retenção (>75%), vermelho indica perda de clientes (<25%).',
    dataSource: 'Baseado nas últimas 4 cohorts mensais de novos clientes e seus agendamentos subsequentes.',
    calculation: `1. Identifica clientes NOVOS em cada mês (primeira vez agendando)
2. Agrupa esses clientes em "cohorts" pelo mês de entrada
3. Para cada cohort, rastreia quantos % voltaram nos próximos meses
4. Mês 0 = sempre 100% (baseline - todos começam ativos)
5. Meses 1-4 = % dos clientes originais que continuam agendando
6. Cores do heatmap:
   • Verde (≥75%): Excelente retenção
   • Amarelo (50-75%): Retenção moderada
   • Laranja (25-50%): Atenção necessária
   • Vermelho (<25%): Perda crítica de clientes`,
    interpretation: `📈 Como interpretar:
• Diagonal verde = padrão saudável de retenção
• Queda rápida nos primeiros meses = problemas de experiência
• Cohorts recentes piores que antigas = serviço deteriorando
• Cohorts recentes melhores = melhorias funcionando
• Células vazias (-) = dados ainda não disponíveis para aquele período`
  },

  clientSegmentation: {
    title: 'Segmentação de Clientes',
    definition: 'Classifica clientes em grupos (VIP, Regular, Novo) baseado em valor e comportamento.',
    formula: 'VIP: CLV > Média × 1.5 | Regular: CLV entre Média e Média × 1.5 | Novo: CLV < Média',
    example: 'Se CLV médio é R$ 1.000: VIP > R$ 1.500, Regular entre R$ 1.000-1.500, Novo < R$ 1.000.',
    dataSource: 'Calculado com base no CLV real de cada cliente dos últimos 6 meses.',
    calculation: `1. Calcula o CLV de cada cliente
2. Define o CLV médio
3. VIP: clientes com CLV > média × 1.5
4. Regular: CLV entre média e média × 1.5
5. Novo: CLV abaixo da média`
  },

  atRiskClients: {
    title: 'Clientes em Risco',
    definition: 'Número de clientes que não retornam há mais de 60 dias.',
    formula: 'Clientes sem agendamento nos últimos 60 dias',
    example: 'Se você tem 100 clientes totais e 15 não voltaram há mais de 60 dias, tem 15 clientes em risco.',
    dataSource: 'Baseado na data do último agendamento de cada cliente.',
    calculation: `1. Para cada cliente, verifica a data do último agendamento
2. Conta quantos estão há mais de 60 dias sem agendar
3. Este número representa potencial churn`
  },

  // FINANCIAL METRICS
  cashOnHand: {
    title: 'Saldo em Caixa',
    definition: 'Dinheiro disponível agora na sua barbearia.',
    formula: 'Caixa = Receitas Recebidas - (Comissões + Custos Pagos)',
    example: 'Receitas R$ 50k - Comissões R$ 15k - Custos R$ 10k = R$ 25k em caixa.',
    dataSource: 'Baseado em pagamentos confirmados e despesas reais registradas.',
    calculation: `1. Soma todas as receitas já recebidas (pagamentos confirmados)
2. Subtrai comissões pagas aos funcionários
3. Subtrai custos com produtos e compras
4. Resultado: quanto você tem disponível agora`
  },

  netProfit: {
    title: 'Lucro Líquido',
    definition: 'Quanto sobra após pagar todos os custos.',
    formula: 'Lucro Líquido = Receita Total - (COGS + Mão de Obra + OpEx)',
    example: 'Receita R$ 50k - COGS R$ 5k - Comissões R$ 15k - OpEx R$ 10k = R$ 20k de lucro.',
    dataSource: 'Calculado com receitas e custos reais do período selecionado.',
    calculation: `1. Receita Bruta: total de serviços, produtos e assinaturas
2. COGS: custo dos produtos vendidos
3. Mão de Obra: comissões pagas
4. OpEx: custos operacionais
5. Lucro = Receita - todos os custos`
  },

  mrr: {
    title: 'MRR - Receita Mensal Recorrente',
    definition: 'Receita total gerada no mês.',
    formula: 'MRR = Serviços + Produtos + Assinaturas + Comandas',
    example: 'Serviços R$ 40k + Produtos R$ 3k + Assinaturas R$ 5k + Comandas R$ 2k = R$ 50k MRR.',
    dataSource: 'Soma de todas as fontes de receita do período.',
    calculation: `1. Soma receitas de serviços realizados
2. Adiciona vendas de produtos
3. Adiciona receita de assinaturas ativas
4. Adiciona valor de comandas pagas`
  },

  financialHealth: {
    title: 'Saúde Financeira',
    definition: 'Score de 0-100 que indica a saúde geral do negócio.',
    formula: 'Score = Fluxo de Caixa (30) + Margem (30) + Crescimento (20) + Runway (20)',
    example: 'Caixa positivo (30) + Margem 25% (25) + Crescimento (15) + 6 meses runway (20) = Score 90.',
    dataSource: 'Calculado automaticamente com base em múltiplos indicadores financeiros.',
    calculation: `1. Fluxo de Caixa Positivo: até 30 pontos
2. Margem Líquida > 20%: até 30 pontos
3. Crescimento: até 20 pontos
4. Runway > 3 meses: até 20 pontos
Total: 0-100 (Excelente: >70, Bom: 50-70, Atenção: <50)`
  },

  // OPERATIONAL METRICS
  employeeUtilization: {
    title: 'Utilização da Equipe',
    definition: 'Percentual do tempo que seus funcionários estão produtivos.',
    formula: 'Utilização = (Horas Trabalhadas / Horas Disponíveis) × 100',
    example: 'Se funcionário trabalhou 32h de 40h disponíveis, utilização = 80%.',
    dataSource: 'Baseado em horas trabalhadas reais dos agendamentos confirmados.',
    calculation: `1. Calcula total de horas em agendamentos realizados
2. Compara com horas disponíveis (horário de funcionamento)
3. Percentual indica eficiência da equipe`
  },

  avgWaitTime: {
    title: 'Tempo Médio de Espera',
    definition: 'Quanto tempo em média os clientes esperam.',
    formula: 'Tempo Médio = Soma dos Tempos de Espera / Total de Atendimentos',
    example: 'Se 10 clientes esperaram total de 150 minutos, média = 15 minutos.',
    dataSource: 'Calculado com base em timestamps de agendamentos e atendimentos.',
    calculation: `1. Para cada agendamento, calcula tempo entre chegada e início
2. Soma todos os tempos
3. Divide pelo número de atendimentos
4. Resultado em minutos`
  },

  revenuePerHour: {
    title: 'Receita por Hora',
    definition: 'Quanto você fatura em média por hora trabalhada.',
    formula: 'Receita/Hora = Receita Total / Total de Horas Trabalhadas',
    example: 'Receita R$ 50.000 / 160 horas trabalhadas = R$ 312,50 por hora.',
    dataSource: 'Baseado em receitas e horas trabalhadas reais.',
    calculation: `1. Soma toda a receita do período
2. Calcula total de horas trabalhadas
3. Divide receita por horas
4. Indica produtividade financeira`
  },

  noShowRate: {
    title: 'Taxa de No-Show',
    definition: 'Percentual de clientes que não comparecem sem avisar.',
    formula: 'No-Show = (Faltas / Total de Agendamentos) × 100',
    example: 'Se teve 100 agendamentos e 8 faltas, no-show = 8%.',
    dataSource: 'Calculado com agendamentos marcados como "não compareceu".',
    calculation: `1. Conta agendamentos não comparecidos
2. Divide pelo total de agendamentos
3. Multiplica por 100
4. Meta: manter abaixo de 10%`
  },

  // REVENUE BREAKDOWN
  revenueBySource: {
    title: 'Receita por Fonte',
    definition: 'Distribuição da receita entre serviços, produtos, assinaturas e comandas.',
    formula: 'Total = Serviços + Produtos + Assinaturas + Comandas',
    example: 'Serviços 75%, Produtos 5%, Assinaturas 15%, Comandas 5% do total.',
    dataSource: 'Baseado em pagamentos reais categorizados por tipo.',
    calculation: `1. Serviços: soma de todos os agendamentos pagos
2. Produtos: vendas diretas de produtos
3. Assinaturas: mensalidades recebidas
4. Comandas: valor total de comandas fechadas`
  },

  costBreakdown: {
    title: 'Distribuição de Custos',
    definition: 'Como seus custos estão divididos entre comissões, produtos, compras e SaaS.',
    formula: 'Total = Comissões + Produtos + Compras + SaaS',
    example: 'Comissões 60%, Produtos 20%, Compras 15%, SaaS 5%.',
    dataSource: 'Baseado em despesas reais registradas no sistema.',
    calculation: `1. Comissões: total pago aos funcionários
2. Produtos: custo dos produtos consumidos
3. Compras: pedidos de fornecedores
4. SaaS: custos fixos de software`
  },

  marginEvolution: {
    title: 'Evolução das Margens',
    definition: 'Como suas margens bruta e líquida variam ao longo do tempo.',
    formula: 'Margem Bruta = ((Receita - COGS) / Receita) × 100 | Margem Líquida = (Lucro / Receita) × 100',
    example: 'Se receita é R$ 50k, COGS R$ 5k e lucro R$ 20k: Margem Bruta = 90%, Margem Líquida = 40%.',
    dataSource: 'Calculado mês a mês com dados reais dos últimos 6 meses.',
    calculation: `1. Para cada mês, calcula receita e custos
2. Margem Bruta = (receita - custos diretos) / receita
3. Margem Líquida = lucro líquido / receita
4. Mostra tendência ao longo do tempo`
  },

  paymentMethods: {
    title: 'Métodos de Pagamento',
    definition: 'Distribuição das formas de pagamento preferidas pelos clientes.',
    formula: 'Percentual de cada método sobre o total',
    example: 'PIX 50%, Cartão 30%, Dinheiro 15%, Assinatura 5%.',
    dataSource: 'Baseado em pagamentos reais registrados com tipo de método.',
    calculation: `1. Conta valor total recebido por cada método
2. Calcula percentual de cada um
3. Ajuda a entender preferências dos clientes
4. Útil para negociar taxas com operadoras`
  }
};