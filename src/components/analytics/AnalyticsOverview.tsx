import { DollarSign, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { SmartCard } from './widgets/SmartCard';
import type { BarbershopAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsOverviewProps {
  analytics: BarbershopAnalytics;
}

export const AnalyticsOverview = ({ analytics }: AnalyticsOverviewProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SmartCard
        title="Dinheiro em Caixa"
        value={formatCurrency(analytics.receivedRevenue)}
        description="Receita já recebida"
        icon={DollarSign}
        color="text-green-600"
      />
      
      <SmartCard
        title="A Receber"
        value={formatCurrency(analytics.pendingRevenue)}
        description="Serviços feitos, pagamento pendente"
        icon={Clock}
        color="text-orange-600"
      />
      
      <SmartCard
        title="Receita Futura"
        value={formatCurrency(analytics.futureRevenue)}
        description="Agendamentos confirmados"
        icon={TrendingUp}
        color="text-blue-600"
      />
      
      <SmartCard
        title="Receita Perdida"
        value={formatCurrency(analytics.lostRevenue)}
        description="Cancelamentos e falhas"
        icon={AlertTriangle}
        color="text-red-600"
      />
    </div>
  );
};
